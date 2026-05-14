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
import { Rule, RuleBundle, checkTreeDepth, type RuleBundleType, type RuleType } from '../../shared/rule-schema';
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
  summarizeRule,
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
        label: 'Allow this rule to ban/mute (otherwise removes only)',
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

    // Audit finding #2 — confirmation form before persistence.
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

  // Form: compose-confirm-submit — Save persists + schedules dry-run, Edit
  // re-opens compose with the original NL pre-filled.
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
}

// Persist a validated rule into the draft bundle and schedule a dry-run.
// Private to this module — only compose-confirm-submit calls it.
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

  // RuleBundle's strict schema accepts the partial we built; coerce safely.
  void RuleBundle; // mark used for tree-shaking awareness

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
