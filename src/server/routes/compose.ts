// src/server/routes/compose.ts
// Compose rule flow (Phase 1.7b 2-step):
//   /internal/menu/compose-rule         → opens the composer form
//   /internal/form/compose-rule-submit  → calls OpenAI, validates, returns
//                                          either the clarify modal or the
//                                          new compose-confirm form
//   /internal/form/compose-confirm-submit → Save (persist + dry-run) OR
//                                          Edit (re-open compose pre-filled)
//
// Persistence helper `persistRuleAndStartDryRun()` is private to this
// module — only compose-confirm-submit ever calls it.

import type { Hono } from 'hono';
import { redis, scheduler } from '@devvit/web/server';
import type { FormField, MenuItemRequest, UiResponse } from '@devvit/web/shared';
import { LIMITS } from '../../shared/limits';
import { keys } from '../../shared/redis-keys';
import {
  GUARDED_ACTIONS,
  Rule,
  RuleBundle,
  checkTreeDepth,
  type RuleBundleType,
  type RuleType,
} from '../../shared/rule-schema';
import { getCurrentSubredditName, getCurrentUserId } from '../devvit-helpers';
import { isCallerModerator } from '../middleware/auth';
import { describeErr } from '../middleware/diagnostics';
import {
  PredicateTreeShape,
  safeParseBundle,
  summarizeValidationError,
  validatePredicateRegexes,
} from '../helpers/rule-validation';
import {
  ALLOW_GUARDED_HELP,
  MAX_CLARIFY_TURNS,
  callOpenAI,
  estimateTokenCost,
  humanizeRule,
  isClarification,
  readOpenaiModel,
  todayKey,
  unwrapFormString,
} from '../helpers/openai';
// scheduler is exported by @devvit/web/server but TypeScript exports it from
// the same module — silence the linter via a side-effect-free re-import.
import { settings } from '@devvit/web/server';

