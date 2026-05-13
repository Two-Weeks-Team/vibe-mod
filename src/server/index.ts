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
import { serve } from '@hono/node-server';
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
import {
  reddit,
  redis,
  settings,
  scheduler,
  createServer,
  getServerPort,
  type TaskRequest,
  type TaskResponse,
} from '@devvit/web/server';
import { RuleBundle, Rule, checkTreeDepth, type RuleBundleType, type RuleType } from '../shared/rule-schema';
import { seedStarterRules } from '../shared/starter-rules';
import { VIBE_MOD_SYSTEM_PROMPT, FEW_SHOT_EXAMPLES } from '../shared/system-prompt';
import { LIMITS } from '../shared/limits';
import { keys } from '../shared/redis-keys';
import { buildPostFactBag, buildCommentFactBag } from './fact-bag';
import { selectMatchingRules } from './evaluator';
import { executeActions, rollbackAction, acquireOnce } from './executor';
import {
  getCurrentSubredditName,
  getCurrentSubredditRef,
  getCurrentUsername,
  getCurrentUserId,
} from './devvit-helpers';

const app = new Hono();

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostics — production errors stringify as "Error: undefined undefined:
// undefined" because the underlying Devvit/Twirp error envelope has
// undefined fields. console.warn(..., err) collapses to that single opaque
// line. `describeErr` pulls the real shape (name/code/message/stack/keys/ctor)
// so we can see what actually failed.
// Two background agents (metadata-flow trace + stock-template diff) both
// concluded the bug is in the plugin RPC layer (RedisClient.js:584-590,
// getDevvitConfig().use(...)), not in our Hono adapter. ALS works end-to-end
// (context.username reads cleanly). Either globalThis.devvit.config is
// missing, or the host-side gRPC sidecar is rejecting the call.
// ─────────────────────────────────────────────────────────────────────────────
function describeErr(err: unknown): Record<string, unknown> {
  if (err == null) return { value: err };
  if (typeof err !== 'object') return { type: typeof err, value: String(err) };
  const e = err as Record<string, unknown> & { constructor?: { name?: string }; stack?: string };
  const keys = Object.getOwnPropertyNames(err as object);
  return {
    name: (e as { name?: unknown }).name,
    code: (e as { code?: unknown }).code,
    message: (e as { message?: unknown }).message,
    detail: (e as { detail?: unknown }).detail,
    cause: (e as { cause?: unknown }).cause,
    stack: typeof e.stack === 'string' ? e.stack.split('\n').slice(0, 6).join('\n') : undefined,
    ctor: e.constructor?.name,
    keys,
  };
}

