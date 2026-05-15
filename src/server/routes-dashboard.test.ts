// src/server/routes-dashboard.test.ts
// Functional call-tests for the Dashboard feature.
//
// Phase 1.7b (audit Tier-2 #3 + #10): Dashboard is now read-only — per-rule
// activation moved to the dedicated "Manage rules" menu (see
// routes-manage.test.ts). The Dashboard form's submit only handles the
// optional onboarding-dismiss flag (Tier-3 #C).

import { describe, it, expect } from 'vitest';
import app from './index';
import { fakeRedis, fakeReddit, fakeListing } from '../../test/setup';
import { seedStarterRules } from '../shared/starter-rules';

const call = (path: string, body: unknown = {}) =>
  app.fetch(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

function asMod() {
  fakeReddit.getModerators.mockResolvedValue(fakeListing([{ username: 'caller' }]));
}

async function seedAudit(actionId: string, fields: Record<string, string>, score = Date.now()) {
  await fakeRedis.zAdd('testsub:audit', { member: actionId, score });
  await fakeRedis.hSet(`testsub:audit:${actionId}`, fields);
}

// Helper: concatenate every visible label + paragraph value + helpText
// the dashboard form renders, so the assertions still work against the
// Phase 2c/2d multi-block layout (was: one big string in `description`,
// then defaultValue blocks, now: helpText body — see dashboard.ts header
// for the rationale).
function dashTexts(body: any): string {
  return [
    body.showForm.form.description ?? '',
    ...body.showForm.form.fields.map(
      (f: { label?: string; defaultValue?: unknown; helpText?: string }) =>
        `${f.label ?? ''}\n${String(f.defaultValue ?? '')}\n${f.helpText ?? ''}`,
    ),
  ].join('\n');
}

describe('POST /internal/menu/dashboard', () => {
  it('rejects a non-moderator', async () => {
    const body = await (
      await call('/internal/menu/dashboard', { location: 'subreddit', targetId: 't5_testsub' })
    ).json();
    expect(body.showToast).toEqual({ text: 'Only moderators can use this.', appearance: 'neutral' });
  });

  it('renders an empty dashboard for a fresh install', async () => {
    asMod();
    const body = await (
      await call('/internal/menu/dashboard', { location: 'subreddit', targetId: 't5_testsub' })
    ).json();
    expect(body.showForm.name).toBe('dashboardForm');
    const text = dashTexts(body);
    expect(text).toContain('Active rules: 0');
    expect(text).toContain('Draft rules: 0');
    expect(body.showForm.form.acceptLabel).toBe('Close');
  });

  it('summarises active + draft counts, recent actions, and lifetime token cost (Tier-2 #D)', async () => {
    asMod();
    await fakeRedis.set(
      'testsub:rules:active',
      JSON.stringify({
        ...seedStarterRules(1),
        rules: seedStarterRules(1).rules.slice(0, 2),
        llmTokensIn: 1000,
        llmTokensOut: 200,
        llmModel: 'gpt-5.4-mini',
      }),
    );
    await fakeRedis.set(
      'testsub:rules:draft',
      JSON.stringify({ ...seedStarterRules(2), llmTokensIn: 500, llmTokensOut: 100 }),
    );
    await seedAudit(
      'a_1',
      { action: 'modqueue', outcome: 'applied', ruleSourceNL: 'flag low karma posts', thingId: 't3_x' },
      1000,
    );
    await seedAudit(
      'a_2',
      { action: 'remove', outcome: 'shadow', ruleSourceNL: 'remove discord links', thingId: 't3_y' },
      2000,
    );

    const body = await (
      await call('/internal/menu/dashboard', { location: 'subreddit', targetId: 't5_testsub' })
    ).json();
    const text = dashTexts(body);
    expect(text).toContain('Active rules: 2');
    // Draft fixture uses full seedStarterRules() — count tracks STARTER_RULE_SEEDS.length.
    expect(text).toContain('Draft rules: 6');
    expect(text).toContain('Recent actions: 2');
    expect(text).toContain('modqueue (applied)');
    expect(text).toContain('remove (shadow)');
    expect(text).toMatch(/1,500 in \/ 300 out/);
    // Dashboard no longer triggers activation — that moved to Manage rules.
    expect(body.showForm.form.acceptLabel).toBe('Close');
  });

  it('shows the dry-run preview for draft rules that have a stored result', async () => {
    asMod();
    await fakeRedis.set('testsub:rules:draft', JSON.stringify(seedStarterRules(7)));
    await fakeRedis.set(
      'testsub:dryrun:r_new_account_fast_post',
      JSON.stringify({
        ruleId: 'r_new_account_fast_post',
        ruleSourceNL: '…',
        ranAt: Date.now(),
        status: 'ok',
        sampledPosts: 10,
        matched: [{ thingId: 't3_x', thingType: 'post', authorName: 'newbie', would: ['modqueue'] }],
      }),
    );
    await fakeRedis.set(
      'testsub:dryrun:r_wall_of_caps_comment',
      JSON.stringify({
        ruleId: 'r_wall_of_caps_comment',
        ruleSourceNL: '…',
        ranAt: Date.now(),
        status: 'unavailable',
        note: 'comment events; shadow mode it',
        sampledPosts: 0,
        matched: [],
      }),
    );

    const body = await (
      await call('/internal/menu/dashboard', { location: 'subreddit', targetId: 't5_testsub' })
    ).json();
    const text = dashTexts(body);
    // Phase 2d: dry-run preview is now per-rule (one field per rule)
    // instead of a single textarea. Each rule's helpText carries the
    // "would match X/Y → action" line. The rule id is the label.
    expect(text).toContain('would match 1/10 recent post(s) → modqueue');
    expect(text).toContain('comment events; shadow mode it');
  });
});

// Phase 1.7b — dashboard is now read-only (audit Tier-2 #3 + #10).
// The "Activate draft" flow lives in the new Manage rules menu now
// (covered by routes-manage.test.ts in this same PR).
describe('POST /internal/form/dashboard-action (read-only dashboard, Phase 1.7b)', () => {
  it('rejects a non-moderator', async () => {
    const body = await (await call('/internal/form/dashboard-action', { dismissOnboarding: true })).json();
    expect(body.showToast).toEqual({ text: 'Only moderators can use this.', appearance: 'neutral' });
  });

  it('returns "Closed." when no flag is set', async () => {
    asMod();
    const body = await (await call('/internal/form/dashboard-action', {})).json();
    expect(body.showToast).toBe('Closed.');
  });

  it('persists the onboarding-dismissed flag when ticked (Tier-3 #C)', async () => {
    asMod();
    const body = await (await call('/internal/form/dashboard-action', { dismissOnboarding: true })).json();
    expect(body.showToast).toBe('Welcome intro dismissed.');
    expect(await fakeRedis.get('testsub:onboarding:dismissed')).toBe('1');
  });
});

describe('Dashboard onboarding + empty state (Phase 1.7b Tier-3 #C, Tier-2 #A)', () => {
  it('shows the welcome card on first visit (no Redis flag)', async () => {
    asMod();
    const body = await (
      await call('/internal/menu/dashboard', { location: 'subreddit', targetId: 't5_testsub' })
    ).json();
    const text = dashTexts(body);
    expect(text).toContain('Welcome to vibe-mod');
    expect(text).toContain('3 quick steps');
    const fieldNames = body.showForm.form.fields.map((f: { name: string }) => f.name);
    expect(fieldNames).toContain('dismissOnboarding');
  });

  it('hides the welcome card once dismissed', async () => {
    asMod();
    await fakeRedis.set('testsub:onboarding:dismissed', '1');
    const body = await (
      await call('/internal/menu/dashboard', { location: 'subreddit', targetId: 't5_testsub' })
    ).json();
    const text = dashTexts(body);
    expect(text).not.toContain('Welcome to vibe-mod');
    // No `dismissOnboarding` toggle once the user has already dismissed it.
    const fieldNames = body.showForm.form.fields.map((f: { name: string }) => f.name);
    expect(fieldNames).not.toContain('dismissOnboarding');
  });

  it('emits a clear empty state when there are zero rules and zero recent actions (Tier-2 #A)', async () => {
    asMod();
    await fakeRedis.set('testsub:onboarding:dismissed', '1');
    const body = await (
      await call('/internal/menu/dashboard', { location: 'subreddit', targetId: 't5_testsub' })
    ).json();
    const text = dashTexts(body);
    expect(text).toContain('No rules yet');
    expect(text).toContain('vibe-mod: Compose rule');
  });
});
