// server/index.ts
// vibe-mod main entry. Hono-based HTTP routes per devvit.json.
// PATCH NOTES (post-audit v2):
//   - server-side moderator auth on every form/menu (FIND-03)
//   - circuit breaker counts a last-hour score window, not all-time zCard (FIND-04)
//   - regex safety check at COMPILE time, not eval time (FIND-02)
//   - trigger idempotency dedupe (Gap #5)
//   - subreddit-scoped Redis keys (FIND-07)
//   - BYOK fallback to developer key (FIND-12)
//   - Zod error sanitization (FIND-06)
//   - Clarification loop sends separate user turn, no string concat (FIND-11)

import { Hono } from 'hono';
import type {
  MenuItemRequest,
  UiResponse,
  OnPostSubmitRequest,
  OnCommentSubmitRequest,
  OnPostReportRequest,
  OnCommentReportRequest,
  OnAppUpgradeRequest,
  TriggerResponse,
  SettingsValidationRequest,
  SettingsValidationResponse,
} from '@devvit/web/shared';
import { reddit, redis, settings, scheduler, type TaskRequest, type TaskResponse } from '@devvit/web/server';
import { RuleBundle, Rule, checkTreeDepth, type RuleBundleType, type RuleType } from '../shared/rule-schema';
import { seedStarterRules } from '../shared/starter-rules';
import { VIBE_MOD_SYSTEM_PROMPT, FEW_SHOT_EXAMPLES } from '../shared/system-prompt';
import { buildPostFactBag, buildCommentFactBag } from './fact-bag';
import { selectMatchingRules } from './evaluator';
import { executeActions, rollbackAction, acquireOnce } from './executor';
import { getCurrentSubredditName, getCurrentSubredditRef } from './devvit-helpers';

const app = new Hono();
const COMPILE_RATE_LIMIT_PER_DAY = 50;
const MOD_LIST_CACHE_SECONDS = 5 * 60;
const TRIGGER_DEDUPE_SECONDS = 10 * 60;

// ─────────────────────────────────────────────────────────────────────────────
// Shared: moderator authorization guard (audit FIND-03 fix)
// Devvit's `forUserType: "moderator"` is a UI hint, not server enforcement.
// Every form/menu handler MUST call this and bail on false.
// ─────────────────────────────────────────────────────────────────────────────
async function isCallerModerator(): Promise<boolean> {
  try {
    const user = await reddit.getCurrentUser();
    if (!user) return false;
    const subredditName = getCurrentSubredditName();
    if (!subredditName) return false;

    const cacheKey = `${subredditName}:modlist`;
    const cached = await redis.get(cacheKey);
    let mods: string[];
    if (cached) {
      mods = JSON.parse(cached);
    } else {
      const list = await reddit.getModerators({ subredditName });
      mods = (await list.all()).map((m) => m.username);
      await redis.set(cacheKey, JSON.stringify(mods));
      await redis.expire(cacheKey, MOD_LIST_CACHE_SECONDS);
    }
    return mods.includes(user.username);
  } catch (err) {
    console.warn('[vibe-mod] mod check failed:', err);
    return false;
  }
}

// SECURITY: only call this from server-controlled paths — never echo to user.
function summarizeValidationError(err: unknown): string {
  // Strip Zod's detailed field paths; return a user-safe short message.
  const raw = String(err);
  if (raw.includes('action')) return 'The compiled rule contained an action this app does not support.';
  if (raw.includes('fact')) return 'The compiled rule referenced an unknown fact.';
  if (raw.includes('predicate')) return "The compiled rule's condition tree was too complex.";
  return 'Compiled rule failed validation. Try rephrasing more simply.';
}

// Safe-regex check: rejects common catastrophic backtracking patterns.
// Conservative — false-negatives possible, false-positives unlikely. (Audit FIND-02 fix.)
function isSafeRegex(pattern: string): boolean {
  if (pattern.length > 80) return false;
  // Nested quantifiers: (...)+/*, (...)*+
  if (/\)[+*][+*]?/.test(pattern)) return false;
  if (/\]\s*[+*][+*]?/.test(pattern)) return false;
  // Backreferences
  if (/\\[1-9]/.test(pattern)) return false;
  // Alternation containing same-prefix branches like (a|aa)+
  if (/\([^()|]*\|[^()|]*\)[+*]/.test(pattern)) return false;
  return true;
}

