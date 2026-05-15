// src/server/routes-compose.test.ts
// Functional call-tests for the "compose a rule" feature: the menu that opens
// the composer form, and the form-submit handler that runs the LLM compile,
// validates against the schema, stores a draft, and schedules the dry-run.
//
// These exercise the real Hono routes (`app.fetch(...)`) with Devvit + OpenAI
// mocked via test/setup.ts.

import { describe, it, expect, beforeEach } from 'vitest';
import app from './index';
import {
  fakeRedis,
  fakeReddit,
  fakeSettings,
  fakeScheduler,
  fakeFetch,
  fakeListing,
  openaiResponse,
  openaiError,
} from '../../test/setup';

const call = (path: string, body: unknown = {}) =>
  app.fetch(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

/** Make the current caller a moderator of `testsub`. */
function asMod() {
  fakeReddit.getModerators.mockResolvedValue(fakeListing([{ username: 'caller' }]));
}

const VALID_COMPILED = {
  id: 'r_low_karma_flag',
  name: 'Flag low-karma posts',
  sourceNL: 'send posts from accounts under 50 karma to the mod queue',
  on: ['onPostSubmit'],
  when: { fact: 'author.totalKarma', op: 'lt', value: 50 },
  then: [{ action: 'modqueue', params: { note: 'low-karma' } }],
};

/**
 * Helper for the new 2-step compose flow (Phase 1.7b, audit finding #2):
 *   compose-rule-submit  → returns showForm composeConfirmForm with state
 *   compose-confirm-submit → reads that state, persists draft + dry-run
 *
 * Tests that previously asserted "1 call → showToast success" must now do
 * both steps. This helper does the round-trip and returns the final body.
 */
async function compileAndConfirm(
  rule: string,
  allowGuarded: boolean,
  extraSubmitPayload: Record<string, unknown> = {},
): Promise<{ confirmFormBody: any; saveBody: any }> {
  const composeRes = await call('/internal/form/compose-rule-submit', {
    rule,
    allowGuarded,
    ...extraSubmitPayload,
  });
  const confirmFormBody = await composeRes.json();
  // If we got a clarification or a toast (error), there's nothing to confirm.
  if (!confirmFormBody.showForm || confirmFormBody.showForm.name !== 'composeConfirmForm') {
    return { confirmFormBody, saveBody: null };
  }
  // Replay the form's current values back as the confirm submission.
  const fields = confirmFormBody.showForm.form.fields as Array<{ name: string; defaultValue: unknown }>;
  const payload: Record<string, unknown> = {};
  for (const f of fields) payload[f.name] = f.defaultValue;
  payload.editInsteadOfSave = false;
  const saveRes = await call('/internal/form/compose-confirm-submit', payload);
  return { confirmFormBody, saveBody: await saveRes.json() };
}

beforeEach(() => {
  // default: caller is NOT a mod; tests opt in via asMod()
  fakeReddit.getCurrentUser.mockResolvedValue({ id: 't2_caller', username: 'caller' });
});

describe('POST /internal/menu/compose-rule', () => {
  it('rejects a non-moderator with a neutral toast', async () => {
    const res = await call('/internal/menu/compose-rule', { location: 'subreddit', targetId: 't5_testsub' });
    const body = await res.json();
    expect(body.showToast).toEqual({ text: 'Only moderators can use this.', appearance: 'neutral' });
    expect(body.showForm).toBeUndefined();
  });

  it('opens the composer form for a moderator, showing 0/50 quota', async () => {
    asMod();
    const body = await (
      await call('/internal/menu/compose-rule', { location: 'subreddit', targetId: 't5_testsub' })
    ).json();
    expect(body.showForm.name).toBe('ruleComposerForm');
    expect(body.showForm.form.description).toContain('Compiles used today: 0 / 50');
    const fieldNames = body.showForm.form.fields.map((f: { name: string }) => f.name);
    expect(fieldNames).toEqual(['rule', 'allowGuarded']);
  });

  it('reflects the current daily compile count', async () => {
    asMod();
    const today = new Date().toISOString().slice(0, 10);
    await fakeRedis.set(`testsub:compile:count:${today}`, '7');
    const body = await (
      await call('/internal/menu/compose-rule', { location: 'subreddit', targetId: 't5_testsub' })
    ).json();
    expect(body.showForm.form.description).toContain('Compiles used today: 7 / 50');
  });
});

describe('POST /internal/form/compose-rule-submit', () => {
  it('rejects a non-moderator', async () => {
    const body = await (await call('/internal/form/compose-rule-submit', { rule: 'x', allowGuarded: false })).json();
    expect(body.showToast).toEqual({ text: 'Only moderators can use this.', appearance: 'neutral' });
  });

  it('asks the mod to type something when the rule is blank', async () => {
    asMod();
    const body = await (await call('/internal/form/compose-rule-submit', { rule: '   ', allowGuarded: false })).json();
    expect(body.showToast).toEqual({ text: 'Please type a rule.', appearance: 'neutral' });
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it('blocks compile when the daily quota is exhausted', async () => {
    asMod();
    const today = new Date().toISOString().slice(0, 10);
    await fakeRedis.set(`testsub:compile:count:${today}`, '50');
    const body = await (
      await call('/internal/form/compose-rule-submit', { rule: 'flag low karma', allowGuarded: false })
    ).json();
    expect(body.showToast.text).toContain('Compile quota reached');
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it('blocks compile uniformly across subreddits — no per-sub key override accepted (v0.0.51)', async () => {
    // Pre-v0.0.51 a mod could paste an OpenAI key into `subredditOpenaiApiKey`
    // to bypass the per-sub quota. That setting is removed because Devvit
    // subreddit-scope settings are not encrypted — any mod of the sub could
    // read the key in plaintext. After removal, the quota is unconditional.
    asMod();
    const today = new Date().toISOString().slice(0, 10);
    await fakeRedis.set(`testsub:compile:count:${today}`, '50');
    // Even with a (hypothetical) per-sub key value lying around in settings,
    // the compose path no longer reads it.
    fakeSettings.get.mockImplementation(async (k: string) =>
      k === 'subredditOpenaiApiKey' ? 'sk-stale-leftover-value' : k === 'openaiApiKey' ? 'sk-dev' : undefined,
    );
    const body = await (
      await call('/internal/form/compose-rule-submit', { rule: 'flag low karma', allowGuarded: false })
    ).json();
    expect(body.showToast.text).toContain('Compile quota reached');
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it('returns a friendly toast (and does not crash) when the compiler is offline', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'openaiApiKey' ? 'sk-dev' : undefined));
    fakeFetch.mockResolvedValue(openaiError(503));
    const body = await (
      await call('/internal/form/compose-rule-submit', { rule: 'flag low karma', allowGuarded: false })
    ).json();
    // c9bc895 added status-aware toasts. 5xx → "OpenAI is having a server
    // problem (HTTP 5xx). Try again in a minute." Use a permissive match so
    // a future copy-edit doesn't break the test.
    expect(body.showToast.text).toMatch(/(Compiler offline|OpenAI is having a server problem)/);
  });

  it('re-opens the form with a clarification field when the LLM asks a question', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'openaiApiKey' ? 'sk-dev' : undefined));
    fakeFetch.mockResolvedValue(
      openaiResponse({
        needsClarification: true,
        question: 'What counts as low karma?',
        suggestedAnswers: ['<50', '<100'],
      }),
    );
    const body = await (
      await call('/internal/form/compose-rule-submit', { rule: 'flag low karma posts', allowGuarded: false })
    ).json();
    expect(body.showForm.name).toBe('ruleComposerForm');
    expect(body.showForm.form.title).toBe('Clarify the rule');
    // Phase 1.7b (audit finding #5): clarify form description gets a
    // (Round X of N) prefix so the moderator sees how many tries remain.
    expect(body.showForm.form.description).toMatch(/Round 2 of 3/);
    expect(body.showForm.form.description).toContain('What counts as low karma?');
    const fieldNames = body.showForm.form.fields.map((f: { name: string }) => f.name);
    expect(fieldNames).toContain('clarificationAnswer');
    // The hidden state-carrier `clarificationTurn` is now part of the form.
    expect(fieldNames).toContain('clarificationTurn');
  });

  // ── Phase 1.6 (audit finding #1): suggestedAnswers → select field ──
  it('renders LLM suggestedAnswers as a select field plus a free-text override', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'openaiApiKey' ? 'sk-dev' : undefined));
    fakeFetch.mockResolvedValue(
      openaiResponse({
        needsClarification: true,
        question: "What should count as 'brand-new account'?",
        suggestedAnswers: ['under 24 hours', 'under 7 days', 'Both'],
      }),
    );
    const body = await (
      await call('/internal/form/compose-rule-submit', { rule: 'mod brand-new accounts', allowGuarded: false })
    ).json();
    const fields = body.showForm.form.fields as Array<{
      name: string;
      type: string;
      options?: Array<{ label: string; value: string }>;
      defaultValue?: unknown;
    }>;
    const select = fields.find((f) => f.name === 'clarificationAnswer');
    expect(select?.type).toBe('select');
    expect(select?.options).toEqual([
      { label: 'under 24 hours', value: 'under 24 hours' },
      { label: 'under 7 days', value: 'under 7 days' },
      { label: 'Both', value: 'Both' },
    ]);
    expect(select?.defaultValue).toEqual(['under 24 hours']);
    const other = fields.find((f) => f.name === 'clarificationAnswerOther');
    expect(other?.type).toBe('paragraph');
    // Allow ban/mute toggle now carries explanatory helpText (audit finding #4).
    const guarded = fields.find((f) => f.name === 'allowGuarded');
    expect((guarded as { helpText?: string }).helpText).toMatch(/ban\/mute/);
  });

  it('falls back to a free-text answer when the LLM clarification omits suggestedAnswers', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'openaiApiKey' ? 'sk-dev' : undefined));
    fakeFetch.mockResolvedValue(
      openaiResponse({ needsClarification: true, question: 'Which subreddit?' /* no suggestedAnswers */ }),
    );
    const body = await (
      await call('/internal/form/compose-rule-submit', { rule: 'mod across subs', allowGuarded: false })
    ).json();
    const fields = body.showForm.form.fields as Array<{ name: string; type: string }>;
    const answer = fields.find((f) => f.name === 'clarificationAnswer');
    expect(answer?.type).toBe('paragraph');
    expect(fields.find((f) => f.name === 'clarificationAnswerOther')).toBeUndefined();
  });

  it('unwraps the SELECTION-array clarificationAnswer when re-compiling', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'openaiApiKey' ? 'sk-dev' : undefined));
    fakeFetch.mockResolvedValue(openaiResponse(VALID_COMPILED));
    await call('/internal/form/compose-rule-submit', {
      rule: 'flag low karma posts',
      allowGuarded: false,
      // Devvit SELECTION returns string[] even for single-select. Server must unwrap.
      clarificationAnswer: ['under 7 days'],
    });
    // Verify the OpenAI request included the unwrapped clarification text
    // (we can only assert it via fakeFetch payload).
    const lastCall = fakeFetch.mock.calls.at(-1)!;
    const body = JSON.parse(lastCall[1].body as string) as {
      messages: Array<{ role: string; content: string }>;
    };
    const allContent = body.messages.map((m) => m.content).join(' ');
    expect(allContent).toContain('under 7 days');
    expect(allContent).not.toContain('["under 7 days"]'); // not raw array
  });

  it('uses clarificationAnswerOther when set, even if the select also has a value', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'openaiApiKey' ? 'sk-dev' : undefined));
    fakeFetch.mockResolvedValue(openaiResponse(VALID_COMPILED));
    await call('/internal/form/compose-rule-submit', {
      rule: 'flag low karma posts',
      allowGuarded: false,
      clarificationAnswer: ['under 24 hours'],
      clarificationAnswerOther: 'precisely 90 days',
    });
    const lastCall = fakeFetch.mock.calls.at(-1)!;
    const body = JSON.parse(lastCall[1].body as string) as {
      messages: Array<{ role: string; content: string }>;
    };
    const allContent = body.messages.map((m) => m.content).join(' ');
    expect(allContent).toContain('precisely 90 days');
    expect(allContent).not.toContain('under 24 hours');
  });

  // ── Phase 1.6 (audit finding #4): ban/mute helpText on compose form ──
  it('compose form ban/mute toggle carries explanatory helpText', async () => {
    asMod();
    const body = await (
      await call('/internal/menu/compose-rule', { location: 'subreddit', targetId: 't5_testsub' })
    ).json();
    const guarded = body.showForm.form.fields.find((f: { name: string }) => f.name === 'allowGuarded') as {
      helpText?: string;
    };
    expect(guarded?.helpText).toMatch(/ban\/mute/);
    expect(guarded?.helpText).toMatch(/explicitly says/);
  });

  // ── Phase 1.7b (audit finding #2): compose-confirm-submit Edit branch ──
  it('compose-confirm-submit "Edit instead" re-opens the compose form with the original NL pre-filled', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'openaiApiKey' ? 'sk-dev' : undefined));
    fakeFetch.mockResolvedValue(openaiResponse(VALID_COMPILED));

    // Get to the confirm form first.
    const composeRes = await call('/internal/form/compose-rule-submit', {
      rule: VALID_COMPILED.sourceNL,
      allowGuarded: false,
    });
    const confirmForm = await composeRes.json();
    const fields = confirmForm.showForm.form.fields as Array<{ name: string; defaultValue: unknown }>;
    const payload: Record<string, unknown> = {};
    for (const f of fields) payload[f.name] = f.defaultValue;
    payload.editInsteadOfSave = true; // ← user ticks Edit

    const editRes = await call('/internal/form/compose-confirm-submit', payload);
    const editBody = await editRes.json();
    expect(editBody.showForm.name).toBe('ruleComposerForm');
    expect(editBody.showForm.form.title).toMatch(/Edit rule/);
    const ruleField = editBody.showForm.form.fields.find((f: { name: string }) => f.name === 'rule');
    expect(ruleField.defaultValue).toBe(VALID_COMPILED.sourceNL);
    // Nothing was persisted on the Edit branch.
    expect(await fakeRedis.get('testsub:rules:draft')).toBeUndefined();
  });

  // ── Phase 1.7b (audit finding #5): clarification turn limit ──
  it('refuses a 4th-round clarification with an actionable toast (turn limit = 3)', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'openaiApiKey' ? 'sk-dev' : undefined));
    // LLM keeps asking for clarification.
    fakeFetch.mockResolvedValue(
      openaiResponse({
        needsClarification: true,
        question: 'Please clarify further',
        suggestedAnswers: ['option a', 'option b'],
      }),
    );
    // Simulate the 3rd-round form submission (clarificationTurn=3 from previous round).
    const body = await (
      await call('/internal/form/compose-rule-submit', {
        rule: 'something vague',
        allowGuarded: false,
        clarificationTurn: '3',
      })
    ).json();
    expect(body.showToast).toBeDefined();
    expect(body.showToast.text).toMatch(/3 clarifying questions/);
    expect(body.showToast.text).toMatch(/rephrasing more concretely/);
    // No new form opened.
    expect(body.showForm).toBeUndefined();
  });

  it('clarify form bumps the turn counter on each round', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'openaiApiKey' ? 'sk-dev' : undefined));
    fakeFetch.mockResolvedValue(openaiResponse({ needsClarification: true, question: 'Q?', suggestedAnswers: ['a'] }));
    // Round 1 (no clarificationTurn → server treats as 1).
    const r1 = await (
      await call('/internal/form/compose-rule-submit', { rule: 'vague rule', allowGuarded: false })
    ).json();
    const turn1 = (r1.showForm.form.fields as Array<{ name: string; defaultValue: unknown }>).find(
      (f) => f.name === 'clarificationTurn',
    )!.defaultValue;
    expect(turn1).toBe('2'); // next round
    expect(r1.showForm.form.description).toMatch(/Round 2 of 3/);

    // Round 2 (echo turn=2 back).
    const r2 = await (
      await call('/internal/form/compose-rule-submit', {
        rule: 'vague rule',
        allowGuarded: false,
        clarificationTurn: '2',
      })
    ).json();
    const turn2 = (r2.showForm.form.fields as Array<{ name: string; defaultValue: unknown }>).find(
      (f) => f.name === 'clarificationTurn',
    )!.defaultValue;
    expect(turn2).toBe('3');
    expect(r2.showForm.form.description).toMatch(/Round 3 of 3/);
  });

  // ── Phase 1.7b (audit finding #7): editable original rule in clarify modal ──
  it('clarify form leaves the Original rule field enabled (audit finding #7)', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'openaiApiKey' ? 'sk-dev' : undefined));
    fakeFetch.mockResolvedValue(openaiResponse({ needsClarification: true, question: 'Q?', suggestedAnswers: ['a'] }));
    const body = await (
      await call('/internal/form/compose-rule-submit', { rule: 'edit me', allowGuarded: false })
    ).json();
    const ruleField = (body.showForm.form.fields as Array<{ name: string; disabled?: boolean }>).find(
      (f) => f.name === 'rule',
    )!;
    expect(ruleField.disabled).toBeFalsy();
  });

  // ── Phase 2c demo-recording UX clean-up: success toast is short ──
  // The previous wording packed 4 clauses into one line and Devvit's toast
  // truncated mid-sentence in the recording. The compose-confirm form
  // already shows the full rule + cost so the toast just needs to confirm
  // what happened.
  it('success toast is short and names the rule that was saved', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'openaiApiKey' ? 'sk-dev' : undefined));
    fakeFetch.mockResolvedValue(openaiResponse(VALID_COMPILED));
    const { saveBody } = await compileAndConfirm(VALID_COMPILED.sourceNL, false);
    expect(saveBody.showToast.appearance).toBe('success');
    expect(saveBody.showToast.text).toContain('Flag low-karma posts');
    expect(saveBody.showToast.text.length).toBeLessThan(120); // Devvit toast budget
  });

  it('compiles a valid rule → shows confirm form → on Save: stores draft, bumps counter, schedules dry-run', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) =>
      k === 'openaiApiKey' ? 'sk-dev' : k === 'openaiModel' ? 'gpt-5.4-nano' : undefined,
    );
    fakeFetch.mockResolvedValue(openaiResponse(VALID_COMPILED));

    // Phase 1.7b + Phase 2c (audit finding #2): compile-rule-submit returns
    // a confirm form, not a success toast. The form now carries a single
    // short pendingId — the actual compile state lives under a Redis key
    // (audit finding #B from the demo recording — internal carriers were
    // bloating the modal). We run the two steps manually here so we can
    // assert on the pending entry between them.
    const composeRes = await call('/internal/form/compose-rule-submit', {
      rule: VALID_COMPILED.sourceNL,
      allowGuarded: false,
    });
    const confirmFormBody = await composeRes.json();
    expect(confirmFormBody.showForm.name).toBe('composeConfirmForm');
    expect(confirmFormBody.showForm.form.title).toContain('Flag low-karma posts');
    const fieldsByName = Object.fromEntries(
      (confirmFormBody.showForm.form.fields as Array<{ name: string; defaultValue: unknown }>).map((f) => [
        f.name,
        f.defaultValue,
      ]),
    );
    expect(fieldsByName.compiledSummary).toContain('Flag low-karma posts');
    expect(typeof fieldsByName.pendingId).toBe('string');
    expect((fieldsByName.pendingId as string).length).toBeGreaterThan(0);
    // No more raw internal carriers in the modal.
    expect(fieldsByName.serializedRule).toBeUndefined();
    expect(fieldsByName.llmModel).toBeUndefined();
    // The pending entry should round-trip the model the test stubbed.
    const pendingJson = JSON.parse((await fakeRedis.get(`testsub:compose:pending:${fieldsByName.pendingId}`))!);
    expect(pendingJson.llmModel).toBe('gpt-5.4-nano');
    expect(pendingJson.validated.id).toBe('r_low_karma_flag');

    // Now run Save — pending entry gets consumed, draft persisted.
    const savePayload: Record<string, unknown> = {};
    for (const f of confirmFormBody.showForm.form.fields as Array<{ name: string; defaultValue: unknown }>) {
      savePayload[f.name] = f.defaultValue;
    }
    savePayload.editInsteadOfSave = false;
    const saveRes = await call('/internal/form/compose-confirm-submit', savePayload);
    const saveBody = await saveRes.json();
    expect(saveBody.showToast.appearance).toBe('success');
    expect(saveBody.showToast.text).toContain('Flag low-karma posts');
    expect(await fakeRedis.get(`testsub:compose:pending:${fieldsByName.pendingId}`)).toBeUndefined();

    const draft = JSON.parse((await fakeRedis.get('testsub:rules:draft'))!);
    expect(draft.rules).toHaveLength(1);
    expect(draft.rules[0].id).toBe('r_low_karma_flag');
    expect(draft.rules[0].shadow).toBe(true);
    expect(draft.rules[0].createdBy).toBe('t2_caller');
    expect(draft.bundleVersion).toBe(1);

    const today = new Date().toISOString().slice(0, 10);
    expect(await fakeRedis.get(`testsub:compile:count:${today}`)).toBe('1');

    expect(fakeScheduler.runJob).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'dry-run-replay',
        data: expect.objectContaining({ ruleId: 'r_low_karma_flag', subredditName: 'testsub' }),
      }),
    );
  });

  it('upserts a re-compiled rule with the same id and bumps the bundle version', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'openaiApiKey' ? 'sk-dev' : undefined));
    fakeFetch.mockResolvedValue(openaiResponse(VALID_COMPILED));
    await compileAndConfirm(VALID_COMPILED.sourceNL, false);
    fakeFetch.mockResolvedValue(openaiResponse({ ...VALID_COMPILED, name: 'Flag low-karma posts (v2)' }));
    await compileAndConfirm(VALID_COMPILED.sourceNL, false);

    const draft = JSON.parse((await fakeRedis.get('testsub:rules:draft'))!);
    expect(draft.rules).toHaveLength(1);
    expect(draft.rules[0].name).toBe('Flag low-karma posts (v2)');
    expect(draft.bundleVersion).toBe(2);
  });

  it('refuses a rule that bans/mutes unless the mod ticked the guarded checkbox', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'openaiApiKey' ? 'sk-dev' : undefined));
    const banRule = {
      ...VALID_COMPILED,
      id: 'r_ban_spammers',
      then: [{ action: 'ban', params: { reason: 'spam', duration: 7 } }],
    };
    fakeFetch.mockResolvedValue(openaiResponse(banRule));

    // First attempt — ban without "Allow ban/mute" → blocked at compose-rule-submit
    // (toast, no confirm form). Use the raw call() so we can assert the toast.
    const blockedRes = await call('/internal/form/compose-rule-submit', {
      rule: 'ban repeat spammers',
      allowGuarded: false,
    });
    const blocked = await blockedRes.json();
    expect(blocked.showToast.text).toMatch(/ban\/mute/i);
    expect(await fakeRedis.get('testsub:rules:draft')).toBeUndefined();

    // Second attempt — with allowGuarded: true → goes through confirm + save.
    fakeFetch.mockResolvedValue(openaiResponse(banRule));
    const { saveBody } = await compileAndConfirm('ban repeat spammers', true);
    expect(saveBody.showToast.appearance).toBe('success');
    const draft = JSON.parse((await fakeRedis.get('testsub:rules:draft'))!);
    expect(draft.rules[0].then[0].action).toBe('ban');
  });

  it('rejects a compiled rule that fails schema validation, with a sanitized message', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'openaiApiKey' ? 'sk-dev' : undefined));
    fakeFetch.mockResolvedValue(openaiResponse({ ...VALID_COMPILED, then: [{ action: 'shadowban', params: {} }] }));
    const body = await (
      await call('/internal/form/compose-rule-submit', { rule: 'shadowban everyone', allowGuarded: false })
    ).json();
    expect(body.showToast.appearance).toBe('neutral');
    expect(body.showToast.text).toBeTruthy();
    // never leak raw Zod paths
    expect(body.showToast.text).not.toContain('ZodError');
    expect(await fakeRedis.get('testsub:rules:draft')).toBeUndefined();
  });

  it('rejects a compiled rule whose `matches` predicate uses a dangerous regex', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'openaiApiKey' ? 'sk-dev' : undefined));
    fakeFetch.mockResolvedValue(
      openaiResponse({
        ...VALID_COMPILED,
        id: 'r_redos',
        when: { fact: 'content.containsRegex', op: 'matches', value: '(a+)+b' },
      }),
    );
    const body = await (
      await call('/internal/form/compose-rule-submit', { rule: 'match (a+)+b', allowGuarded: false })
    ).json();
    expect(body.showToast.appearance).toBe('neutral');
    expect(await fakeRedis.get('testsub:rules:draft')).toBeUndefined();
  });

  // Tests for the resilient-fallback behaviour around Devvit's plugin RPC
  // layer being unavailable in some runtimes.

  it('surfaces the plugin-RPC-unavailable toast when the global key lookup throws', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => {
      if (k === 'openaiApiKey') throw new Error('undefined undefined: undefined');
      return undefined;
    });

    const body = await (
      await call('/internal/form/compose-rule-submit', { rule: VALID_COMPILED.sourceNL, allowGuarded: false })
    ).json();
    expect(body.showToast.appearance).toBe('neutral');
    expect(body.showToast.text).toMatch(/Devvit settings\/plugin RPC is unavailable/);
    // and we should NOT have called OpenAI (no key was reachable)
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it('returns the "no key configured" toast when settings work but the key is empty', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => {
      if (k === 'openaiApiKey') return '';
      return undefined;
    });

    const body = await (
      await call('/internal/form/compose-rule-submit', { rule: VALID_COMPILED.sourceNL, allowGuarded: false })
    ).json();
    expect(body.showToast.text).toMatch(/No OpenAI API key configured/);
  });

  it('returns a deterministic fake compiled rule when VIBE_MOD_AI_PROVIDER=mock (local-only)', async () => {
    asMod();
    // Mock provider bypasses settings AND fetch entirely (for the compile call).
    // The confirm flow still reads openaiModel for the cost display, so allow that.
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'openaiModel' ? 'gpt-5.4-mini' : undefined));
    const prev = process.env.VIBE_MOD_AI_PROVIDER;
    process.env.VIBE_MOD_AI_PROVIDER = 'mock';
    try {
      const { saveBody } = await compileAndConfirm('flag brand-new accounts within 72h', false);
      expect(saveBody.showToast.appearance).toBe('success');
      expect(saveBody.showToast.text).toMatch(/Mock compiled rule/);
      expect(fakeFetch).not.toHaveBeenCalled();
    } finally {
      if (prev === undefined) delete process.env.VIBE_MOD_AI_PROVIDER;
      else process.env.VIBE_MOD_AI_PROVIDER = prev;
    }
  });
});
