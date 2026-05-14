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
  FormField,
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
            helpText: ALLOW_GUARDED_HELP,
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

  const raw = await c.req.json<{
    rule: string;
    allowGuarded: boolean;
    clarificationAnswer?: string | string[];
    clarificationAnswerOther?: string | string[];
    clarificationTurn?: string | string[];
  }>();
  const rule = raw.rule;
  const allowGuarded = !!raw.allowGuarded;
  // Clarification answer can come from either (a) the select field
  // (`clarificationAnswer`, an array per Devvit SELECTION semantics) or
  // (b) the free-text override (`clarificationAnswerOther`). The override
  // wins when non-empty so the user can always escape the suggested options.
  const otherAnswer = unwrapFormString(raw.clarificationAnswerOther);
  const selectedAnswer = unwrapFormString(raw.clarificationAnswer);
  const clarificationAnswer = otherAnswer || selectedAnswer;

  // Turn counter (audit finding #5). Round 1 on first compile, increments
  // each time the LLM asks a follow-up question. Capped at MAX_CLARIFY_TURNS
  // so an oscillating LLM can't trap the moderator in an infinite modal loop.
  const turnRaw = unwrapFormString(raw.clarificationTurn);
  const clarificationTurn = Math.max(1, Math.min(99, Number.parseInt(turnRaw, 10) || 1));

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

  // Clarification path — sends user back to form with answer field, NOT
  // concatenation. When the LLM provided structured `suggestedAnswers` we
  // render them as a dropdown (audit finding #1) so the moderator can pick
  // the intended option in one click instead of paraphrasing the question.
  // The free-text "other" field is always present as an override / escape
  // hatch — `compose-rule-submit` prefers it when non-empty.
  //
  // Turn limit (audit finding #5): if the LLM asks a question on what would
  // be the (MAX_CLARIFY_TURNS + 1)-th round, refuse with an actionable toast
  // instead of opening yet another modal — an oscillating model can't trap
  // the moderator forever.
  if (isClarification(compiled)) {
    if (clarificationTurn >= MAX_CLARIFY_TURNS) {
      return c.json<UiResponse>({
        showToast: {
          text: `I've asked ${MAX_CLARIFY_TURNS} clarifying questions and still can't compile this rule. Try rephrasing more concretely — e.g. specific numbers like "< 7 days" or "< 50 chars".`,
          appearance: 'neutral',
        },
      });
    }

    const nextTurn = clarificationTurn + 1;
    const suggested = Array.isArray(compiled.suggestedAnswers)
      ? compiled.suggestedAnswers
          .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
          .map((s) => s.trim())
          .slice(0, 8)
      : [];

    // Editable original rule (audit finding #7) — moderator can revise the
    // English directly inside the clarify modal instead of cancelling out
    // and starting over. The next compile uses whatever text is in the field
    // PLUS the clarification answer.
    const fields: FormField[] = [
      {
        name: 'rule',
        label: 'Original rule (you can edit if you want to revise it)',
        type: 'paragraph',
        defaultValue: rule,
        helpText: 'Re-compile uses this text plus your answer below.',
      },
    ];

    if (suggested.length > 0) {
      fields.push({
        name: 'clarificationAnswer',
        label: 'Pick the closest match',
        type: 'select',
        options: suggested.map((s) => ({ label: s, value: s })),
        defaultValue: [suggested[0]],
        multiSelect: false,
      });
      fields.push({
        name: 'clarificationAnswerOther',
        label: 'Or type a different answer (overrides the selection above)',
        type: 'paragraph',
        defaultValue: '',
      });
    } else {
      // Model gave a question but no suggestions — fall back to free-text.
      fields.push({
        name: 'clarificationAnswer',
        label: 'Your answer to the clarifying question',
        type: 'paragraph',
        defaultValue: '',
      });
    }

    fields.push({
      name: 'allowGuarded',
      label: 'Allow this rule to ban/mute (otherwise removes only)',
      type: 'boolean',
      defaultValue: !!allowGuarded,
      helpText: ALLOW_GUARDED_HELP,
    });

    // Hidden state-carrier — Devvit forms have no `hidden` type, so a disabled
    // paragraph is the standard pattern for shipping state across rounds.
    fields.push({
      name: 'clarificationTurn',
      label: 'Round (do not edit)',
      type: 'paragraph',
      defaultValue: String(nextTurn),
      disabled: true,
    });

    return c.json<UiResponse>({
      showForm: {
        name: 'ruleComposerForm',
        form: {
          title: 'Clarify the rule',
          description: `(Round ${nextTurn} of ${MAX_CLARIFY_TURNS}) ${compiled.question}`,
          acceptLabel: 'Re-compile',
          fields,
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

  // Audit finding #2 — show a CONFIRMATION form before persisting. The
  // moderator sees the deterministic compile result rendered as English,
  // and can either Save (→ /internal/form/compose-confirm-submit, persists +
  // schedules dry-run) or Edit (→ re-opens compose with the original
  // sentence pre-filled). State (validated rule, tokens, model) is carried
  // forward through disabled paragraph fields — Devvit forms have no
  // hidden-input type, so this is the standard pattern.
  const llmModel = await readOpenaiModel();
  const humanized = humanizeRule(validated);
  const cost = estimateTokenCost(llmModel, tokensIn, tokensOut);
  const summaryHeader = [
    `Rule name: ${validated.name}`,
    `Original sentence: "${validated.sourceNL}"`,
    ``,
    humanized,
    ``,
    `Compile cost: ${tokensIn} in / ${tokensOut} out tokens (~$${cost.toFixed(5)} on ${llmModel}).`,
  ].join('\n');

  return c.json<UiResponse>({
    showForm: {
      name: 'composeConfirmForm',
      form: {
        title: `Confirm: "${validated.name}"`,
        description:
          'Review the deterministic compile below. Save to keep this rule as a draft (with a 24h shadow period) and run a dry-run preview against recent posts. Tick "Edit instead" to go back and revise the English.',
        acceptLabel: 'Save + run dry-run preview',
        cancelLabel: 'Cancel',
        fields: [
          {
            name: 'compiledSummary',
            label: 'Compiled rule (read-only)',
            type: 'paragraph',
            defaultValue: summaryHeader,
            disabled: true,
          },
          {
            name: 'editInsteadOfSave',
            label: 'Edit the original sentence instead of saving',
            type: 'boolean',
            defaultValue: false,
            helpText: 'Tick to re-open the compose form with your original text pre-filled.',
          },
          // ── State carriers (disabled paragraphs) ──
          { name: 'rule', label: '(internal) original NL', type: 'paragraph', defaultValue: rule, disabled: true },
          {
            name: 'allowGuarded',
            label: '(internal) allowGuarded',
            type: 'boolean',
            defaultValue: !!allowGuarded,
            disabled: true,
          },
          {
            name: 'serializedRule',
            label: '(internal) compiled rule JSON',
            type: 'paragraph',
            defaultValue: JSON.stringify(validated),
            disabled: true,
          },
          {
            name: 'tokensIn',
            label: '(internal) tokensIn',
            type: 'paragraph',
            defaultValue: String(tokensIn),
            disabled: true,
          },
          {
            name: 'tokensOut',
            label: '(internal) tokensOut',
            type: 'paragraph',
            defaultValue: String(tokensOut),
            disabled: true,
          },
          {
            name: 'llmModel',
            label: '(internal) llmModel',
            type: 'paragraph',
            defaultValue: llmModel,
            disabled: true,
          },
          {
            name: 'usingBYOK',
            label: '(internal) usingBYOK',
            type: 'boolean',
            defaultValue: usingBYOK,
            disabled: true,
          },
        ],
      },
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Form: Compose confirm submit (audit finding #2 — Save vs Edit branch)
// ─────────────────────────────────────────────────────────────────────────────
// Persists the previously-compiled rule into the draft bundle + schedules a
// dry-run preview. If the moderator ticked "Edit instead", instead re-opens
// the compose form with their original NL pre-filled so they can revise.
app.post('/internal/form/compose-confirm-submit', async (c) => {
  if (!(await isCallerModerator())) {
    return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
  }

  const raw = await c.req.json<{
    compiledSummary?: string | string[];
    editInsteadOfSave?: boolean;
    rule?: string | string[];
    allowGuarded?: boolean;
    serializedRule?: string | string[];
    tokensIn?: string | string[];
    tokensOut?: string | string[];
    llmModel?: string | string[];
    usingBYOK?: boolean;
  }>();

  const rule = unwrapFormString(raw.rule);
  const allowGuarded = !!raw.allowGuarded;
  const serializedRule = unwrapFormString(raw.serializedRule);
  const tokensIn = Math.max(0, Number.parseInt(unwrapFormString(raw.tokensIn), 10) || 0);
  const tokensOut = Math.max(0, Number.parseInt(unwrapFormString(raw.tokensOut), 10) || 0);
  const llmModel = unwrapFormString(raw.llmModel) || 'gpt-5.4-mini';
  const usingBYOK = !!raw.usingBYOK;

  // Edit branch — re-open compose form with the moderator's NL pre-filled
  // so they can revise without retyping. We deliberately *don't* refund
  // the compile we just spent (cost is real), but the moderator gets a
  // second pass for free if their next compile uses cached few-shot.
  if (raw.editInsteadOfSave) {
    const subredditName = getCurrentSubredditName();
    let dailyCountDisplay = '—';
    try {
      dailyCountDisplay = String(Number((await redis.get(keys.compileCount(subredditName, todayKey()))) ?? '0'));
    } catch (err) {
      console.warn('[vibe-mod] confirm: redis.get(dailyCount) threw:', describeErr(err));
    }
    return c.json<UiResponse>({
      showForm: {
        name: 'ruleComposerForm',
        form: {
          title: `Edit rule for r/${subredditName}`,
          description: `Compiles used today: ${dailyCountDisplay} / ${LIMITS.COMPILE_RATE_LIMIT_PER_DAY}.\nYour original text is pre-filled — revise and re-compile.`,
          acceptLabel: 'Compile + Preview',
          cancelLabel: 'Cancel',
          fields: [
            {
              name: 'rule',
              label: 'Describe your rule in plain English (max 1000 characters)',
              type: 'paragraph',
              defaultValue: rule,
              helpText: 'Edit the sentence and re-compile.',
            },
            {
              name: 'allowGuarded',
              label: 'Allow this rule to ban/mute (otherwise removes only)',
              type: 'boolean',
              defaultValue: !!allowGuarded,
              helpText: ALLOW_GUARDED_HELP,
            },
          ],
        },
      },
    });
  }

  // Save branch — re-validate the carried JSON (defence in depth: never
  // trust round-trip state) and run the original persist + dry-run flow.
  let validated: RuleType;
  try {
    validated = Rule.parse(JSON.parse(serializedRule));
    checkTreeDepth(validated.when as Parameters<typeof checkTreeDepth>[0]);
    validatePredicateRegexes(validated.when as PredicateTreeShape);
  } catch (_err) {
    return c.json<UiResponse>({
      showToast: {
        text: 'The compiled rule is no longer valid (please re-compile).',
        appearance: 'neutral',
      },
    });
  }

  const subredditName = getCurrentSubredditName();
  const todayCounterKey = keys.compileCount(subredditName, todayKey());
  let todayCount = 0;
  try {
    todayCount = Number((await redis.get(todayCounterKey)) ?? '0');
  } catch (err) {
    console.warn('[vibe-mod] confirm: redis.get(todayCount) threw — skipping quota:', describeErr(err));
  }

  const persistResult = await persistRuleAndStartDryRun({
    validated,
    subredditName,
    tokensIn,
    tokensOut,
    llmModel,
    usingBYOK,
    todayCount,
    todayCounterKey,
  });

  if (persistResult.toast) {
    return c.json<UiResponse>({ showToast: persistResult.toast });
  }
  return c.json<UiResponse>({
    showToast: {
      text: persistResult.lines.join(' '),
      appearance: persistResult.persisted ? 'success' : 'neutral',
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

  // Token usage snapshot — sum across both bundles. Cost is best-effort
  // (gpt-5.4-mini pricing assumed for whichever model the bundle records).
  const totalIn = (active?.llmTokensIn ?? 0) + (draft?.llmTokensIn ?? 0);
  const totalOut = (active?.llmTokensOut ?? 0) + (draft?.llmTokensOut ?? 0);
  const llmModel = active?.llmModel ?? draft?.llmModel ?? 'gpt-5.4-mini';
  const totalCost = estimateTokenCost(llmModel, totalIn, totalOut);

  // Onboarding card (audit Tier-3 #C) — show on first dashboard visit, then
  // hide once the moderator dismisses it. Best-effort Redis read; if it
  // fails we fall back to "show" (better than silently hiding the intro).
  let firstVisit = true;
  try {
    firstVisit = !(await redis.get(keys.onboardingDismissed(subredditName)));
  } catch (err) {
    console.warn('[vibe-mod] dashboard: redis.get(onboarding) threw:', describeErr(err));
  }
  const totalRules = (active?.rules.length ?? 0) + (draft?.rules.length ?? 0);
  const isEmpty = totalRules === 0 && recent.length === 0;

  const summary = [
    ...(rpcOk
      ? []
      : [
          '⚠ Plugin RPC unreachable (reddit/devvit#258 — OPEN platform bug).',
          'Persistence is offline; this view reflects what redis would return.',
          '',
        ]),
    ...(firstVisit
      ? [
          '👋 Welcome to vibe-mod. 3 quick steps:',
          '   1. We seeded 5 starter rules — see them below.',
          '   2. Open ⋯ → "vibe-mod: Manage rules" to activate one (shadow mode for 24h first).',
          '   3. Open ⋯ → "vibe-mod: Compose rule" to write your own in plain English.',
          '',
        ]
      : []),
    ...(isEmpty
      ? ['No rules yet — open the subreddit ⋯ menu → "vibe-mod: Compose rule" to write your first rule.', '']
      : []),
    `Active rules: ${active?.rules.length ?? 0}`,
    `Draft rules: ${draft?.rules.length ?? 0}`,
    `Recent actions: ${recent.length}`,
    `Tokens used (lifetime): ${totalIn.toLocaleString()} in / ${totalOut.toLocaleString()} out (~$${totalCost.toFixed(4)} on ${llmModel}).`,
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
        acceptLabel: 'Close',
        cancelLabel: firstVisit ? "Don't show intro again" : 'Cancel',
        fields: firstVisit
          ? [
              {
                name: 'dismissOnboarding',
                label: 'Dismiss the welcome intro for this sub',
                type: 'boolean',
                defaultValue: false,
                helpText: 'Tick to hide the 3-step intro on future visits.',
              },
            ]
          : [],
      },
    },
  });
});

// Dashboard form submit. Now read-only (audit Tier-2 #3 + #10) — per-rule
// activation moved to the dedicated Manage rules menu. Submit handles only
// the optional onboarding-dismiss flag.
app.post('/internal/form/dashboard-action', async (c) => {
  if (!(await isCallerModerator())) {
    return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
  }

  const { dismissOnboarding } = await c.req.json<{ dismissOnboarding?: boolean }>();
  if (dismissOnboarding) {
    const subredditName = getCurrentSubredditName();
    try {
      await redis.set(keys.onboardingDismissed(subredditName), '1');
    } catch (err) {
      console.warn('[vibe-mod] dashboard: redis.set(onboarding) threw:', describeErr(err));
    }
    return c.json<UiResponse>({ showToast: 'Welcome intro dismissed.' });
  }
  return c.json<UiResponse>({ showToast: 'Closed.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Menu: Manage rules — per-rule control surface (audit findings #3 + #10)
// ─────────────────────────────────────────────────────────────────────────────
// Renders one form-group per rule with a `select` of available actions
// (Keep / Activate / Promote / Pause / Delete). Submit applies all selected
// changes in one transaction. Deletes go through a confirm form first so a
// misclick can't wipe rules silently (audit finding #B).
app.post('/internal/menu/manage-rules', async (c) => {
  await c.req.json<MenuItemRequest>();
  if (!(await isCallerModerator())) {
    return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
  }

  const subredditName = getCurrentSubredditName();
  let active: RuleBundleType | null = null;
  let draft: RuleBundleType | null = null;
  try {
    active = safeParseBundle(await redis.get(keys.rulesActive(subredditName)), 'manage/active');
    draft = safeParseBundle(await redis.get(keys.rulesDraft(subredditName)), 'manage/draft');
  } catch (err) {
    console.warn('[vibe-mod] manage: redis.get(rules) threw:', describeErr(err));
    return c.json<UiResponse>({
      showToast: {
        text: 'Plugin RPC unreachable (reddit/devvit#258). Cannot manage rules until the platform is restored.',
        appearance: 'neutral',
      },
    });
  }

  const drafts = draft?.rules ?? [];
  const actives = active?.rules ?? [];

  // Empty state (audit finding #A) — guide the moderator to Compose if they
  // have nothing to manage. Avoids a confusing empty modal on first run.
  if (drafts.length === 0 && actives.length === 0) {
    return c.json<UiResponse>({
      showToast: {
        text: 'No rules yet. Open the subreddit ⋯ menu → "vibe-mod: Compose rule" to write your first rule.',
        appearance: 'neutral',
      },
    });
  }

  // Pre-fetch dry-run summaries so the per-rule panel can show "would match
  // X/Y" inline rather than forcing the moderator to bounce to the dashboard.
  const dryRunByRuleId = new Map<string, string>();
  for (const r of drafts) {
    try {
      const rawDry = await redis.get(keys.dryrun(subredditName, r.id));
      if (!rawDry) continue;
      const d = JSON.parse(rawDry) as DryRunResult;
      if (d.status === 'ok') {
        dryRunByRuleId.set(
          r.id,
          `Dry-run: would match ${d.matched.length}/${d.sampledPosts} recent post(s)` +
            (d.matched.length ? ` → ${[...new Set(d.matched.flatMap((m) => m.would))].join(', ')}` : ''),
        );
      } else {
        dryRunByRuleId.set(r.id, `Dry-run: ${d.note ?? 'unavailable'}`);
      }
    } catch (err) {
      console.warn(`[vibe-mod] manage: redis.get(dryrun/${r.id}) threw:`, describeErr(err));
    }
  }

  const fields: FormField[] = [];

  for (const r of drafts) {
    const dry = dryRunByRuleId.get(r.id) ?? 'Dry-run: pending — re-open in 30s.';
    const summary = `${r.sourceNL}\n\n${humanizeRule(r)}\n\n${dry}`;
    fields.push({
      type: 'group',
      label: `📝 Draft: ${r.name}`,
      fields: [
        { name: `info_${r.id}`, label: 'Rule', type: 'paragraph', defaultValue: summary, disabled: true },
        {
          name: `action_${r.id}`,
          label: 'Action',
          type: 'select',
          options: [
            { label: 'Keep as draft', value: 'keep' },
            { label: 'Activate (shadow mode 24h)', value: 'activate-shadow' },
            { label: 'Activate immediately (skip shadow)', value: 'activate-now' },
            { label: 'Delete', value: 'delete' },
          ],
          defaultValue: ['keep'],
          multiSelect: false,
        },
      ],
    });
  }

  for (const r of actives) {
    const status = r.shadow ? '👻 Shadow' : '✅ Live';
    const sinceMs = Date.now() - (r.activatedAt ?? r.createdAt);
    const sinceHours = Math.max(0, Math.round(sinceMs / 3_600_000));
    const summary = `${r.sourceNL}\n\n${humanizeRule(r)}\n\n${status} for ~${sinceHours}h.`;
    fields.push({
      type: 'group',
      label: `${status}: ${r.name}`,
      fields: [
        { name: `info_${r.id}`, label: 'Rule', type: 'paragraph', defaultValue: summary, disabled: true },
        {
          name: `action_${r.id}`,
          label: 'Action',
          type: 'select',
          options: [
            { label: 'Keep', value: 'keep' },
            ...(r.shadow ? [{ label: 'Promote shadow → live', value: 'promote' }] : []),
            { label: 'Pause (back to draft)', value: 'pause' },
            { label: 'Delete', value: 'delete' },
          ],
          defaultValue: ['keep'],
          multiSelect: false,
        },
      ],
    });
  }

  return c.json<UiResponse>({
    showForm: {
      name: 'manageRulesForm',
      form: {
        title: `Manage rules (${drafts.length} draft · ${actives.length} active)`,
        description:
          'Pick an action per rule. Deletes will ask for confirmation. Activate moves a draft into the live bundle (with shadow window). Pause moves a live rule back into drafts.',
        acceptLabel: 'Apply changes',
        cancelLabel: 'Cancel',
        fields,
      },
    },
  });
});

// Manage submit — collect every `action_${id}` and apply the diff atomically
// inside a single redis.set per bundle. Delete actions short-circuit into the
// confirm form so destructive intent is acknowledged once before the rules
// disappear (audit finding #B).
app.post('/internal/form/manage-rules-submit', async (c) => {
  if (!(await isCallerModerator())) {
    return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
  }
  const raw = (await c.req.json<Record<string, unknown>>()) || {};
  const actions: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!k.startsWith('action_')) continue;
    const id = k.slice('action_'.length);
    const decision = unwrapFormString(v as string | string[]);
    if (decision && decision !== 'keep') actions[id] = decision;
  }

  if (Object.keys(actions).length === 0) {
    return c.json<UiResponse>({ showToast: 'No changes selected.' });
  }

  // If any deletes → confirm step first.
  const deleteIds = Object.entries(actions)
    .filter(([, decision]) => decision === 'delete')
    .map(([id]) => id);

  if (deleteIds.length > 0) {
    const subredditName = getCurrentSubredditName();
    let active: RuleBundleType | null = null;
    let draft: RuleBundleType | null = null;
    try {
      active = safeParseBundle(await redis.get(keys.rulesActive(subredditName)), 'manage/confirm/active');
      draft = safeParseBundle(await redis.get(keys.rulesDraft(subredditName)), 'manage/confirm/draft');
    } catch (err) {
      console.warn('[vibe-mod] manage-confirm: redis.get(rules) threw:', describeErr(err));
    }
    const findRule = (id: string) => active?.rules.find((x) => x.id === id) ?? draft?.rules.find((x) => x.id === id);
    const deleteList = deleteIds
      .map((id) => {
        const r = findRule(id);
        return r ? `- ${r.name}  (${id})` : `- ${id}`;
      })
      .join('\n');

    return c.json<UiResponse>({
      showForm: {
        name: 'manageDeleteConfirmForm',
        form: {
          title: `Delete ${deleteIds.length} rule(s)?`,
          description:
            `These rules will be removed from both the draft and active bundles. Existing audit-log entries are kept (rollback tokens for any past actions remain valid for 30 days).\n\n` +
            deleteList,
          acceptLabel: 'Confirm delete',
          cancelLabel: 'Cancel',
          fields: [
            {
              name: 'confirmed',
              label: 'I understand this is permanent',
              type: 'boolean',
              defaultValue: false,
            },
            {
              name: 'pendingActions',
              label: '(internal) pending action map',
              type: 'paragraph',
              defaultValue: JSON.stringify(actions),
              disabled: true,
            },
          ],
        },
      },
    });
  }

  // No deletes → apply non-destructive actions immediately.
  const result = await applyManageActions(actions);
  return c.json<UiResponse>({
    showToast: { text: result.summary, appearance: result.persisted ? 'success' : 'neutral' },
  });
});

app.post('/internal/form/manage-delete-confirm', async (c) => {
  if (!(await isCallerModerator())) {
    return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
  }
  const raw = await c.req.json<{ confirmed?: boolean; pendingActions?: string | string[] }>();
  if (!raw.confirmed) {
    return c.json<UiResponse>({ showToast: 'Delete cancelled. No rules were removed.' });
  }
  let actions: Record<string, string> = {};
  try {
    actions = JSON.parse(unwrapFormString(raw.pendingActions)) as Record<string, string>;
  } catch (_err) {
    return c.json<UiResponse>({
      showToast: { text: 'Could not parse the pending action set. Re-open Manage rules.', appearance: 'neutral' },
    });
  }
  const result = await applyManageActions(actions);
  return c.json<UiResponse>({
    showToast: { text: result.summary, appearance: result.persisted ? 'success' : 'neutral' },
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

  // 2026-05-14: ROOT CAUSE of PR #32-#37 "could not parse JSON body" in prod.
  // `settings.get('openaiModel')` on a SELECTION-type field returns a string
  // ARRAY (e.g. `["gpt-5.4-mini"]`), not a string. We were sending the array
  // straight into the request body as `"model": ["gpt-5.4-mini"]` -- which
  // OpenAI rejected as unparseable JSON for the `model` field. PR #38 only
  // worked around this by hardcoding `gpt-5.4-nano`. Real fix: unwrap.
  //
  // Production proof (v0.0.39 logs):
  //   [vibe-mod] callOpenAI: settings.get(openaiModel) = ["gpt-5.4-mini"]
  //
  // Devvit settings docs: SELECTION type returns string[] even for single
  // selection.
  const DEFAULT_MODEL = 'gpt-5.4-mini';
  let model = DEFAULT_MODEL;
  try {
    const raw = await settings.get('openaiModel');
    let unwrapped: unknown = raw;
    if (Array.isArray(raw) && raw.length > 0) unwrapped = raw[0];
    if (typeof unwrapped === 'string' && unwrapped.trim()) model = unwrapped.trim();
    console.log('[vibe-mod] callOpenAI: openaiModel raw =', JSON.stringify(raw), 'unwrapped =', JSON.stringify(model));
  } catch (err) {
    console.warn('[vibe-mod] callOpenAI: settings.get(openaiModel) threw — using default:', describeErr(err));
  }

  // Single user message containing system instructions, few-shot examples, and
  // the user rule (+ optional clarification), all inline.
  //
  // Why a single message: Devvit's HTTP plugin reliably trips on `chat/completions`
  // bodies that combine (a) ≥ ~7 KB total size, (b) multiple messages, and
  // (c) JSON-escape sequences from nested `JSON.stringify` of few-shot
  // `assistant` content. Direct (laptop → OpenAI) POSTs of the *identical* body
  // return HTTP 200; the same body via Devvit's `fetch` returns HTTP 400
  // "We could not parse the JSON body". Probe v3 confirmed transit-safe shapes:
  // (b) tiny single user 121 B 200, (d) tiny + response_format 200, (e) tiny +
  // gpt-5.x family params 200, (f) 6 KB ASCII single user 200, (c) 7 KB 10
  // messages 400. Inlining everything as one user message keeps us on the (f)
  // shape (single user content) — independently verified transit-safe at 5610 B
  // and now extended to ~7 KB of structured instructions + examples.
  //
  // Why this preserves prompt fidelity: gpt-5.4-mini treats leading user-message
  // instructions identically to a system role for the purposes of JSON-mode
  // compilation; `response_format: { type: 'json_object' }` still enforces strict
  // JSON output. Few-shot examples are inlined in `INPUT → OUTPUT` blocks so the
  // model still learns the rule-compilation pattern. Length caps preserved
  // (rule ≤ 1000, clarification ≤ 500) for prompt-injection surface control.
  const clarif = clarificationAnswer?.trim().slice(0, 500);
  // Now that the model-array bug (PR #38 #39) is fixed, restore proper
  // few-shot examples with concrete JSON. The flattened key=value format
  // (PR #37) caused the model to emit `{"modqueue":{...}}` instead of
  // `{"action":"modqueue","params":{...}}` — a downstream toast on v0.0.39
  // surfaced "The compiled rule contained an action this app does not
  // support." Restoring `JSON.stringify(ex.assistant)` re-teaches the schema.
  //
  // Single-user composition is preserved (PR #32) because it's a robust
  // packaging choice independent of the model bug.
  const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
  const exampleBlock = (ex: (typeof FEW_SHOT_EXAMPLES)[number], i: number): string =>
    `EXAMPLE ${i + 1} INPUT: ${collapse(ex.user)} EXAMPLE ${i + 1} OUTPUT: ${JSON.stringify(ex.assistant)}`;
  const compositeContent = [
    'SYSTEM INSTRUCTIONS:',
    collapse(VIBE_MOD_SYSTEM_PROMPT),
    'EXAMPLES:',
    ...FEW_SHOT_EXAMPLES.map(exampleBlock),
    'TASK INPUT:',
    collapse(userRule.slice(0, 1000)),
    ...(clarif ? ['TASK CLARIFICATION:', collapse(clarif)] : []),
    'OUTPUT (strict JSON object only, no prose):',
  ].join(' ');
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: compositeContent },
  ];

  // Build the body, then escape every non-ASCII character as a JSON \uXXXX
  // sequence. OpenAI returned HTTP 400 "We could not parse the JSON body of
  // your request" against the obvious `JSON.stringify(...)` form when the
  // payload contained system-prompt em-dashes / arrows (≈ / — / →) — likely
  // a Devvit HTTP-plugin UTF-8 corner case on the wire. The escape form is
  // 7-bit ASCII, still strictly valid JSON, and any compliant parser
  // (including OpenAI's) decodes it back to the same Unicode characters.
  const rawBody = JSON.stringify({
    model, // gpt-5.4-mini (default) / gpt-5.4-nano / gpt-5.4 -- see devvit.json openaiModel
    response_format: { type: 'json_object' },
    messages,
    // reasoning_effort + verbosity dropped 2026-05-14: PR #32 (single message)
    // and PR #33 (source ASCII) both still hit HTTP 400 from Devvit transit.
    // Probe v3 isolated (d)/(e) individually but never tested all-3 features
    // on a large body simultaneously. Removing them keeps the body on the
    // narrowest known-good shape: probe(f) = 5610 B single user message,
    // no extra features, returned 200 in production 3 times. response_format
    // stays (model output JSON contract); max_completion_tokens stays (cost cap).
    //   (no `temperature` -- gpt-5.x family only accepts the default; max_tokens
    //    isn't supported on these models, use max_completion_tokens.)
    max_completion_tokens: 600,
  });
  // ASCII-safe rewrite: any non-ASCII char (>= 0x80) → `\uXXXX` literal in
  // the JSON. Still valid JSON (parsers decode \u back), but transports the
  // body as pure 7-bit ASCII bytes, sidestepping the UTF-8-on-the-wire bug.
  const asciiSafeBody = rawBody.replace(/[-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

  // Round 6: revert to string body. PR #36 (Uint8Array) still produced 400
  // in production so byte vs string encoding wasn't the differentiator.
  // probes (b)(d)(e)(f) all used string body and were 200.
  console.log('[vibe-mod] callOpenAI: body chars =', asciiSafeBody.length);
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

function isClarification(
  obj: unknown,
): obj is { needsClarification: true; question: string; suggestedAnswers?: string[] } {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as { needsClarification?: unknown; question?: unknown; suggestedAnswers?: unknown };
  if (o.needsClarification !== true) return false;
  if (typeof o.question !== 'string' || !o.question.trim()) return false;
  return true;
}

// Helper: normalize a Devvit form value that may arrive as `string` or
// `string[]` (SELECTION fields return arrays even for single-select — see
// PR #39 SELECTION-array root cause). Returns the trimmed first non-empty
// string, or ''.
function unwrapFormString(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw)) {
    for (const v of raw) {
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return '';
}

// Helper: 1-line summary of a compiled rule, suitable for a toast. Goes inside
// a Devvit toast (~200 char budget) so it must stay short. Format:
//   → onPostSubmit: modqueue (when /author<24h/)
function summarizeRule(r: RuleType): string {
  const triggers = r.on
    .map((t) =>
      t
        .replace(/^on/, '')
        .replace(/Submit$/, '')
        .toLowerCase(),
    )
    .join('+');
  const actions = [...new Set(r.then.map((a) => a.action))].join('+');
  return `→ ${triggers}: ${actions}`;
}

// Help text shared by the compose form and the clarify modal so both modals
// explain the ban/mute toggle the same way (audit finding #4).
const ALLOW_GUARDED_HELP =
  "vibe-mod only emits ban/mute when your rule explicitly says 'ban' or 'mute'. This checkbox lets the compile succeed when it does — leave it off for a removes-only rule.";

// Max number of clarification rounds before the server bails with an
// actionable toast (audit finding #5). Round 1 = initial compile. Rounds
// 2-3 = LLM follow-up questions. After round 3, no more modal — the
// moderator gets advice to rephrase concretely.
const MAX_CLARIFY_TURNS = 3;

// Pricing snapshot for token-cost display (audit finding D). gpt-5.4-mini
// is the default; prices move occasionally so this is best-effort and the
// dashboard shows it as "~$X" rather than a precise figure. Source:
// platform.openai.com/docs/pricing as of 2026-05-14.
const OPENAI_PRICING_USD_PER_TOKEN: Record<string, { in: number; out: number }> = {
  'gpt-5.4-mini': { in: 0.00000015, out: 0.0000006 },
  'gpt-5.4-nano': { in: 0.0000001, out: 0.0000004 },
  'gpt-5.4': { in: 0.0000025, out: 0.00001 },
};

// Estimate token cost for a (model, in, out) triple. Returns 0 if model
// unknown so we never crash on a future model name.
function estimateTokenCost(model: string, tokensIn: number, tokensOut: number): number {
  const p = OPENAI_PRICING_USD_PER_TOKEN[model];
  if (!p) return 0;
  return tokensIn * p.in + tokensOut * p.out;
}

// Read the openaiModel SELECTION setting, defensively unwrapping the array
// that Devvit returns even for single-select (PR #39 SELECTION-array root
// cause). Returns the default model name if the setting is missing or the
// plugin RPC is unreachable.
async function readOpenaiModel(): Promise<string> {
  const DEFAULT = 'gpt-5.4-mini';
  try {
    const raw = await settings.get('openaiModel');
    let unwrapped: unknown = raw;
    if (Array.isArray(raw) && raw.length > 0) unwrapped = raw[0];
    if (typeof unwrapped === 'string' && unwrapped.trim()) return unwrapped.trim();
  } catch (err) {
    console.warn('[vibe-mod] readOpenaiModel: settings.get threw — using default:', describeErr(err));
  }
  return DEFAULT;
}

// Apply a manage-rules action map atomically. Each id maps to one of:
//   keep | activate-shadow | activate-now | promote | pause | delete
// Plain reads + 1 write per bundle. All plugin RPC wrapped because
// reddit/devvit#258 still rears its head occasionally.
async function applyManageActions(actions: Record<string, string>): Promise<{ persisted: boolean; summary: string }> {
  const subredditName = getCurrentSubredditName();
  let active: RuleBundleType | null = null;
  let draft: RuleBundleType | null = null;
  try {
    active = safeParseBundle(await redis.get(keys.rulesActive(subredditName)), 'manage/apply/active');
    draft = safeParseBundle(await redis.get(keys.rulesDraft(subredditName)), 'manage/apply/draft');
  } catch (err) {
    console.warn('[vibe-mod] manage/apply: redis.get(rules) threw:', describeErr(err));
    return {
      persisted: false,
      summary: 'Plugin RPC unreachable (reddit/devvit#258). No changes applied.',
    };
  }

  // Empty bundles default — treat as no rules; deletes / promotes against
  // missing rules silently no-op (the result summary tells the user).
  const draftRules: RuleType[] = (draft?.rules ?? []).slice();
  const activeRules: RuleType[] = (active?.rules ?? []).slice();
  const now = Date.now();

  let activated = 0;
  let promoted = 0;
  let paused = 0;
  let deleted = 0;
  let kept = 0;

  for (const [id, decision] of Object.entries(actions)) {
    if (decision === 'keep') {
      kept++;
      continue;
    }
    const inDraftIdx = draftRules.findIndex((r) => r.id === id);
    const inActiveIdx = activeRules.findIndex((r) => r.id === id);

    if (decision === 'activate-shadow' || decision === 'activate-now') {
      if (inDraftIdx < 0) continue; // not a draft → no-op
      const r = draftRules[inDraftIdx];
      r.shadow = decision === 'activate-shadow';
      r.activatedAt = now;
      // Move from draft to active (or upsert into active by id).
      const existing = activeRules.findIndex((x) => x.id === id);
      if (existing >= 0) activeRules[existing] = r;
      else activeRules.push(r);
      draftRules.splice(inDraftIdx, 1);
      activated++;
    } else if (decision === 'promote') {
      if (inActiveIdx < 0) continue;
      const r = activeRules[inActiveIdx];
      if (r.shadow) {
        r.shadow = false;
        promoted++;
      }
    } else if (decision === 'pause') {
      if (inActiveIdx < 0) continue;
      const r = activeRules[inActiveIdx];
      r.shadow = true;
      // Move from active to draft. ID stable.
      const existing = draftRules.findIndex((x) => x.id === id);
      if (existing >= 0) draftRules[existing] = r;
      else draftRules.push(r);
      activeRules.splice(inActiveIdx, 1);
      paused++;
    } else if (decision === 'delete') {
      if (inDraftIdx >= 0) draftRules.splice(inDraftIdx, 1);
      if (inActiveIdx >= 0) activeRules.splice(inActiveIdx, 1);
      if (inDraftIdx >= 0 || inActiveIdx >= 0) deleted++;
    }
  }

  // Persist both bundles. Skip the write if nothing changed.
  let persisted = true;
  const writes: Array<Promise<unknown>> = [];
  const draftBundle: RuleBundleType = {
    schemaVersion: '1.0.0',
    bundleVersion: (draft?.bundleVersion ?? 0) + 1,
    compiledAt: now,
    llmModel: draft?.llmModel ?? 'manage',
    llmTokensIn: draft?.llmTokensIn ?? 0,
    llmTokensOut: draft?.llmTokensOut ?? 0,
    rules: draftRules,
  };
  const activeBundle: RuleBundleType = {
    schemaVersion: '1.0.0',
    bundleVersion: (active?.bundleVersion ?? 0) + 1,
    compiledAt: now,
    llmModel: active?.llmModel ?? 'manage',
    llmTokensIn: active?.llmTokensIn ?? 0,
    llmTokensOut: active?.llmTokensOut ?? 0,
    rules: activeRules,
  };
  try {
    writes.push(redis.set(keys.rulesDraft(subredditName), JSON.stringify(draftBundle)));
    writes.push(redis.set(keys.rulesActive(subredditName), JSON.stringify(activeBundle)));
    await Promise.all(writes);
  } catch (err) {
    persisted = false;
    console.warn('[vibe-mod] manage/apply: redis.set threw:', describeErr(err));
  }

  const parts: string[] = [];
  if (activated) parts.push(`activated ${activated}`);
  if (promoted) parts.push(`promoted ${promoted}`);
  if (paused) parts.push(`paused ${paused}`);
  if (deleted) parts.push(`deleted ${deleted}`);
  if (parts.length === 0 && kept > 0) parts.push(`kept ${kept} (no other action)`);
  if (parts.length === 0) parts.push('no matching rules to change');
  const summary = persisted
    ? `Applied: ${parts.join(', ')}.`
    : `Could not persist (plugin RPC unreachable). Intended: ${parts.join(', ')}.`;
  return { persisted, summary };
}

// Persist a validated rule into the draft bundle and schedule a dry-run.
// Extracted from compose-rule-submit so the new compose-confirm-submit
// (audit finding #2) can re-use the exact same persistence flow without
// duplicating the best-effort plugin-RPC error handling. Returns the toast
// payload the caller should send back to the moderator.
async function persistRuleAndStartDryRun(opts: {
  validated: RuleType;
  subredditName: string;
  tokensIn: number;
  tokensOut: number;
  llmModel: string;
  usingBYOK: boolean;
  todayCount: number;
  todayCounterKey: string;
}): Promise<{
  persisted: boolean;
  dryRunQueued: boolean;
  lines: string[];
  toast?: { text: string; appearance: 'neutral' | 'success' };
}> {
  const { validated, subredditName, tokensIn, tokensOut, llmModel, usingBYOK, todayCount, todayCounterKey } = opts;

  const draftKey = keys.rulesDraft(subredditName);
  let draftJson: string | undefined;
  try {
    draftJson = (await redis.get(draftKey)) ?? undefined;
  } catch (err) {
    console.warn('[vibe-mod] persist: redis.get(draft) threw — starting fresh:', describeErr(err));
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
    return {
      persisted: false,
      dryRunQueued: false,
      lines: [],
      toast: { text: 'Rule cap reached (50). Delete a rule first.', appearance: 'neutral' },
    };
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
    console.warn('[vibe-mod] persist: redis.set(draft) threw — rule NOT persisted:', describeErr(err));
  }

  if (!usingBYOK) {
    try {
      await redis.set(todayCounterKey, String(todayCount + 1));
      await redis.expire(todayCounterKey, 86_400);
    } catch (err) {
      console.warn('[vibe-mod] persist: redis.set(todayCount) threw — quota not incremented:', describeErr(err));
    }
  }

  let dryRunQueued = true;
  try {
    await scheduler.runJob({
      name: 'dry-run-replay',
      runAt: new Date(),
      data: { ruleId: validated.id, subredditName },
    });
  } catch (err) {
    dryRunQueued = false;
    console.warn('[vibe-mod] persist: scheduler.runJob(dry-run) threw — no preview:', describeErr(err));
  }

  const summary = summarizeRule(validated);
  const lines = [`Compiled rule "${validated.name}". ${summary}.`];
  if (persisted && dryRunQueued) {
    lines.push('Dry-run started — open the subreddit ⋯ menu → "vibe-mod: View rules + log" to see preview.');
  } else if (persisted) {
    lines.push('Saved as draft. Open the subreddit ⋯ menu → "vibe-mod: View rules + log".');
  } else {
    lines.push('Rule compiled but not persisted — plugin RPC unreachable (reddit/devvit#258).');
  }

  return { persisted, dryRunQueued, lines };
}

// Convert a compiled Rule into a human-readable English description for the
// compose-confirm form (audit finding #2). Renders trigger names, the
// PredicateTree as bulleted boolean logic, and the action list. Pure
// function — same input always renders the same output, matching the
// "deterministic" promise in README §0.
function humanizeRule(r: RuleType): string {
  const triggerLabel = (t: string): string =>
    t === 'onPostSubmit'
      ? 'a new post is submitted'
      : t === 'onCommentSubmit'
        ? 'a new comment is submitted'
        : t === 'onPostReport'
          ? 'a post is reported'
          : t === 'onCommentReport'
            ? 'a comment is reported'
            : t;
  const predicateLabel = (tree: unknown, indent = '  '): string => {
    if (!tree || typeof tree !== 'object') return `${indent}(empty)`;
    const t = tree as PredicateTreeShape & { value?: unknown };
    if (Array.isArray(t.all)) {
      const inner = t.all.map((c) => predicateLabel(c, indent + '  ')).join('\n');
      return `${indent}ALL of:\n${inner}`;
    }
    if (Array.isArray(t.any)) {
      const inner = t.any.map((c) => predicateLabel(c, indent + '  ')).join('\n');
      return `${indent}ANY of:\n${inner}`;
    }
    if (t.not) return `${indent}NOT ${predicateLabel(t.not, '').trim()}`;
    return `${indent}${t.fact} ${t.op} ${JSON.stringify(t.value)}`;
  };
  const actionLabel = (a: { action: string; params?: Record<string, unknown> }): string => {
    const p = a.params ?? {};
    if (a.action === 'modqueue') return `send to mod queue (note: "${p.note ?? ''}")`;
    if (a.action === 'remove') return `remove (spam: ${p.spam ? 'yes' : 'no'})`;
    if (a.action === 'flair') return `set flair to "${p.flairText ?? ''}"`;
    if (a.action === 'lock') return `lock the thread`;
    if (a.action === 'report') return `report (reason: "${p.reason ?? ''}")`;
    if (a.action === 'ban')
      return `BAN user${p.duration ? ` for ${p.duration}d` : ' permanently'} (reason: "${p.reason ?? ''}")`;
    if (a.action === 'mute') return `MUTE user for ${p.duration ?? '?'}h`;
    if (a.action === 'permaban') return `PERMABAN user (reason: "${p.reason ?? ''}")`;
    return a.action;
  };
  const triggers = r.on.map(triggerLabel).join(' OR ');
  const conditions = predicateLabel(r.when as PredicateTreeShape);
  const actions = r.then.map((a) => '  - ' + actionLabel(a)).join('\n');
  const rateLimit = r.rateLimit?.perAuthor ? `\nRate limit: ${r.rateLimit.perAuthor} per author.` : '';
  return [`When ${triggers}, IF:`, conditions, `THEN:`, actions, rateLimit].filter(Boolean).join('\n');
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