interface PredicateTreeShape {
  fact?: string;
  op?: string;
  value?: unknown;
  all?: PredicateTreeShape[];
  any?: PredicateTreeShape[];
  not?: PredicateTreeShape;
}
function validatePredicateRegexes(tree: PredicateTreeShape): void {
  if ('all' in tree && tree.all) tree.all.forEach(validatePredicateRegexes);
  else if ('any' in tree && tree.any) tree.any.forEach(validatePredicateRegexes);
  else if ('not' in tree && tree.not) validatePredicateRegexes(tree.not);
  else if (tree.op === 'matches' && typeof tree.value === 'string') {
    if (!isSafeRegex(tree.value)) {
      throw new Error('Regex pattern in rule may cause performance issues; please rephrase.');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Menu: Compose rule (open form)
// ─────────────────────────────────────────────────────────────────────────────
app.post('/internal/menu/compose-rule', async (c) => {
  await c.req.json<MenuItemRequest>();

  if (!(await isCallerModerator())) {
    return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
  }

  const subredditName = getCurrentSubredditName();
  const dailyCount = Number((await redis.get(`${subredditName}:compile:count:${todayKey()}`)) ?? '0');

  return c.json<UiResponse>({
    showForm: {
      name: 'ruleComposerForm',
      form: {
        title: `Compose rule for r/${subredditName}`,
        description: `Compiles used today: ${dailyCount} / ${COMPILE_RATE_LIMIT_PER_DAY}.\nYour rule will be saved as a draft. Dry-run preview runs automatically.`,
        acceptLabel: 'Compile + Preview',
        cancelLabel: 'Cancel',
        fields: [
          {
            name: 'rule',
            label: 'Describe your rule in plain English',
            type: 'paragraph',
            defaultValue: '',
            helpText: 'Example: "If a brand-new account posts within 3 hours of joining, send to mod queue."',
          },
          {
            name: 'allowGuarded',
            label: 'Allow this rule to ban/mute (otherwise removes only)',
            type: 'boolean',
            defaultValue: false,
          },
        ],
      },
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Form: Compose rule submit (LLM → validate → store as draft → dry-run)
// ─────────────────────────────────────────────────────────────────────────────
app.post('/internal/form/compose-rule-submit', async (c) => {
  if (!(await isCallerModerator())) {
    return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
  }

  const { rule, allowGuarded, clarificationAnswer } = await c.req.json<{
    rule: string;
    allowGuarded: boolean;
    clarificationAnswer?: string;
  }>();

  if (!rule?.trim()) {
    return c.json<UiResponse>({ showToast: { text: 'Please type a rule.', appearance: 'neutral' } });
  }

  const subredditName = getCurrentSubredditName();

  // Rate limit (sub-scoped)
  const todayCounterKey = `${subredditName}:compile:count:${todayKey()}`;
  const todayCount = Number((await redis.get(todayCounterKey)) ?? '0');

  // Check if BYOK key is present (skip quota for BYOK)
  const subOverrideKey = (await settings.get('subredditOpenaiApiKey')) as string;
  const usingBYOK = !!subOverrideKey?.trim();

  if (!usingBYOK && todayCount >= COMPILE_RATE_LIMIT_PER_DAY) {
    return c.json<UiResponse>({
      showToast: {
        text: `Compile quota reached (${COMPILE_RATE_LIMIT_PER_DAY}/day). Paste your own OpenAI key in settings to bypass.`,
        appearance: 'neutral',
      },
    });
  }

  let compiled: unknown;
  let tokensIn = 0;
  let tokensOut = 0;
  try {
    const result = await callOpenAI(rule, clarificationAnswer);
    compiled = result.json;
    tokensIn = result.tokensIn;
    tokensOut = result.tokensOut;
  } catch {
    // Don't leak the error message — it could echo back compile context to the user.
    return c.json<UiResponse>({
      showToast: {
        text: 'Compiler offline. Your draft is saved. Try again in a minute.',
        appearance: 'neutral',
      },
    });
  }

  // Clarification path — sends user back to form with answer field, NOT concatenation.
  if (isClarification(compiled)) {
    return c.json<UiResponse>({
      showForm: {
        name: 'ruleComposerForm',
        form: {
          title: 'Clarify the rule',
          description: compiled.question,
          acceptLabel: 'Re-compile',
          fields: [
            {
              name: 'rule',
              label: 'Original rule (do not edit)',
              type: 'paragraph',
              defaultValue: rule,
              disabled: true,
            },
            {
              name: 'clarificationAnswer',
              label: 'Your answer to the clarifying question',
              type: 'paragraph',
              defaultValue: '',
            },
            {
              name: 'allowGuarded',
              label: 'Allow this rule to ban/mute (otherwise removes only)',
              type: 'boolean',
              defaultValue: !!allowGuarded,
            },
          ],
        },
      },
    });
  }

  // Validate against schema (Rule.parse is .strict() → rejects extra fields)
  let validated: RuleType;
  try {
    const augmented = {
      ...(compiled as object),
      createdAt: Date.now(),
      createdBy: (await reddit.getCurrentUser())?.id ?? 't2_unknown',
      enabled: true,
      shadow: true,
    };
    validated = Rule.parse(augmented);
    checkTreeDepth(validated.when as Parameters<typeof checkTreeDepth>[0]);

    // Safe-regex check on every `matches` leaf (audit FIND-02 fix).
    validatePredicateRegexes(validated.when as PredicateTreeShape);

    if (!allowGuarded) {
      const hasGuarded = validated.then.some((a) => ['ban', 'mute', 'permaban'].includes(a.action));
      if (hasGuarded) {
        return c.json<UiResponse>({
          showToast: {
            text: 'This rule would ban/mute users. Re-submit with the "Allow ban/mute" checkbox if intended.',
            appearance: 'neutral',
          },
        });
      }
    }
  } catch (err) {
    return c.json<UiResponse>({
      showToast: {
        text: summarizeValidationError(err),
        appearance: 'neutral',
      },
    });
  }

  // Append to draft bundle (sub-scoped key)
  const draftKey = `${subredditName}:rules:draft`;
  const draftJson = await redis.get(draftKey);
  const draft: RuleBundleType = safeParseBundle(draftJson, 'compose/draft') ?? {
    schemaVersion: '1.0.0',
    bundleVersion: 0,
    compiledAt: Date.now(),
    llmModel: ((await settings.get('openaiModel')) as string) || 'gpt-5.4-mini',
    llmTokensIn: 0,
    llmTokensOut: 0,
    rules: [],
  };

  const existingIdx = draft.rules.findIndex((r) => r.id === validated.id);
  if (existingIdx >= 0) draft.rules[existingIdx] = validated;
  else draft.rules.push(validated);

  if (draft.rules.length > 50) {
    return c.json<UiResponse>({
      showToast: { text: 'Rule cap reached (50). Delete a rule first.', appearance: 'neutral' },
    });
  }

  draft.bundleVersion += 1;
  draft.compiledAt = Date.now();
  draft.llmTokensIn += tokensIn;
  draft.llmTokensOut += tokensOut;

  await redis.set(draftKey, JSON.stringify(draft));

  // Increment daily compile counter (sub-scoped, BYOK skipped)
  if (!usingBYOK) {
    await redis.set(todayCounterKey, String(todayCount + 1));
    await redis.expire(todayCounterKey, 86_400);
  }

  // Kick off dry-run replay job
  await scheduler.runJob({
    name: 'dry-run-replay',
    runAt: new Date(),
    data: { ruleId: validated.id, subredditName },
  });

  return c.json<UiResponse>({
    showToast: {
      text: `Compiled rule "${validated.name}". Dry-run started — check Dashboard in 30s.`,
      appearance: 'success',
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Menu: Dashboard
// ─────────────────────────────────────────────────────────────────────────────
app.post('/internal/menu/dashboard', async (c) => {
  await c.req.json<MenuItemRequest>();
  if (!(await isCallerModerator())) {
    return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
  }

  const subredditName = getCurrentSubredditName();
  const active = safeParseBundle(await redis.get(`${subredditName}:rules:active`), 'dashboard/active');
  const draft = safeParseBundle(await redis.get(`${subredditName}:rules:draft`), 'dashboard/draft');

  const auditKey = `${subredditName}:audit`;
  const recentIds = await redis.zRange(auditKey, 0, 19, { by: 'rank', reverse: true });
  const recent: Array<Record<string, string>> = [];
  for (const m of recentIds) {
    const h = await redis.hGetAll(`${subredditName}:audit:${m.member}`);
    recent.push({ ...h, id: String(m.member) });
  }

  // Dry-run results for the draft rules (written by /internal/scheduler/dry-run-replay).
  const dryRunLines: string[] = [];
  for (const r of draft?.rules ?? []) {
    const raw = await redis.get(`${subredditName}:dryrun:${r.id}`);
    if (!raw) continue;
    const d = JSON.parse(raw) as DryRunResult;
    if (d.status === 'ok') {
      dryRunLines.push(
        `  ${r.id}: would match ${d.matched.length}/${d.sampledPosts} recent post(s)` +
          (d.matched.length ? ` → ${[...new Set(d.matched.flatMap((m) => m.would))].join(', ')}` : ''),
      );
    } else {
      dryRunLines.push(`  ${r.id}: ${d.note ?? 'dry-run unavailable'}`);
    }
  }

  const summary = [
    `Active rules: ${active?.rules.length ?? 0}`,
    `Draft rules: ${draft?.rules.length ?? 0}`,
    `Recent actions: ${recent.length}`,
    ...(dryRunLines.length ? ['', 'Dry-run preview (draft rules):', ...dryRunLines] : []),
    '',
    'Recent actions:',
    ...recent.slice(0, 10).map((r) => `  ${r.action} (${r.outcome}) — ${(r.ruleSourceNL ?? '').slice(0, 60)}…`),
  ].join('\n');

  return c.json<UiResponse>({
    showForm: {
      name: 'dashboardForm',
      form: {
        title: 'vibe-mod Dashboard',
        description: summary,
        acceptLabel: draft ? `Activate ${draft.rules.length} draft rule(s)` : 'Close',
        cancelLabel: 'Cancel',
        fields: [{ name: 'activate', label: 'Promote draft → active', type: 'boolean', defaultValue: false }],
      },
    },
  });
});

app.post('/internal/form/dashboard-action', async (c) => {
  if (!(await isCallerModerator())) {
    return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
  }

  const { activate } = await c.req.json<{ activate: boolean }>();
  if (!activate) return c.json<UiResponse>({ showToast: 'No action taken.' });

  const subredditName = getCurrentSubredditName();
  const draft = safeParseBundle(await redis.get(`${subredditName}:rules:draft`), 'activate/draft');
  if (!draft || draft.rules.length === 0) return c.json<UiResponse>({ showToast: 'No draft to activate.' });

  // Stamp the activation time so the shadow-mode window is measured from when the
  // rule actually went live, not from when it was compiled (a draft that sits
  // for >shadowDurationHours would otherwise go live the instant it's activated).
  // Carry over an existing activatedAt for a rule that's already active under the
  // same id (re-activating after an edit must not reset its shadow clock).
  const prevActivatedAt = new Map<string, number>(
    (safeParseBundle(await redis.get(`${subredditName}:rules:active`), 'activate/prev-active')?.rules ?? [])
      .filter((r): r is RuleType & { activatedAt: number } => typeof r.activatedAt === 'number')
      .map((r) => [r.id, r.activatedAt]),
  );
  const now = Date.now();
  for (const r of draft.rules) r.activatedAt ??= prevActivatedAt.get(r.id) ?? now;

  await redis.set(`${subredditName}:rules:active`, JSON.stringify(draft));
  return c.json<UiResponse>({
    showToast: {
      text: 'Draft activated. Shadow mode is ON by default — promote per rule in next 24h.',
      appearance: 'success',
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Menu: Undo (on a specific post/comment)
// ─────────────────────────────────────────────────────────────────────────────
app.post('/internal/menu/undo-action', async (c) => {
  if (!(await isCallerModerator())) {
    return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
  }
  const { targetId } = await c.req.json<MenuItemRequest>();
  if (!targetId) return c.json<UiResponse>({ showToast: 'No target.' });

  const subredditName = getCurrentSubredditName();
  const auditKey = `${subredditName}:audit`;
  const recentIds = await redis.zRange(auditKey, 0, 99, { by: 'rank', reverse: true });
  let found: string | null = null;
  for (const m of recentIds) {
    const h = await redis.hGetAll(`${subredditName}:audit:${m.member}`);
    if (h.thingId === targetId && h.outcome === 'applied' && !h.rolledBack) {
      found = m.member as string;
      break;
    }
  }
  if (!found)
    return c.json<UiResponse>({
      showToast: 'No vibe-mod action found for this item (or already rolled back, or window expired).',
    });

  const result = await rollbackAction(subredditName, found);
  return c.json<UiResponse>({
    showToast: {
      text: result.ok ? 'Rolled back.' : `Couldn't roll back: ${result.reason}`,
      appearance: result.ok ? 'success' : 'neutral',
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Triggers — with idempotency dedupe (audit Gap #5 fix)
// ─────────────────────────────────────────────────────────────────────────────
async function isDuplicateTrigger(trigger: string, thingId: string): Promise<boolean> {
  const subName = getCurrentSubredditName();
  const dedupeKey = `${subName}:seen:${trigger}:${thingId}`;
  // We process this trigger iff we win the "acquire once" race; otherwise it's
  // a duplicate delivery (audit Gap #5 — the old watch/multi/exec never checked
  // exec()'s result, so a real concurrent re-delivery still double-processed).
  return !(await acquireOnce(dedupeKey, TRIGGER_DEDUPE_SECONDS));
}

// Parse a persisted RuleBundle, returning null (treated as "no rules" — the
// fail-SAFE direction, since every action is restrictive) if the stored JSON is
// missing, malformed, or fails schema validation. A bad write must never 500 the
// trigger path for every post/comment in the sub (gap-analysis).
function safeParseBundle(raw: string | null | undefined, context: string): RuleBundleType | null {
  if (!raw) return null;
  try {
    return RuleBundle.parse(JSON.parse(raw));
  } catch (err) {
    console.error(`[vibe-mod] ignoring malformed rule bundle (${context}):`, err);
    return null;
  }
}

app.post('/internal/trigger/on-post-submit', async (c) => {
  const { post, author, subreddit } = await c.req.json<OnPostSubmitRequest>();
  if (!post || !author) return c.json<TriggerResponse>({ status: 'ok' });

  if (await isDuplicateTrigger('postSubmit', post.id)) {
    return c.json<TriggerResponse>({ status: 'ok' });
  }

  const facts = await buildPostFactBag({
    id: post.id,
    title: post.title,
    body: post.selftext ?? '',
    url: post.url,
    nsfw: post.nsfw,
    isVideo: post.isVideo,
    isSpoiler: post.isSpoiler,
    crosspostParentId: post.crosspostParentId,
    authorId: author.id,
    authorName: author.name,
    sub: subreddit
      ? { weeklyActiveUsers: subreddit.subscribersCount ?? 0, over18: subreddit.nsfw ?? false }
      : undefined,
  });

  const subredditName = getCurrentSubredditName();
  const bundle = safeParseBundle(await redis.get(`${subredditName}:rules:active`), 'on-post-submit');
  if (!bundle) return c.json<TriggerResponse>({ status: 'ok' });
  const matching = selectMatchingRules(bundle.rules, 'onPostSubmit', facts);

  for (const rule of matching) {
    await executeActions({
      rule,
      thingId: post.id,
      thingType: 'post',
      authorName: author.name,
      authorId: author.id,
      isDryRun: false,
      isShadowMode: rule.shadow,
    });
  }

  return c.json<TriggerResponse>({ status: 'ok' });
});

app.post('/internal/trigger/on-comment-submit', async (c) => {
  const { comment, author, subreddit } = await c.req.json<OnCommentSubmitRequest>();
  if (!comment || !author) return c.json<TriggerResponse>({ status: 'ok' });

  if (await isDuplicateTrigger('commentSubmit', comment.id)) {
    return c.json<TriggerResponse>({ status: 'ok' });
  }

  const facts = await buildCommentFactBag({
    id: comment.id,
    body: comment.body,
    parentId: comment.parentId,
    authorId: author.id,
    authorName: author.name,
    sub: subreddit
      ? { weeklyActiveUsers: subreddit.subscribersCount ?? 0, over18: subreddit.nsfw ?? false }
      : undefined,
  });

  const subredditName = getCurrentSubredditName();
  const bundle = safeParseBundle(await redis.get(`${subredditName}:rules:active`), 'on-comment-submit');
  if (!bundle) return c.json<TriggerResponse>({ status: 'ok' });
  const matching = selectMatchingRules(bundle.rules, 'onCommentSubmit', facts);

  for (const rule of matching) {
    await executeActions({
      rule,
      thingId: comment.id,
      thingType: 'comment',
      authorName: author.name,
      authorId: author.id,
      isDryRun: false,
      isShadowMode: rule.shadow,
    });
  }

  return c.json<TriggerResponse>({ status: 'ok' });
});

app.post('/internal/trigger/on-app-install', (c) => {
  // Minimal handler — return 200 immediately, no body parse, no scheduler call,
  // no I/O at all. Previous versions (even with seeding deferred) still failed
  // with "context canceled" on install — likely a cold-start vs trigger-deadline
  // race on the first request to a 2 MB CJS bundle. Seeding moved to the FIRST
  // trigger after install: on the first onPostSubmit/onCommentSubmit, if no
  // active bundle exists, we seed in-band (cold-start has happened by then,
  // and that handler is allowed to take longer than the install hook).
  return c.json<TriggerResponse>({ status: 'ok' });
});

// Seeds 5 starter draft rules + an empty active bundle on first install.
// Idempotent: if a draft / active already exists we don't clobber it.
app.post('/internal/scheduler/seed-on-install', async (c) => {
  await c.req.json<TaskRequest>().catch(() => null);
  try {
    const subredditName = getCurrentSubredditName();
    const activeKey = `${subredditName}:rules:active`;
    if (!(await redis.get(activeKey))) {
      const emptyActive: RuleBundleType = {
        schemaVersion: '1.0.0',
        bundleVersion: 1,
        compiledAt: Date.now(),
        llmModel: 'seed',
        llmTokensIn: 0,
        llmTokensOut: 0,
        rules: [],
      };
      await redis.set(activeKey, JSON.stringify(emptyActive));
    }
    const draftKey = `${subredditName}:rules:draft`;
    if (!(await redis.get(draftKey))) {
      await redis.set(draftKey, JSON.stringify(seedStarterRules(Date.now())));
    }
  } catch (err) {
    console.error('[vibe-mod] seed-on-install failed (non-fatal — mod can still compose):', err);
  }
  return c.json<TaskResponse>({ status: 'ok' });
});

app.post('/internal/trigger/on-app-upgrade', async (c) => {
  await c.req.json<OnAppUpgradeRequest>();
  return c.json<TriggerResponse>({ status: 'ok' });
});

app.post('/internal/trigger/on-post-report', async (c) => {
  await c.req.json<OnPostReportRequest>();
  return c.json<TriggerResponse>({ status: 'ok' });
});

app.post('/internal/trigger/on-comment-report', async (c) => {
  await c.req.json<OnCommentReportRequest>();
  return c.json<TriggerResponse>({ status: 'ok' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scheduler jobs
// ─────────────────────────────────────────────────────────────────────────────
app.post('/internal/scheduler/audit-retention', async (c) => {
  await c.req.json<TaskRequest>();
  const subredditName = getCurrentSubredditName();
  const auditKey = `${subredditName}:audit`;
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

  // 1. Get IDs to delete (so we can also delete their hashes)
  const toDelete = await redis.zRange(auditKey, 0, cutoff, { by: 'score' });
  for (const m of toDelete) {
    await redis.del(`${subredditName}:audit:${m.member}`);
  }
  // 2. Remove from ZSet
  await redis.zRemRangeByScore(auditKey, 0, cutoff);
  return c.json<TaskResponse>({ status: 'ok' });
});

// Dry-run preview (hard lock #3 — forced before Activate). When a rule is
// compiled into the draft, this job runs immediately, replays the *last few
// posts* through the draft rule (no actions taken — pure evaluation), and writes
// a `${sub}:dryrun:${ruleId}` summary the Dashboard renders. v0.1 samples posts
// only (no `getNewComments` in the SDK); a comment-only rule gets a "shadow-mode
// it to see real comments" note.
const DRY_RUN_SAMPLE = 10; // recent posts to replay (×~3 Reddit API calls each via the fact bag)
const DRY_RUN_TTL_SECONDS = 7 * 24 * 60 * 60;

interface DryRunResult {
  ruleId: string;
  ruleSourceNL: string;
  ranAt: number;
  status: 'ok' | 'unavailable';
  note?: string;
  sampledPosts: number;
  matched: Array<{ thingId: string; thingType: 'post'; authorName: string; would: string[] }>;
}

app.post('/internal/scheduler/dry-run-replay', async (c) => {
  const body = await c.req.json<TaskRequest<{ ruleId: string; subredditName: string }>>();
  const ruleId = body.data?.ruleId;
  const sub = getCurrentSubredditName();
  if (!ruleId) return c.json<TaskResponse>({ status: 'ok' });

  const result: DryRunResult = {
    ruleId,
    ruleSourceNL: '',
    ranAt: Date.now(),
    status: 'ok',
    sampledPosts: 0,
    matched: [],
  };
  try {
    const draftJson = await redis.get(`${sub}:rules:draft`);
    const rule = draftJson ? RuleBundle.parse(JSON.parse(draftJson)).rules.find((r) => r.id === ruleId) : undefined;
    if (!rule) {
      result.status = 'unavailable';
      result.note = `Rule ${ruleId} is no longer in the draft.`;
    } else {
      result.ruleSourceNL = rule.sourceNL;
      const postTrigger = rule.on.includes('onPostSubmit')
        ? 'onPostSubmit'
        : rule.on.includes('onPostReport')
          ? 'onPostReport'
          : null;
      if (!postTrigger) {
        result.status = 'unavailable';
        result.note =
          'This rule listens to comment events. v0.1 dry-run replays recent posts only — activate it (shadow mode is ON by default) to see how it behaves on real comments.';
      } else {
        const posts = await reddit.getNewPosts({ subredditName: sub, limit: DRY_RUN_SAMPLE }).all();
        for (const p of posts) {
          result.sampledPosts++;
          const facts = await buildPostFactBag(
            {
              id: p.id,
              title: p.title,
              body: p.body ?? '',
              url: p.url,
              nsfw: p.nsfw,
              isSpoiler: p.spoiler, // the Post model exposes `spoiler` (PostV2 calls it isSpoiler)
              // isVideo / crosspostParentId aren't on the Post model — dry-run preview
              // treats them as false; the live trigger gets the real values from PostV2.
              authorId: p.authorId ?? 't2_unknown',
              authorName: p.authorName,
            },
            p.numberOfReports ?? 0,
          );
          if (selectMatchingRules([rule], postTrigger, facts).length > 0) {
            result.matched.push({
              thingId: p.id,
              thingType: 'post',
              authorName: p.authorName,
              would: rule.then.map((a) => a.action),
            });
          }
        }
      }
    }
  } catch (err) {
    result.status = 'unavailable';
    result.note = `Dry-run replay couldn't complete (${String(err).slice(0, 120)}). Activate in shadow mode to observe live behaviour instead.`;
  }

  await redis.set(`${sub}:dryrun:${ruleId}`, JSON.stringify(result));
  await redis.expire(`${sub}:dryrun:${ruleId}`, DRY_RUN_TTL_SECONDS);
  return c.json<TaskResponse>({ status: 'ok' });
});

app.post('/internal/scheduler/shadow-promote-check', async (c) => {
  await c.req.json<TaskRequest>();
  const subredditName = getCurrentSubredditName();
  const shadowHours = ((await settings.get('shadowDurationHours')) as number) ?? 24;
  if (shadowHours <= 0) return c.json<TaskResponse>({ status: 'ok' });

  const bundle = safeParseBundle(await redis.get(`${subredditName}:rules:active`), 'shadow-promote-check');
  if (!bundle) return c.json<TaskResponse>({ status: 'ok' });

  const now = Date.now();
  const cutoff = shadowHours * 3_600_000;

  let changed = false;
  for (const r of bundle.rules) {
    // Measure the shadow window from activation time (falling back to compile
    // time for rules activated before this field existed).
    const since = r.activatedAt ?? r.createdAt;
    if (r.shadow && now - since >= cutoff) {
      r.shadow = false;
      changed = true;
    }
  }
  if (changed) await redis.set(`${subredditName}:rules:active`, JSON.stringify(bundle));
  return c.json<TaskResponse>({ status: 'ok' });
});

app.post('/internal/scheduler/rate-limit-circuit-breaker', async (c) => {
  await c.req.json<TaskRequest>();
  const { id: subredditId, name: subredditName } = getCurrentSubredditRef();
  const maxPerHour = ((await settings.get('maxActionsPerHour')) as number) ?? 100;
  const oneHourAgo = Date.now() - 3_600_000;

  // FIND-04 fix: count audit entries in the last-hour SCORE window, not all-time.
  // The Devvit redis client has no zCount, so range-scan by score and count.
  const auditKey = `${subredditName}:audit`;
  const recentCount = (await redis.zRange(auditKey, oneHourAgo, Number.MAX_SAFE_INTEGER, { by: 'score' })).length;

  if (recentCount > maxPerHour) {
    await redis.set(`${subredditName}:circuit:open`, '1');
    await redis.expire(`${subredditName}:circuit:open`, 600);

    try {
      await reddit.modMail.createModNotification({
        subject: '🚨 vibe-mod auto-paused',
        bodyMarkdown: `vibe-mod took ${recentCount} actions in the last hour, exceeding your ${maxPerHour} threshold. All rules paused for 10 min. Review your rules in the Dashboard.`,
        subredditId,
      });
    } catch (err) {
      console.warn('[vibe-mod] modmail send failed:', err);
    }
  }
  return c.json<TaskResponse>({ status: 'ok' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Settings validation
// ─────────────────────────────────────────────────────────────────────────────
app.post('/internal/settings/validate-rate-limit', async (c) => {
  const { value } = await c.req.json<SettingsValidationRequest<number>>();
  if (typeof value !== 'number' || value < 1 || value > 10000) {
    return c.json<SettingsValidationResponse>({ success: false, error: 'Must be 1–10000.' });
  }
  return c.json<SettingsValidationResponse>({ success: true });
});

app.post('/internal/settings/validate-shadow', async (c) => {
  const { value } = await c.req.json<SettingsValidationRequest<number>>();
  if (typeof value !== 'number' || value < 0 || value > 168) {
    return c.json<SettingsValidationResponse>({ success: false, error: 'Must be 0–168 hours.' });
  }
  return c.json<SettingsValidationResponse>({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function callOpenAI(
  userRule: string,
  clarificationAnswer?: string,
): Promise<{ json: unknown; tokensIn: number; tokensOut: number }> {
  // BYOK preference: sub-scope override key beats developer global key.
  const subKey = (await settings.get('subredditOpenaiApiKey')) as string;
  const globalKey = (await settings.get('openaiApiKey')) as string;
  const apiKey = (subKey?.trim() || globalKey || '').trim();
  if (!apiKey) throw new Error('no_key');

  const model = ((await settings.get('openaiModel')) as string) || 'gpt-5.4-mini';

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: VIBE_MOD_SYSTEM_PROMPT },
  ];
  for (const ex of FEW_SHOT_EXAMPLES) {
    messages.push({ role: 'user', content: ex.user });
    messages.push({ role: 'assistant', content: JSON.stringify(ex.assistant) });
  }
  // Original rule (capped — the form layer doesn't bound length; keep the prompt
  // budget predictable and limit the prompt-injection surface).
  messages.push({ role: 'user', content: userRule.slice(0, 1000) });
  // Clarification answer as a separate turn (audit FIND-11: no string concat into
  // the original user content), also length-capped (gap-analysis SEC-03).
  const clarif = clarificationAnswer?.trim().slice(0, 500);
  if (clarif) {
    messages.push({ role: 'user', content: `Clarification: ${clarif}` });
  }

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model, // gpt-5.4-mini (default) / gpt-5.4-nano / gpt-5.4 — see devvit.json openaiModel
      response_format: { type: 'json_object' },
      messages,
      // Tuned for what this call is: a mechanical NL → strict-JSON translation.
      //   reasoning_effort: 'none'  — no hidden reasoning needed; keeps it fast and stops the
      //                               token budget being eaten by reasoning (gpt-5.4 family value;
      //                               older models call this 'minimal'). Measured ~1.1–1.4s.
      //   verbosity: 'low'          — terse JSON, no commentary.
      //   max_completion_tokens     — a compiled rule + a clarification fit well under 600.
      //   (no `temperature` — the gpt-5.x family only accepts the default; max_tokens isn't
      //    supported on these models, use max_completion_tokens.)
      reasoning_effort: 'none',
      verbosity: 'low',
      max_completion_tokens: 600,
    }),
  });

  if (!resp.ok) throw new Error(`openai_${resp.status}`);
  const data = (await resp.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const content = data.choices[0]?.message?.content ?? '{}';
  return {
    json: JSON.parse(content),
    tokensIn: data.usage?.prompt_tokens ?? 0,
    tokensOut: data.usage?.completion_tokens ?? 0,
  };
}

function isClarification(obj: unknown): obj is { needsClarification: true; question: string } {
  return (
    typeof obj === 'object' && obj !== null && (obj as { needsClarification?: boolean }).needsClarification === true
  );
}

export default app;
