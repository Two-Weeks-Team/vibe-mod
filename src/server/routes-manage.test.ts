// src/server/routes-manage.test.ts
// Functional call-tests for the Manage rules feature (Phase 1.7b, audit
// findings #3 + #10): per-rule control surface for activating, promoting,
// pausing, and deleting rules. Replaces the previous bulk-activate flow
// that lived on the Dashboard form.
//
// Flow:
//   /internal/menu/manage-rules     → renders one group per rule with a select
//   /internal/form/manage-rules-submit → applies non-destructive actions OR
//                                        forwards deletes to the confirm form
//   /internal/form/manage-delete-confirm → applies once explicitly confirmed

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

describe('POST /internal/menu/manage-rules', () => {
  it('rejects a non-moderator', async () => {
    const body = await (
      await call('/internal/menu/manage-rules', { location: 'subreddit', targetId: 't5_testsub' })
    ).json();
    expect(body.showToast).toEqual({ text: 'Only moderators can use this.', appearance: 'neutral' });
  });

  it('shows an empty-state toast when there are no rules at all', async () => {
    asMod();
    const body = await (
      await call('/internal/menu/manage-rules', { location: 'subreddit', targetId: 't5_testsub' })
    ).json();
    expect(body.showToast.text).toMatch(/No rules yet/);
    expect(body.showToast.text).toContain('vibe-mod: Compose rule');
  });

  it('renders one group per draft rule with the expected action options', async () => {
    asMod();
    const seeded = seedStarterRules(123);
    await fakeRedis.set('testsub:rules:draft', JSON.stringify(seeded));

    const body = await (
      await call('/internal/menu/manage-rules', { location: 'subreddit', targetId: 't5_testsub' })
    ).json();
    expect(body.showForm.name).toBe('manageRulesForm');
    const groups = body.showForm.form.fields.filter((f: { type: string }) => f.type === 'group');
    expect(groups.length).toBe(seeded.rules.length);
    const firstGroup = groups[0];
    const actionField = firstGroup.fields.find((f: { name: string }) => f.name.startsWith('action_')) as {
      options: Array<{ value: string }>;
    };
    expect(actionField.options.map((o) => o.value)).toEqual(['keep', 'activate-shadow', 'activate-now', 'delete']);
  });

  it('renders a "Promote shadow → live" option only for shadow active rules', async () => {
    asMod();
    const liveRule = {
      ...seedStarterRules(1).rules[0],
      activatedAt: 1,
      shadow: false,
    };
    const shadowRule = {
      ...seedStarterRules(2).rules[1],
      activatedAt: 1,
      shadow: true,
    };
    await fakeRedis.set(
      'testsub:rules:active',
      JSON.stringify({ ...seedStarterRules(1), rules: [liveRule, shadowRule] }),
    );

    const body = await (
      await call('/internal/menu/manage-rules', { location: 'subreddit', targetId: 't5_testsub' })
    ).json();
    const groups = body.showForm.form.fields as Array<{
      type: string;
      label: string;
      fields: Array<{ name: string; options?: Array<{ value: string }> }>;
    }>;
    const liveGroup = groups.find((g) => g.label.startsWith('✅ Live'))!;
    const liveActions = liveGroup.fields.find((f) => f.name.startsWith('action_'))!.options!.map((o) => o.value);
    expect(liveActions).toEqual(['keep', 'pause', 'delete']); // no `promote` for already-live
    const shadowGroup = groups.find((g) => g.label.startsWith('👻 Shadow'))!;
    const shadowActions = shadowGroup.fields.find((f) => f.name.startsWith('action_'))!.options!.map((o) => o.value);
    expect(shadowActions).toContain('promote');
  });
});

