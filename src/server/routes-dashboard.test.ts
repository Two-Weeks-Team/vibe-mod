// src/server/routes-dashboard.test.ts
// Functional call-tests for the Dashboard feature: the menu that renders the
// rules + recent-actions summary, and the form action that promotes a draft
// bundle to active.

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
    expect(body.showForm.form.description).toContain('Active rules: 0');
    expect(body.showForm.form.description).toContain('Draft rules: 0');
    expect(body.showForm.form.acceptLabel).toBe('Close');
  });

  it('summarises active + draft counts and recent actions, with an Activate label when a draft exists', async () => {
    asMod();
    await fakeRedis.set(
      'testsub:rules:active',
      JSON.stringify({ ...seedStarterRules(1), rules: seedStarterRules(1).rules.slice(0, 2) }),
    );
    await fakeRedis.set('testsub:rules:draft', JSON.stringify(seedStarterRules(2)));
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
    expect(body.showForm.form.description).toContain('Active rules: 2');
    expect(body.showForm.form.description).toContain('Draft rules: 5');
    expect(body.showForm.form.description).toContain('Recent actions: 2');
    expect(body.showForm.form.description).toContain('modqueue (applied)');
    expect(body.showForm.form.description).toContain('remove (shadow)');
    expect(body.showForm.form.acceptLabel).toBe('Activate 5 draft rule(s)');
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
    expect(body.showForm.form.description).toContain('Dry-run preview (draft rules):');
    expect(body.showForm.form.description).toContain(
      'r_new_account_fast_post: would match 1/10 recent post(s) → modqueue',
    );
    expect(body.showForm.form.description).toContain('r_wall_of_caps_comment: comment events; shadow mode it');
  });
});

describe('POST /internal/form/dashboard-action', () => {
  it('rejects a non-moderator', async () => {
    const body = await (await call('/internal/form/dashboard-action', { activate: true })).json();
    expect(body.showToast).toEqual({ text: 'Only moderators can use this.', appearance: 'neutral' });
  });

  it('does nothing when the activate checkbox is off', async () => {
    asMod();
    const body = await (await call('/internal/form/dashboard-action', { activate: false })).json();
    expect(body.showToast).toBe('No action taken.');
  });

  it('reports when there is no draft to activate', async () => {
    asMod();
    const body = await (await call('/internal/form/dashboard-action', { activate: true })).json();
    expect(body.showToast).toBe('No draft to activate.');
  });

  it('promotes the draft bundle to active and stamps activatedAt on each rule', async () => {
    asMod();
    const seeded = seedStarterRules(123);
    await fakeRedis.set('testsub:rules:draft', JSON.stringify(seeded));

    const body = await (await call('/internal/form/dashboard-action', { activate: true })).json();
    expect(body.showToast.appearance).toBe('success');
    expect(body.showToast.text).toMatch(/Shadow mode is ON/i);

    const active = JSON.parse((await fakeRedis.get('testsub:rules:active')) ?? '{}') as {
      rules: Array<{ id: string; activatedAt?: number }>;
    };
    expect(active.rules.map((r) => r.id)).toEqual(seeded.rules.map((r) => r.id));
    for (const r of active.rules) expect(typeof r.activatedAt).toBe('number');
  });
});
