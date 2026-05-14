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

  it('blocks compile when the daily quota is exhausted and no BYOK key is set', async () => {
    asMod();
    const today = new Date().toISOString().slice(0, 10);
    await fakeRedis.set(`testsub:compile:count:${today}`, '50');
    const body = await (
      await call('/internal/form/compose-rule-submit', { rule: 'flag low karma', allowGuarded: false })
    ).json();
    expect(body.showToast.text).toContain('Compile quota reached');
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it('bypasses the quota when a subreddit BYOK key is configured', async () => {
    asMod();
    const today = new Date().toISOString().slice(0, 10);
    await fakeRedis.set(`testsub:compile:count:${today}`, '50');
    fakeSettings.get.mockImplementation(async (k: string) =>
      k === 'subredditOpenaiApiKey' ? 'sk-byok' : k === 'openaiApiKey' ? 'sk-dev' : undefined,
    );
    fakeFetch.mockResolvedValue(openaiResponse(VALID_COMPILED));

    const body = await (
      await call('/internal/form/compose-rule-submit', { rule: VALID_COMPILED.sourceNL, allowGuarded: false })
    ).json();
    expect(body.showToast.appearance).toBe('success');
    // BYOK → counter not incremented
    expect(await fakeRedis.get(`testsub:compile:count:${today}`)).toBe('50');
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
    expect(body.showForm.form.description).toBe('What counts as low karma?');
    const fieldNames = body.showForm.form.fields.map((f: { name: string }) => f.name);
    expect(fieldNames).toContain('clarificationAnswer');
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

  // ── Phase 1.6 (audit finding #6): success toast carries rule summary + menu hint ──
  it('success toast includes a 1-line rule summary and the View-rules menu hint', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'openaiApiKey' ? 'sk-dev' : undefined));
    fakeFetch.mockResolvedValue(openaiResponse(VALID_COMPILED));
    const body = await (
      await call('/internal/form/compose-rule-submit', { rule: VALID_COMPILED.sourceNL, allowGuarded: false })
    ).json();
    expect(body.showToast.appearance).toBe('success');
    // 1-line summary like "→ post: modqueue"
    expect(body.showToast.text).toMatch(/→\s*post[\w+]*:\s*modqueue/);
    // Explicit menu pointer (Devvit toasts have no buttons → text path required)
    expect(body.showToast.text).toContain('vibe-mod: View rules + log');
  });

  it('compiles a valid rule → stores a draft, bumps the counter, schedules the dry-run', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) =>
      k === 'openaiApiKey' ? 'sk-dev' : k === 'openaiModel' ? 'gpt-5.4-nano' : undefined,
    );
    fakeFetch.mockResolvedValue(openaiResponse(VALID_COMPILED));

    const res = await call('/internal/form/compose-rule-submit', {
      rule: VALID_COMPILED.sourceNL,
      allowGuarded: false,
    });
    const body = await res.json();
    expect(body.showToast.appearance).toBe('success');
    expect(body.showToast.text).toContain('Flag low-karma posts');

    const draft = JSON.parse((await fakeRedis.get('testsub:rules:draft'))!);
    expect(draft.rules).toHaveLength(1);
    expect(draft.rules[0].id).toBe('r_low_karma_flag');
    expect(draft.rules[0].shadow).toBe(true); // always seeded in shadow
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
    await call('/internal/form/compose-rule-submit', { rule: VALID_COMPILED.sourceNL, allowGuarded: false });
    fakeFetch.mockResolvedValue(openaiResponse({ ...VALID_COMPILED, name: 'Flag low-karma posts (v2)' }));
    await call('/internal/form/compose-rule-submit', { rule: VALID_COMPILED.sourceNL, allowGuarded: false });

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

    const blocked = await (
      await call('/internal/form/compose-rule-submit', { rule: 'ban repeat spammers', allowGuarded: false })
    ).json();
    expect(blocked.showToast.text).toMatch(/ban\/mute/i);
    expect(await fakeRedis.get('testsub:rules:draft')).toBeUndefined();

    fakeFetch.mockResolvedValue(openaiResponse(banRule));
    const allowed = await (
      await call('/internal/form/compose-rule-submit', { rule: 'ban repeat spammers', allowGuarded: true })
    ).json();
    expect(allowed.showToast.appearance).toBe('success');
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

  // Tests for user-direction patch set (BYOK / plugin-RPC / mock provider) —
  // verifies the resilient-fallback behaviour added when Devvit's plugin RPC
  // layer is unavailable in some runtimes.

  it('continues with the global key when subredditOpenaiApiKey lookup throws (optional BYOK)', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => {
      if (k === 'subredditOpenaiApiKey') throw new Error('undefined undefined: undefined');
      if (k === 'openaiApiKey') return 'sk-global';
      return undefined;
    });
    fakeFetch.mockResolvedValue(openaiResponse(VALID_COMPILED));

    const body = await (
      await call('/internal/form/compose-rule-submit', { rule: VALID_COMPILED.sourceNL, allowGuarded: false })
    ).json();
    expect(body.showToast.appearance).toBe('success');
    // confirm we DID call OpenAI (BYOK throw didn't fatal the flow)
    expect(fakeFetch).toHaveBeenCalled();
  });

  it('skips the global-key lookup when a sub BYOK key is configured', async () => {
    asMod();
    let globalLookups = 0;
    fakeSettings.get.mockImplementation(async (k: string) => {
      if (k === 'subredditOpenaiApiKey') return 'sk-sub-byok';
      if (k === 'openaiApiKey') {
        globalLookups++;
        return 'sk-should-not-be-called';
      }
      return undefined;
    });
    fakeFetch.mockResolvedValue(openaiResponse(VALID_COMPILED));

    await call('/internal/form/compose-rule-submit', { rule: VALID_COMPILED.sourceNL, allowGuarded: false });
    expect(globalLookups).toBe(0);
  });

  it('surfaces the plugin-RPC-unavailable toast when the global key lookup throws and no BYOK is set', async () => {
    asMod();
    fakeSettings.get.mockImplementation(async (k: string) => {
      if (k === 'subredditOpenaiApiKey') return '';
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
      if (k === 'subredditOpenaiApiKey') return '';
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
    // Mock provider bypasses settings AND fetch entirely.
    fakeSettings.get.mockImplementation(async () => {
      throw new Error('should not be called');
    });
    const prev = process.env.VIBE_MOD_AI_PROVIDER;
    process.env.VIBE_MOD_AI_PROVIDER = 'mock';
    try {
      const body = await (
        await call('/internal/form/compose-rule-submit', {
          rule: 'flag brand-new accounts within 72h',
          allowGuarded: false,
        })
      ).json();
      expect(body.showToast.appearance).toBe('success');
      expect(body.showToast.text).toMatch(/Mock compiled rule/);
      expect(fakeFetch).not.toHaveBeenCalled();
    } finally {
      if (prev === undefined) delete process.env.VIBE_MOD_AI_PROVIDER;
      else process.env.VIBE_MOD_AI_PROVIDER = prev;
    }
  });
});