describe('POST /internal/form/manage-rules-submit', () => {
  it('rejects a non-moderator', async () => {
    const body = await (await call('/internal/form/manage-rules-submit', {})).json();
    expect(body.showToast).toEqual({ text: 'Only moderators can use this.', appearance: 'neutral' });
  });

  it('says "No changes selected" when every action is "keep"', async () => {
    asMod();
    const body = await (
      await call('/internal/form/manage-rules-submit', {
        action_r_a: ['keep'],
        action_r_b: ['keep'],
      })
    ).json();
    expect(body.showToast).toBe('No changes selected.');
  });

  it('applies activate-shadow: moves a draft to active with shadow=true and stamps activatedAt', async () => {
    asMod();
    const seeded = seedStarterRules(100);
    await fakeRedis.set('testsub:rules:draft', JSON.stringify(seeded));
    const targetId = seeded.rules[0].id;

    const body = await (
      await call('/internal/form/manage-rules-submit', {
        [`action_${targetId}`]: ['activate-shadow'],
      })
    ).json();
    expect(body.showToast.appearance).toBe('success');
    expect(body.showToast.text).toMatch(/activated 1/);

    const draft = JSON.parse((await fakeRedis.get('testsub:rules:draft'))!);
    const active = JSON.parse((await fakeRedis.get('testsub:rules:active'))!);
    expect(draft.rules.map((r: { id: string }) => r.id)).not.toContain(targetId);
    const moved = active.rules.find((r: { id: string }) => r.id === targetId);
    expect(moved).toBeDefined();
    expect(moved.shadow).toBe(true);
    expect(typeof moved.activatedAt).toBe('number');
  });

  it('applies activate-now: shadow=false, immediately live', async () => {
    asMod();
    const seeded = seedStarterRules(101);
    await fakeRedis.set('testsub:rules:draft', JSON.stringify(seeded));
    const targetId = seeded.rules[0].id;

    await call('/internal/form/manage-rules-submit', { [`action_${targetId}`]: ['activate-now'] });

    const active = JSON.parse((await fakeRedis.get('testsub:rules:active'))!);
    const moved = active.rules.find((r: { id: string }) => r.id === targetId);
    expect(moved.shadow).toBe(false);
  });

  it('applies promote: shadow active → live, no movement between bundles', async () => {
    asMod();
    const seeded = seedStarterRules(102).rules[0];
    await fakeRedis.set(
      'testsub:rules:active',
      JSON.stringify({ ...seedStarterRules(102), rules: [{ ...seeded, shadow: true, activatedAt: 1 }] }),
    );
    await call('/internal/form/manage-rules-submit', { [`action_${seeded.id}`]: ['promote'] });
    const active = JSON.parse((await fakeRedis.get('testsub:rules:active'))!);
    expect(active.rules[0].shadow).toBe(false);
  });

  it('applies pause: live active → draft (shadow=true)', async () => {
    asMod();
    const seeded = seedStarterRules(103).rules[0];
    await fakeRedis.set(
      'testsub:rules:active',
      JSON.stringify({ ...seedStarterRules(103), rules: [{ ...seeded, shadow: false, activatedAt: 1 }] }),
    );
    await call('/internal/form/manage-rules-submit', { [`action_${seeded.id}`]: ['pause'] });
    const active = JSON.parse((await fakeRedis.get('testsub:rules:active'))!);
    const draft = JSON.parse((await fakeRedis.get('testsub:rules:draft'))!);
    expect(active.rules.find((r: { id: string }) => r.id === seeded.id)).toBeUndefined();
    const movedBack = draft.rules.find((r: { id: string }) => r.id === seeded.id);
    expect(movedBack.shadow).toBe(true);
  });

  it('forwards delete actions to the confirm form (audit Tier-2 #B)', async () => {
    asMod();
    const seeded = seedStarterRules(104);
    await fakeRedis.set('testsub:rules:draft', JSON.stringify(seeded));
    const targetA = seeded.rules[0].id;
    const targetB = seeded.rules[1].id;
    const body = await (
      await call('/internal/form/manage-rules-submit', {
        [`action_${targetA}`]: ['delete'],
        [`action_${targetB}`]: ['delete'],
        [`action_${seeded.rules[2].id}`]: ['keep'],
      })
    ).json();
    expect(body.showForm.name).toBe('manageDeleteConfirmForm');
    expect(body.showForm.form.title).toBe('Delete 2 rule(s)?');
    // Pending action map must round-trip exactly to the confirm endpoint.
    const pending = body.showForm.form.fields.find((f: { name: string }) => f.name === 'pendingActions');
    const parsed = JSON.parse(pending.defaultValue);
    expect(parsed).toEqual({ [targetA]: 'delete', [targetB]: 'delete' });
  });
});

describe('POST /internal/form/manage-delete-confirm', () => {
  it('cancels when confirm is unchecked', async () => {
    asMod();
    const body = await (
      await call('/internal/form/manage-delete-confirm', {
        confirmed: false,
        pendingActions: '{"r_x":"delete"}',
      })
    ).json();
    expect(body.showToast).toBe('Delete cancelled. No rules were removed.');
  });

  it('deletes from both bundles when confirmed', async () => {
    asMod();
    const seeded = seedStarterRules(200);
    await fakeRedis.set('testsub:rules:draft', JSON.stringify(seeded));
    const targetA = seeded.rules[0].id;
    const body = await (
      await call('/internal/form/manage-delete-confirm', {
        confirmed: true,
        pendingActions: JSON.stringify({ [targetA]: 'delete' }),
      })
    ).json();
    expect(body.showToast.appearance).toBe('success');
    expect(body.showToast.text).toMatch(/deleted 1/);
    const draft = JSON.parse((await fakeRedis.get('testsub:rules:draft'))!);
    expect(draft.rules.find((r: { id: string }) => r.id === targetA)).toBeUndefined();
  });

  it('returns a friendly error when the carried action map is malformed', async () => {
    asMod();
    const body = await (
      await call('/internal/form/manage-delete-confirm', {
        confirmed: true,
        pendingActions: '{not json}',
      })
    ).json();
    expect(body.showToast.appearance).toBe('neutral');
    expect(body.showToast.text).toMatch(/Could not parse/);
  });
});