export function registerComposeRoutes(app: Hono): void {
  // Menu: open the composer form.
  app.post('/internal/menu/compose-rule', async (c) => {
    await c.req.json<MenuItemRequest>();

    if (!(await isCallerModerator())) {
      return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
    }

    const subredditName = getCurrentSubredditName();
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
              label: 'Allow this rule to ban/mute/approve (otherwise removes only)',
              type: 'boolean',
              defaultValue: false,
              helpText: ALLOW_GUARDED_HELP,
            },
          ],
        },
      },
    });
  });

  // Form: compose-rule-submit — runs the LLM compile, branches into clarify
  // (with select-of-suggestions) or the new confirm form.
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
    const otherAnswer = unwrapFormString(raw.clarificationAnswerOther);
    const selectedAnswer = unwrapFormString(raw.clarificationAnswer);
    const clarificationAnswer = otherAnswer || selectedAnswer;
    const turnRaw = unwrapFormString(raw.clarificationTurn);
    const clarificationTurn = Math.max(1, Math.min(99, Number.parseInt(turnRaw, 10) || 1));

    if (!rule?.trim()) {
      return c.json<UiResponse>({ showToast: { text: 'Please type a rule.', appearance: 'neutral' } });
    }

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
    const todayCounterKey = keys.compileCount(subredditName, todayKey());
    let todayCount = 0;
    try {
      todayCount = Number((await redis.get(todayCounterKey)) ?? '0');
    } catch (err) {
      console.warn('[vibe-mod] submit: redis.get(todayCount) threw — skipping quota:', describeErr(err));
    }

    let subOverrideKey = '';
    try {
      subOverrideKey = ((await settings.get('subredditOpenaiApiKey')) as string) ?? '';
    } catch (err) {
      console.warn(
        '[vibe-mod] submit: settings.get(subredditOpenaiApiKey) threw — assuming no BYOK:',
        describeErr(err),
      );
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
      const msg = String((err as Error)?.message ?? err);
      let userMsg: string;
      if (msg === 'no_key_plugin_rpc') {
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

    // Clarification path (audit findings #1, #5, #7).
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
        fields.push({
          name: 'clarificationAnswer',
          label: 'Your answer to the clarifying question',
          type: 'paragraph',
          defaultValue: '',
        });
      }

      fields.push({
        name: 'allowGuarded',
        label: 'Allow this rule to ban/mute/approve (otherwise removes only)',
        type: 'boolean',
        defaultValue: !!allowGuarded,
        helpText: ALLOW_GUARDED_HELP,
      });

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

    // Validate against schema (Rule.parse is .strict() → rejects extra fields).
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
      validatePredicateRegexes(validated.when as PredicateTreeShape);

      if (!allowGuarded) {
        const hasGuarded = validated.then.some((a) => (GUARDED_ACTIONS as readonly string[]).includes(a.action));
        if (hasGuarded) {
          return c.json<UiResponse>({
            showToast: {
              text: 'This rule would ban/mute users or auto-approve content. Re-submit with the "Allow ban/mute/approve" checkbox if intended.',
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

    // Audit finding #2 + Phase 2c demo-recording UX clean-up — confirmation
    // form before persistence. The previous shape carried 7 internal fields
    // through the form (rule / allowGuarded / serializedRule / tokensIn /
    // tokensOut / llmModel / usingBYOK), which (a) bloated the modal so the
    // mod had to scroll past a wall of disabled fields and (b) leaked
    // implementation detail. Now we stash the whole compile under a
    // 10-min Redis key (`composePending`) and only carry the short
    // pendingId across the form chain — see compose-confirm-submit.
    const llmModel = await readOpenaiModel();
    const humanized = humanizeRule(validated);
    const cost = estimateTokenCost(llmModel, tokensIn, tokensOut);
    const pendingId = newPendingId();
    try {
      // Atomic set + TTL via the `expiration` option (CodeRabbit #3 PR
      // #49). The previous two-step `set` + `expire` could leak a
      // TTL-less pending key if expire failed after set succeeded.
      await redis.set(
        keys.composePending(subredditName, pendingId),
        JSON.stringify({ validated, tokensIn, tokensOut, llmModel, usingBYOK, originalRule: rule, allowGuarded }),
        { expiration: new Date(Date.now() + 600_000) },
      );
    } catch (err) {
      console.warn('[vibe-mod] submit: redis.set(composePending) threw:', describeErr(err));
      return c.json<UiResponse>({
        showToast: {
          text: 'Plugin RPC unreachable — could not stage the compile for confirmation. Try again in a moment.',
          appearance: 'neutral',
        },
      });
    }

    // Increment the daily compile counter HERE (right after a successful
    // OpenAI compile + Redis stash) — NOT in the Save path. The previous
    // version only counted on Save, which let a moderator drive arbitrary
    // OpenAI cost by repeatedly compiling and cancelling out of the
    // confirm form (CodeRabbit #5 PR #49). The token cost is real either
    // way, so the quota should reflect it either way.
    if (!usingBYOK) {
      try {
        await redis.set(todayCounterKey, String(todayCount + 1), {
          expiration: new Date(Date.now() + 86_400_000),
        });
      } catch (err) {
        console.warn('[vibe-mod] submit: redis.set(todayCount) threw — quota not incremented:', describeErr(err));
      }
    }
    const summaryHeader = [
      `Rule name: ${validated.name}`,
      `Original sentence: "${validated.sourceNL}"`,
      '',
      humanized,
      '',
      `Compile cost: ${tokensIn} in / ${tokensOut} out tokens (~$${cost.toFixed(5)} on ${llmModel}).`,
    ].join('\n');

    return c.json<UiResponse>({
      showForm: {
        name: 'composeConfirmForm',
        form: {
          title: `Confirm: "${validated.name}"`,
          description:
            'Review the deterministic compile below. Save to keep this rule as a draft (with a 24h shadow period) and run a dry-run preview against recent posts.',
          acceptLabel: 'Save + run dry-run preview',
          cancelLabel: 'Cancel',
          fields: [
            {
              name: 'compiledSummary',
              label: 'Compiled rule',
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
            // Single short carrier — Devvit forms don't support hidden fields,
            // so the smallest visible token (8-char id) is the best we can
            // do. Used by /internal/form/compose-confirm-submit to look up
            // the staged compile in Redis.
            {
              name: 'pendingId',
              label: '(internal session id, do not edit)',
              type: 'string',
              defaultValue: pendingId,
              disabled: true,
            },
          ],
        },
      },
    });
  });

  // Form: compose-confirm-submit — Save persists + schedules dry-run, Edit
  // re-opens compose with the original NL pre-filled. Only one piece of
  // state crosses from compose: a short pendingId that points at a Redis
  // entry we wrote in the previous step. Everything else (validated rule,
  // tokens, model) is read back from there.
  app.post('/internal/form/compose-confirm-submit', async (c) => {
    if (!(await isCallerModerator())) {
      return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
    }

    const raw = await c.req.json<{
      compiledSummary?: string | string[];
      editInsteadOfSave?: boolean;
      pendingId?: string | string[];
    }>();

    const pendingId = unwrapFormString(raw.pendingId);
    if (!pendingId) {
      return c.json<UiResponse>({
        showToast: {
          text: 'Confirmation session expired or missing — please re-compile.',
          appearance: 'neutral',
        },
      });
    }

    const subredditName = getCurrentSubredditName();
    const pendingKey = keys.composePending(subredditName, pendingId);

    // Atomic GET-then-DEL via WATCH/MULTI/EXEC (CodeRabbit #4 PR #49). The
    // previous shape did a plain GET at the top and a DEL at the bottom,
    // which left a window where two concurrent submits with the same
    // pendingId (back-button + re-submit, double-click on Save, multi-tab
    // moderator) could each read the entry and run the persistence flow,
    // doubling the bundle write + dry-run schedule. The WATCH-checked
    // EXEC means whichever call commits first wins; the loser sees a
    // null result and surfaces the "session expired" toast.
    let pending: ComposePending | null = null;
    let pendingFoundButLost = false;
    try {
      const txn = await redis.watch(pendingKey);
      const pendingJson = await redis.get(pendingKey);
      if (pendingJson) {
        await txn.multi();
        await txn.del(pendingKey);
        const result = await txn.exec();
        if (result == null) {
          // Another submitter raced us and consumed the entry first.
          pendingFoundButLost = true;
        } else {
          pending = JSON.parse(pendingJson) as ComposePending;
        }
      } else {
        try {
          await txn.discard();
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      console.warn('[vibe-mod] confirm: redis.watch/get/del threw:', describeErr(err));
    }
    if (!pending) {
      return c.json<UiResponse>({
        showToast: {
          text: pendingFoundButLost
            ? 'Another submission consumed this confirmation. Please re-compile if you still want this rule.'
            : 'Confirmation session expired (10 min TTL). Please re-compile to try again.',
          appearance: 'neutral',
        },
      });
    }

    if (raw.editInsteadOfSave) {
      let dailyCountDisplay = '—';
      try {
        dailyCountDisplay = String(Number((await redis.get(keys.compileCount(subredditName, todayKey()))) ?? '0'));
      } catch (err) {
        console.warn('[vibe-mod] confirm: redis.get(dailyCount) threw:', describeErr(err));
      }
      // Pending entry was already consumed atomically above.
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
                defaultValue: pending.originalRule,
                helpText: 'Edit the sentence and re-compile.',
              },
              {
                name: 'allowGuarded',
                label: 'Allow this rule to ban/mute/approve (otherwise removes only)',
                type: 'boolean',
                defaultValue: !!pending.allowGuarded,
                helpText: ALLOW_GUARDED_HELP,
              },
            ],
          },
        },
      });
    }

    // Save branch — defence-in-depth re-validate (the redis entry could in
    // principle have been tampered with, although the only writer is this
    // very code path).
    let validated: RuleType;
    try {
      validated = Rule.parse(pending.validated);
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

    const persistResult = await persistRuleAndStartDryRun({
      validated,
      subredditName,
      tokensIn: pending.tokensIn,
      tokensOut: pending.tokensOut,
      llmModel: pending.llmModel,
    });

    // (pending entry already consumed atomically at the top of the
    // handler via WATCH/MULTI/DEL, so we don't need a second DEL here.)

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
}

// Shape of the transient compile state stashed under
// `keys.composePending(sub, pendingId)` between compose-rule-submit (which
// writes it) and compose-confirm-submit (which reads + deletes it).
// Phase 2c rework so the confirm modal carries one short id instead of
// 7 disabled `(internal)` fields.
interface ComposePending {
  validated: RuleType;
  tokensIn: number;
  tokensOut: number;
  llmModel: string;
  usingBYOK: boolean;
  originalRule: string;
  allowGuarded: boolean;
}

// Crypto-random short id for the composePending Redis key. 12 chars of
// hex is enough to make collisions astronomically unlikely (1 in 16^12),
// while staying short enough that the disabled "(internal session id)"
// field at the bottom of the confirm modal doesn't dominate the UI.
function newPendingId(): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Persist a validated rule into the draft bundle and schedule a dry-run.
// Private to this module — only compose-confirm-submit calls it. The daily
// quota counter has already been bumped at compile time (see
// compose-rule-submit), so this helper no longer touches it.
async function persistRuleAndStartDryRun(opts: {
  validated: RuleType;
  subredditName: string;
  tokensIn: number;
  tokensOut: number;
  llmModel: string;
}): Promise<{
  persisted: boolean;
  dryRunQueued: boolean;
  lines: string[];
  toast?: { text: string; appearance: 'neutral' | 'success' };
}> {
  const { validated, subredditName, tokensIn, tokensOut, llmModel } = opts;

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

  // (Daily compile counter is incremented in compose-rule-submit, right
  // after the OpenAI call returns — not here. The token cost is real
  // regardless of whether the moderator clicks Save or Cancel on the
  // confirm form, so the quota must reflect that. CodeRabbit #5 PR #49.)

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

  // RuleBundle's strict schema accepts the partial we built; coerce safely.
  void RuleBundle; // mark used for tree-shaking awareness

  // Phase 2c demo-recording UX clean-up — Devvit toasts truncate at ~120
  // chars, so the previous 4-clause line ('Compiled rule "X". → trigger:
  // action. Dry-run started — open ⋯ menu → "vibe-mod: View rules + log"
  // to see preview.') was getting cut off mid-sentence in the recording.
  // The compose-confirm form already showed the full humanizeRule output
  // and the rule-name detail, so the toast just needs to confirm what
  // actually happened.
  let line: string;
  if (persisted && dryRunQueued) {
    line = `Saved "${validated.name}". Dry-run starts now.`;
  } else if (persisted) {
    line = `Saved "${validated.name}" as draft (dry-run unavailable).`;
  } else {
    line = `Compiled but not persisted — plugin RPC unreachable.`;
  }
  return { persisted, dryRunQueued, lines: [line] };
}