function snapshotDevvitRuntime(): Record<string, unknown> {
  const g = globalThis as { devvit?: { config?: unknown; metadataProvider?: () => unknown } };
  const hasConfig = !!g.devvit?.config;
  const hasMetaProvider = typeof g.devvit?.metadataProvider === 'function';
  let metaSample: unknown;
  let metaKeyCount: number | undefined;
  try {
    if (hasMetaProvider) {
      const m = g.devvit!.metadataProvider!();
      if (m && typeof m === 'object') {
        const ks = Object.keys(m as object);
        metaKeyCount = ks.length;
        // Pick only safe, short fields to avoid spilling tokens.
        metaSample = ks.slice(0, 6);
      }
    }
  } catch (err) {
    metaSample = `metadataProvider() threw: ${describeErr(err)['message'] ?? 'unknown'}`;
  }
  return { hasConfig, hasMetaProvider, metaKeyCount, metaSample };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: moderator authorization guard (audit FIND-03 fix)
// Devvit's `forUserType: "moderator"` is a UI hint, not server enforcement.
// Every form/menu handler MUST call this and bail on false.
// ─────────────────────────────────────────────────────────────────────────────
async function isCallerModerator(): Promise<boolean> {
  // Diagnostic snapshot — proves whether plugin config + ALS metadata are
  // present at request time. (Remove once §B-4 root cause is confirmed.)
  const runtime = snapshotDevvitRuntime();
  const subredditName = getCurrentSubredditName();
  const username = getCurrentUsername();
  console.log('[vibe-mod] mod-check enter:', { sub: subredditName, user: username, runtime });

  if (!subredditName || subredditName === 'unknown') {
    console.warn('[vibe-mod] mod check: no subreddit in context — refusing');
    return false;
  }
  if (!username) {
    console.warn('[vibe-mod] mod check: no username in context — refusing');
    return false;
  }

  // Try the Redis cache first
  const cacheKey = keys.modlist(subredditName);
  let mods: string[] | null = null;
  let redisOk = true;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) mods = JSON.parse(cached);
    console.log(`[vibe-mod] mod check: redis cache ${mods ? 'hit' : 'miss'}`);
  } catch (err) {
    redisOk = false;
    console.warn('[vibe-mod] mod check: redis.get(modlist) threw:', describeErr(err));
  }

  let redditOk = true;
  if (!mods) {
    try {
      const list = await reddit.getModerators({ subredditName });
      mods = (await list.all()).map((m) => m.username);
      console.log(`[vibe-mod] mod check: getModerators → ${mods.length} mods: ${mods.join(',')}`);
      try {
        await redis.set(cacheKey, JSON.stringify(mods));
        await redis.expire(cacheKey, LIMITS.MOD_LIST_CACHE_SECONDS);
      } catch (err) {
        console.warn('[vibe-mod] mod check: cache write failed (non-fatal):', describeErr(err));
      }
    } catch (err) {
      redditOk = false;
      console.warn('[vibe-mod] mod check: getModerators threw:', describeErr(err));
    }
  }

  // Resilient fallback (reddit/devvit#258 work-around): if BOTH redis.get AND
  // reddit.getModerators throw, we can't enumerate the mod list ourselves — but
  // Devvit's gateway already filtered this request by `forUserType:"moderator"`
  // (see devvit.json menu.items). The gateway is the security boundary; trust
  // it as fallback so menus open even while the plugin RPC sidecar is broken.
  // Logged loudly so the fallback is auditable. Removed once #258 is fixed.
  if (!mods) {
    if (!redisOk && !redditOk) {
      console.warn(
        `[vibe-mod] mod check: plugin RPC unreachable for both redis and reddit — falling back to gateway-side forUserType:"moderator" filter; trusting ${username}`,
      );
      return true;
    }
    console.warn('[vibe-mod] mod check: could not resolve mod list — refusing');
    return false;
  }

  const isMod = mods.includes(username);
  console.log(`[vibe-mod] mod check: ${username} ∈ mods? ${isMod}`);
  return isMod;
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
  // Best-effort daily-count read — render "—" if plugin RPC is unreachable
  // (reddit/devvit#258) so the form still opens. Quota enforcement still
  // happens server-side in compose-rule-submit, where we fail-closed if we
  // can't confirm the count.
  let dailyCountDisplay = '—';
  try {
    const raw = await redis.get(keys.compileCount(subredditName, todayKey()));
    dailyCountDisplay = String(Number(raw ?? '0'));
  } catch (err) {
    console.warn('[vibe-mod] compose-rule: redis.get(dailyCount) threw — showing "—":', describeErr(err));
  }

  return c.json<UiResponse>({
    showForm: {
      name: 'ruleComposerForm',
      form: {
        title: `Compose rule for r/${subredditName}`,
        description: `Compiles used today: ${dailyCountDisplay} / ${LIMITS.COMPILE_RATE_LIMIT_PER_DAY}.\nYour rule will be saved as a draft. Dry-run preview runs automatically.`,
        acceptLabel: 'Compile + Preview',
        cancelLabel: 'Cancel',
        fields: [
          {
            name: 'rule',
            label: 'Describe your rule in plain English (max 1000 characters)',
            type: 'paragraph',
            defaultValue: '',
            helpText:
              'Example: "If a brand-new account posts within 3 hours of joining, send to mod queue." Up to 1000 chars; shorter compiles more reliably.',
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

  // Length cap — must match callOpenAI's slice(0, 1000) / slice(0, 500), and
  // give the user an explicit error instead of silently truncating their
  // sentence into a different rule. Audit gap-analysis SEC-03.
  const MAX_RULE_CHARS = 1000;
  const MAX_CLARIFICATION_CHARS = 500;
  if (rule.length > MAX_RULE_CHARS) {
    return c.json<UiResponse>({
      showToast: {
        text: `Rule is too long (${rule.length} / ${MAX_RULE_CHARS} characters). Trim it down and try again — shorter rules also compile more reliably.`,
        appearance: 'neutral',
      },
    });
  }
  if (clarificationAnswer && clarificationAnswer.length > MAX_CLARIFICATION_CHARS) {
    return c.json<UiResponse>({
      showToast: {
        text: `Clarification answer is too long (${clarificationAnswer.length} / ${MAX_CLARIFICATION_CHARS} characters). Try a shorter answer.`,
        appearance: 'neutral',
      },
    });
  }

  const subredditName = getCurrentSubredditName();

  // Rate limit (sub-scoped). All plugin RPC here is wrapped in try/catch
  // because reddit/devvit#258 makes every Devvit plugin call throw
  // "Error: undefined undefined: undefined". An unwrapped throw at this
  // layer 500s the whole handler — the user sees nothing happen when they
  // click "Compile + Preview". Fail-open on the quota check (skip enforcement
  // if we can't read the counter), fail-closed on the key check (require
  // explicit BYOK absence to fall through). See claudedocs/2026-05-13-...
  const todayCounterKey = keys.compileCount(subredditName, todayKey());
  let todayCount = 0;
  try {
    todayCount = Number((await redis.get(todayCounterKey)) ?? '0');
  } catch (err) {
    console.warn('[vibe-mod] submit: redis.get(todayCount) threw — skipping quota:', describeErr(err));
  }

  // Check if BYOK key is present (skip quota for BYOK)
  let subOverrideKey = '';
  try {
    subOverrideKey = ((await settings.get('subredditOpenaiApiKey')) as string) ?? '';
  } catch (err) {
    console.warn('[vibe-mod] submit: settings.get(subredditOpenaiApiKey) threw — assuming no BYOK:', describeErr(err));
  }
  const usingBYOK = !!subOverrideKey?.trim();

  if (!usingBYOK && todayCount >= LIMITS.COMPILE_RATE_LIMIT_PER_DAY) {
    return c.json<UiResponse>({
      showToast: {
        text: `Compile quota reached (${LIMITS.COMPILE_RATE_LIMIT_PER_DAY}/day). Paste your own OpenAI key in settings to bypass.`,
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
  } catch (err) {
    // Don't leak the error message — it could echo back compile context.
    // Distinguish three failure shapes so the moderator sees an actionable
    // message: plugin RPC blocked (Devvit platform bug), key not configured,
    // or OpenAI/network error.
    const msg = String((err as Error)?.message ?? err);
    let userMsg: string;
    if (msg === 'no_key_plugin_rpc') {
      // Devvit's settings plugin RPC is unreachable in this runtime — could
      // not read openaiApiKey. We've observed this pattern alongside
      // reddit/devvit#258 (custom-post submission gRPC failures), but the
      // direct cause here is the Devvit settings/plugin RPC layer, not that
      // specific issue. Phrase the toast accordingly.
      userMsg =
        'Devvit settings/plugin RPC is unavailable in this runtime. Could not read openaiApiKey, so the compile cannot run. (Possibly related to reddit/devvit#258 — same gRPC layer.) The same flow will produce the dry-run preview once the platform recovers.';
    } else if (msg === 'no_key') {
      userMsg = 'No OpenAI API key configured. Run `npx devvit settings set openaiApiKey` and try again.';
    } else if (msg === 'openai_400') {
      userMsg =
        'OpenAI rejected the request (HTTP 400). Likely an invalid model name or unsupported parameter — check `npx devvit logs r/<sub>` for the full response body. The smoketest models (gpt-5.4-mini / gpt-5.4-nano / gpt-5.4) may need updating if OpenAI deprecated one of them.';
    } else if (msg === 'openai_401' || msg === 'openai_403') {
      userMsg =
        'OpenAI rejected the request (HTTP 401/403). The configured key is missing, invalid, or revoked. Run `npx devvit settings set openaiApiKey` with a fresh key.';
    } else if (msg === 'openai_429') {
      userMsg =
        'OpenAI rate-limited the request (HTTP 429). Wait a moment and try again, or attach a BYOK key in settings.';
    } else if (msg.startsWith('openai_5')) {
      userMsg = 'OpenAI is having a server problem (HTTP 5xx). Try again in a minute.';
    } else {
      userMsg = 'Compiler offline. Try again in a minute.';
    }
    console.warn('[vibe-mod] submit: callOpenAI threw:', describeErr(err));
    return c.json<UiResponse>({ showToast: { text: userMsg, appearance: 'neutral' } });
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
      createdBy: getCurrentUserId() ?? 't2_unknown',
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

  // Append to draft bundle (sub-scoped key). All plugin RPC here is
  // best-effort — see top of handler for the reddit/devvit#258 rationale.
  // We've already produced a valid compiled `validated` rule above; even if
  // persistence fails the user still sees the compile-success toast and the
  // rule object below.
  const draftKey = keys.rulesDraft(subredditName);
  let draftJson: string | undefined;
  try {
    draftJson = (await redis.get(draftKey)) ?? undefined;
  } catch (err) {
    console.warn('[vibe-mod] submit: redis.get(draft) threw — starting fresh:', describeErr(err));
  }

  let llmModel = 'gpt-5.4-mini';
  try {
    llmModel = ((await settings.get('openaiModel')) as string) || 'gpt-5.4-mini';
  } catch (err) {
    console.warn('[vibe-mod] submit: settings.get(openaiModel) threw — using default:', describeErr(err));
  }

  const draft: RuleBundleType = safeParseBundle(draftJson, 'compose/draft') ?? {
    schemaVersion: '1.0.0',
    bundleVersion: 0,
    compiledAt: Date.now(),
    llmModel,
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

  let persisted = true;
  try {
    await redis.set(draftKey, JSON.stringify(draft));
  } catch (err) {
    persisted = false;
    console.warn('[vibe-mod] submit: redis.set(draft) threw — rule NOT persisted:', describeErr(err));
  }

  // Increment daily compile counter (sub-scoped, BYOK skipped) — best-effort.
  if (!usingBYOK) {
    try {
      await redis.set(todayCounterKey, String(todayCount + 1));
      await redis.expire(todayCounterKey, 86_400);
    } catch (err) {
      console.warn('[vibe-mod] submit: redis.set(todayCount) threw — quota not incremented:', describeErr(err));
    }
  }

  // Kick off dry-run replay job — best-effort. If scheduler is unreachable
  // the rule is still compiled; the user just doesn't get the dry-run preview.
  let dryRunQueued = true;
  try {
    await scheduler.runJob({
      name: 'dry-run-replay',
      runAt: new Date(),
      data: { ruleId: validated.id, subredditName },
    });
  } catch (err) {
    dryRunQueued = false;
    console.warn('[vibe-mod] submit: scheduler.runJob(dry-run) threw — no preview:', describeErr(err));
  }

  // Honest user-facing toast — say what actually happened rather than promising
  // a dashboard view that won't render if persistence failed.
  const lines = [`Compiled rule "${validated.name}".`];
  if (persisted && dryRunQueued) {
    lines.push('Dry-run started — check Dashboard in 30s.');
  } else if (persisted) {
    lines.push('Saved as draft (dry-run preview unavailable).');
  } else {
    lines.push('Plugin RPC unreachable — rule compiled but not persisted (reddit/devvit#258).');
  }
  return c.json<UiResponse>({
    showToast: {
      text: lines.join(' '),
      appearance: persisted ? 'success' : 'neutral',
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
  // All redis reads here are best-effort (reddit/devvit#258). If plugin RPC
  // is unreachable, the dashboard still opens with a banner explaining the
  // bug instead of 500-ing into a "click does nothing" experience.
  let rpcOk = true;
  let active: RuleBundleType | null = null;
  let draft: RuleBundleType | null = null;
  try {
    active = safeParseBundle(await redis.get(keys.rulesActive(subredditName)), 'dashboard/active');
    draft = safeParseBundle(await redis.get(keys.rulesDraft(subredditName)), 'dashboard/draft');
  } catch (err) {
    rpcOk = false;
    console.warn('[vibe-mod] dashboard: redis.get(rules) threw:', describeErr(err));
  }

  const recent: Array<Record<string, string>> = [];
  try {
    const auditKey = keys.audit(subredditName);
    const recentIds = await redis.zRange(auditKey, 0, 19, { by: 'rank', reverse: true });
    for (const m of recentIds) {
      const h = await redis.hGetAll(keys.auditEntry(subredditName, m.member));
      recent.push({ ...h, id: String(m.member) });
    }
  } catch (err) {
    rpcOk = false;
    console.warn('[vibe-mod] dashboard: redis.zRange(audit) threw:', describeErr(err));
  }

  // Dry-run results for the draft rules (written by /internal/scheduler/dry-run-replay).
  const dryRunLines: string[] = [];
  for (const r of draft?.rules ?? []) {
    try {
      const raw = await redis.get(keys.dryrun(subredditName, r.id));
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
    } catch (err) {
      console.warn(`[vibe-mod] dashboard: redis.get(dryrun/${r.id}) threw:`, describeErr(err));
    }
  }

  const summary = [
    ...(rpcOk
      ? []
      : [
          '⚠ Plugin RPC unreachable (reddit/devvit#258 — OPEN platform bug).',
          'Persistence is offline; this view reflects what redis would return.',
          '',
        ]),
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
  // Best-effort — reddit/devvit#258. Every redis touch wrapped so the user
  // sees an explanatory toast rather than 500.
  let draft: RuleBundleType | null = null;
  try {
    draft = safeParseBundle(await redis.get(keys.rulesDraft(subredditName)), 'activate/draft');
  } catch (err) {
    console.warn('[vibe-mod] activate: redis.get(draft) threw:', describeErr(err));
    return c.json<UiResponse>({
      showToast: {
        text: 'Plugin RPC unreachable (reddit/devvit#258). Cannot activate rules until the platform is restored.',
        appearance: 'neutral',
      },
    });
  }
  if (!draft || draft.rules.length === 0) return c.json<UiResponse>({ showToast: 'No draft to activate.' });

  // Stamp the activation time so the shadow-mode window is measured from when the
  // rule actually went live, not from when it was compiled (a draft that sits
  // for >shadowDurationHours would otherwise go live the instant it's activated).
  // Carry over an existing activatedAt for a rule that's already active under the
  // same id (re-activating after an edit must not reset its shadow clock).
  let prevActivatedAt = new Map<string, number>();
  try {
    prevActivatedAt = new Map<string, number>(
      (safeParseBundle(await redis.get(keys.rulesActive(subredditName)), 'activate/prev-active')?.rules ?? [])
        .filter((r): r is RuleType & { activatedAt: number } => typeof r.activatedAt === 'number')
        .map((r) => [r.id, r.activatedAt]),
    );
  } catch (err) {
    console.warn('[vibe-mod] activate: redis.get(prev-active) threw — treating as none:', describeErr(err));
  }
  const now = Date.now();
  for (const r of draft.rules) r.activatedAt ??= prevActivatedAt.get(r.id) ?? now;

  try {
    await redis.set(keys.rulesActive(subredditName), JSON.stringify(draft));
  } catch (err) {
    console.warn('[vibe-mod] activate: redis.set(active) threw:', describeErr(err));
    return c.json<UiResponse>({
      showToast: {
        text: 'Activation failed — plugin RPC unreachable (reddit/devvit#258).',
        appearance: 'neutral',
      },
    });
  }
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
  // Best-effort — reddit/devvit#258 may make every redis read throw. Return
  // an informative toast instead of 500 so the user sees what's happening.
  let recentIds: Array<{ member: string | number }> = [];
  try {
    const auditKey = keys.audit(subredditName);
    recentIds = await redis.zRange(auditKey, 0, 99, { by: 'rank', reverse: true });
  } catch (err) {
    console.warn('[vibe-mod] undo: redis.zRange(audit) threw:', describeErr(err));
    return c.json<UiResponse>({
      showToast: {
        text: 'Audit log unreachable (reddit/devvit#258). Undo cannot run until plugin RPC is restored.',
        appearance: 'neutral',
      },
    });
  }

  let found: string | null = null;
  for (const m of recentIds) {
    try {
      const h = await redis.hGetAll(keys.auditEntry(subredditName, m.member as string));
      if (h.thingId === targetId && h.outcome === 'applied' && !h.rolledBack) {
        found = m.member as string;
        break;
      }
    } catch (err) {
      console.warn('[vibe-mod] undo: redis.hGetAll(entry) threw — skipping:', describeErr(err));
    }
  }
  if (!found)
    return c.json<UiResponse>({
      showToast: 'No vibe-mod action found for this item (or already rolled back, or window expired).',
    });

  try {
    const result = await rollbackAction(subredditName, found);
    return c.json<UiResponse>({
      showToast: {
        text: result.ok ? 'Rolled back.' : `Couldn't roll back: ${result.reason}`,
        appearance: result.ok ? 'success' : 'neutral',
      },
    });
  } catch (err) {
    console.warn('[vibe-mod] undo: rollbackAction threw:', describeErr(err));
    return c.json<UiResponse>({
      showToast: { text: 'Rollback failed — plugin RPC unreachable.', appearance: 'neutral' },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Triggers — with idempotency dedupe (audit Gap #5 fix)
// ─────────────────────────────────────────────────────────────────────────────
async function isDuplicateTrigger(trigger: string, thingId: string): Promise<boolean> {
  const subName = getCurrentSubredditName();
  const dedupeKey = keys.seen(subName, trigger, thingId);
  // We process this trigger iff we win the "acquire once" race; otherwise it's
  // a duplicate delivery (audit Gap #5 — the old watch/multi/exec never checked
  // exec()'s result, so a real concurrent re-delivery still double-processed).
  return !(await acquireOnce(dedupeKey, LIMITS.TRIGGER_DEDUPE_SECONDS));
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
  const bundle = safeParseBundle(await redis.get(keys.rulesActive(subredditName)), 'on-post-submit');
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
  const bundle = safeParseBundle(await redis.get(keys.rulesActive(subredditName)), 'on-comment-submit');
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
    const activeKey = keys.rulesActive(subredditName);
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
    const draftKey = keys.rulesDraft(subredditName);
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
  // Best-effort — plugin RPC may be down (reddit/devvit#258). The scheduler
  // retries every 24h regardless; if redis is unreachable the gateway just
  // sees a 200 (no-op) instead of an error every tick.
  try {
    const subredditName = getCurrentSubredditName();
    const auditKey = keys.audit(subredditName);
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const toDelete = await redis.zRange(auditKey, 0, cutoff, { by: 'score' });
    for (const m of toDelete) {
      await redis.del(keys.auditEntry(subredditName, m.member));
    }
    await redis.zRemRangeByScore(auditKey, 0, cutoff);
  } catch (err) {
    console.warn('[vibe-mod] scheduler/audit-retention: plugin RPC failed:', describeErr(err));
  }
  return c.json<TaskResponse>({ status: 'ok' });
});

// Dry-run preview (hard lock #3 — forced before Activate). When a rule is
// compiled into the draft, this job runs immediately, replays the *last few
// posts* through the draft rule (no actions taken — pure evaluation), and writes
// a `${sub}:dryrun:${ruleId}` summary the Dashboard renders. v0.1 samples posts
// only (no `getNewComments` in the SDK); a comment-only rule gets a "shadow-mode
// it to see real comments" note.

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
    const draftJson = await redis.get(keys.rulesDraft(sub));
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
        const posts = await reddit.getNewPosts({ subredditName: sub, limit: LIMITS.DRY_RUN_SAMPLE }).all();
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

  try {
    await redis.set(keys.dryrun(sub, ruleId), JSON.stringify(result));
    await redis.expire(keys.dryrun(sub, ruleId), LIMITS.DRY_RUN_TTL_SECONDS);
  } catch (err) {
    console.warn('[vibe-mod] scheduler/dry-run-replay: redis.set(result) failed:', describeErr(err));
  }
  return c.json<TaskResponse>({ status: 'ok' });
});

app.post('/internal/scheduler/shadow-promote-check', async (c) => {
  await c.req.json<TaskRequest>();
  const subredditName = getCurrentSubredditName();
  // Best-effort — plugin RPC may be down (reddit/devvit#258). Re-runs every
  // 15 min; returning 200 instead of 500 keeps the gateway calm.
  let shadowHours = 24;
  try {
    shadowHours = ((await settings.get('shadowDurationHours')) as number) ?? 24;
  } catch (err) {
    console.warn(
      '[vibe-mod] scheduler/shadow-promote-check: settings.get threw — using default 24h:',
      describeErr(err),
    );
  }
  if (shadowHours <= 0) return c.json<TaskResponse>({ status: 'ok' });

  let bundle: RuleBundleType | null = null;
  try {
    bundle = safeParseBundle(await redis.get(keys.rulesActive(subredditName)), 'shadow-promote-check');
  } catch (err) {
    console.warn('[vibe-mod] scheduler/shadow-promote-check: redis.get failed:', describeErr(err));
    return c.json<TaskResponse>({ status: 'ok' });
  }
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
  if (changed) {
    try {
      await redis.set(keys.rulesActive(subredditName), JSON.stringify(bundle));
    } catch (err) {
      console.warn('[vibe-mod] scheduler/shadow-promote-check: redis.set failed:', describeErr(err));
    }
  }
  return c.json<TaskResponse>({ status: 'ok' });
});

app.post('/internal/scheduler/rate-limit-circuit-breaker', async (c) => {
  await c.req.json<TaskRequest>();
  const runtime = snapshotDevvitRuntime();
  console.log('[vibe-mod] scheduler/rate-limit enter:', { runtime });
  const { id: subredditId, name: subredditName } = getCurrentSubredditRef();
  let maxPerHour = 100;
  try {
    const v = (await settings.get('maxActionsPerHour')) as number | undefined;
    if (typeof v === 'number') maxPerHour = v;
    console.log('[vibe-mod] scheduler/rate-limit: settings.get OK, maxPerHour=', maxPerHour);
  } catch (err) {
    console.warn('[vibe-mod] scheduler/rate-limit: settings.get threw:', describeErr(err));
  }
  const oneHourAgo = Date.now() - 3_600_000;

  // FIND-04 fix: count audit entries in the last-hour SCORE window, not all-time.
  // The Devvit redis client has no zCount, so range-scan by score and count.
  // Best-effort — reddit/devvit#258. If redis is unreachable we have no audit
  // count → there's nothing to circuit-breaker; return 200 and let the next
  // tick try again.
  let recentCount = 0;
  try {
    const auditKey = keys.audit(subredditName);
    recentCount = (await redis.zRange(auditKey, oneHourAgo, Number.MAX_SAFE_INTEGER, { by: 'score' })).length;
  } catch (err) {
    console.warn('[vibe-mod] scheduler/rate-limit: redis.zRange(audit) threw — skipping check:', describeErr(err));
    return c.json<TaskResponse>({ status: 'ok' });
  }

  if (recentCount > maxPerHour) {
    try {
      await redis.set(keys.circuitOpen(subredditName), '1');
      await redis.expire(keys.circuitOpen(subredditName), 600);
    } catch (err) {
      console.warn('[vibe-mod] scheduler/rate-limit: redis.set(circuitOpen) failed:', describeErr(err));
    }

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
  // Local-only mock AI provider (gated, opt-in). When
  //   VIBE_MOD_AI_PROVIDER=mock
  // is set in the build environment (e.g. local playtest / replay), return a
  // deterministic fake compiled rule without calling settings.get or fetch.
  // Devvit Reddit runtime never sets this var, so production behaviour is
  // unchanged. Useful for testing the compose flow against a real-shaped
  // rule when plugin RPC is unreachable.
  if (process.env.VIBE_MOD_AI_PROVIDER === 'mock') {
    console.warn('[vibe-mod] callOpenAI: VIBE_MOD_AI_PROVIDER=mock — returning fake compiled rule');
    return {
      json: {
        id: 'r_mock_demo',
        name: 'Mock compiled rule (demo)',
        sourceNL: userRule.slice(0, 200),
        on: ['onPostSubmit'],
        when: { all: [{ fact: 'author.accountAgeHours', op: 'lt', value: 72 }] },
        then: [{ action: 'modqueue', params: { note: 'mock-demo' } }],
      },
      tokensIn: 0,
      tokensOut: 0,
    };
  }

  // BYOK preference: sub-scope override key beats developer global key.
  // settings.get can throw \`undefined undefined: undefined\` when Devvit's
  // plugin RPC sidecar is unreachable. Treat *optional* BYOK failure as a
  // warning only (per user-reviewed patch direction); fall through to the
  // required global key. Skip the global-key lookup entirely when BYOK is
  // present to save one RPC. The clarification answer is referenced below.
  let subKey = '';
  try {
    subKey = ((await settings.get('subredditOpenaiApiKey')) as string) ?? '';
  } catch (err) {
    // Optional override; non-fatal. Continue to the global key path.
    console.warn(
      '[vibe-mod] callOpenAI: settings.get(subredditOpenaiApiKey) threw — continuing without BYOK:',
      describeErr(err),
    );
  }

  let apiKey = subKey.trim();
  let settingsRpcDown = false;
  let globalKeyLength = 0;
  if (!apiKey) {
    // No BYOK → required to read the global key. This one IS fatal if
    // unreachable, but distinguish "plugin RPC unavailable" from "no key
    // configured" so the caller can present an honest toast.
    try {
      const globalKey = ((await settings.get('openaiApiKey')) as string) ?? '';
      // Diagnostic per docs Q2 — typeof + length is safe to log; the *value*
      // is never logged. Tells us whether the secret is set, whether it
      // returned a string (vs undefined for a missing schema field), and
      // its length (which we can eyeball-compare to a typical OpenAI key
      // length). NEVER log the value itself.
      globalKeyLength = globalKey.length;
      console.log('[vibe-mod] callOpenAI: settings.get(openaiApiKey) ok:', {
        defined: typeof globalKey,
        len: globalKey.length,
      });
      apiKey = globalKey.trim();
    } catch (err) {
      settingsRpcDown = true;
      console.warn('[vibe-mod] callOpenAI: settings.get(openaiApiKey) threw:', describeErr(err));
    }
  }

  // Official-docs-sanctioned local fallback. Per Devvit docs
  // (capabilities/server/settings-and-secrets.mdx): "Local environment
  // variables and .env files are read during playtesting only." Reddit
  // production runtime does NOT set process.env.OPENAI_API_KEY, so the
  // fallback is a no-op there. In local \`devvit playtest\` it picks up the
  // .env value, which lets the compose flow work without round-tripping
  // through Devvit's plugin RPC. No env-var gate needed — production
  // can't accidentally activate this path.
  if (!apiKey) {
    const envKey = (process.env.OPENAI_API_KEY ?? '').trim();
    if (envKey) {
      console.warn('[vibe-mod] callOpenAI: settings.get returned no key — falling back to .env (playtest only).');
      apiKey = envKey;
    }
  }

  if (!apiKey) {
    // No key available anywhere. Distinguish the two failure shapes so the
    // submit handler can branch (settings RPC down vs key never configured).
    if (settingsRpcDown) throw new Error('no_key_plugin_rpc');
    throw new Error('no_key');
  }
  void globalKeyLength; // referenced for type-narrowing; we already logged it above

  let model = 'gpt-5.4-mini';
  try {
    model = ((await settings.get('openaiModel')) as string) || 'gpt-5.4-mini';
  } catch (err) {
    console.warn('[vibe-mod] callOpenAI: settings.get(openaiModel) threw — using default:', describeErr(err));
  }

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

  // Build the body, then escape every non-ASCII character as a JSON \uXXXX
  // sequence. OpenAI returned HTTP 400 "We could not parse the JSON body of
  // your request" against the obvious `JSON.stringify(...)` form when the
  // payload contained system-prompt em-dashes / arrows (≈ / — / →) — likely
  // a Devvit HTTP-plugin UTF-8 corner case on the wire. The escape form is
  // 7-bit ASCII, still strictly valid JSON, and any compliant parser
  // (including OpenAI's) decodes it back to the same Unicode characters.
  const rawBody = JSON.stringify({
    model, // gpt-5.4-mini (default) / gpt-5.4-nano / gpt-5.4 — see devvit.json openaiModel
    response_format: { type: 'json_object' },
    messages,
    // Tuned for what this call is: a mechanical NL → strict-JSON translation.
    //   reasoning_effort: 'none'  — no hidden reasoning needed; keeps it fast and stops the
    //                               token budget being eaten by reasoning (gpt-5.4 family value;
    //                               older models call this 'minimal'). Measured ~1.1-1.4s.
    //   verbosity: 'low'          — terse JSON, no commentary.
    //   max_completion_tokens     — a compiled rule + a clarification fit well under 600.
    //   (no `temperature` — the gpt-5.x family only accepts the default; max_tokens isn't
    //    supported on these models, use max_completion_tokens.)
    reasoning_effort: 'none',
    verbosity: 'low',
    max_completion_tokens: 600,
  });
  // ASCII-safe rewrite: any non-ASCII char (>= 0x80) → `\uXXXX` literal in
  // the JSON. Still valid JSON (parsers decode \u back), but transports the
  // body as pure 7-bit ASCII bytes, sidestepping the UTF-8-on-the-wire bug.
  const asciiSafeBody = rawBody.replace(/[-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: asciiSafeBody,
  });

  if (!resp.ok) {
    // Read the body so we can see *why* OpenAI rejected the request. The body
    // never leaves server logs — the user-facing toast is just the status
    // code. Trim to 1 KB to avoid logging unbounded payloads. Common 400
    // causes: invalid model name (e.g. retired), unsupported reasoning_effort
    // / verbosity parameter, response_format mismatch. Diagnosable from
    // `error.message` in OpenAI's response body.
    let errBody = '';
    try {
      errBody = (await resp.text()).slice(0, 1000);
    } catch {
      /* nothing */
    }
    console.warn(`[vibe-mod] callOpenAI: HTTP ${resp.status} ${resp.statusText} body:`, errBody);
    throw new Error(`openai_${resp.status}`);
  }
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

// ─────────────────────────────────────────────────────────────────────────────
// Devvit Web server bootstrap — official template pattern.
//
// Source: github.com/reddit/devvit-template-react/blob/main/src/server/index.ts
// (Reddit's canonical Devvit Web template).
//
//   serve({ fetch: app.fetch, createServer, port: getServerPort() })
//
// `@hono/node-server`'s `serve` builds a proper Node IncomingMessage → Web
// `Request` adapter (lazy body streams, correct host handling, idempotent
// close hooks). Crucially it accepts a `createServer` option, so the entire
// adapter pipeline still runs inside Devvit's `createServer` wrapper — which
// installs the per-request `runWithContext(Context(req.headers), …)` that
// downstream plugin RPC reads `context.metadata` from.
//
// Our prior hand-rolled `nodeToHonoListener` adapter (PR #26) was correct at
// the body-shuttling level but diverged from the canonical pattern, and
// hand-rolled adapters can subtly break async_hooks propagation on edge
// cases. The official adapter is the safer ground truth.
//
// Gate on WEBBIT_PORT so module-load smoke (CI `node -e "require(...)"`)
// doesn't bind a port and hang forever — the Devvit runtime is the only
// environment that supplies WEBBIT_PORT.
// ─────────────────────────────────────────────────────────────────────────────
if (typeof createServer === 'function' && typeof getServerPort === 'function' && process.env.WEBBIT_PORT) {
  try {
    serve({
      fetch: app.fetch,
      createServer,
      port: getServerPort(),
    });
  } catch (err) {
    // In tests, `vi.mock('@devvit/web/server', ...)` may stub these out → silently skip.
    console.warn('[vibe-mod] server bootstrap skipped (test or non-Devvit runtime):', err);
  }
}
