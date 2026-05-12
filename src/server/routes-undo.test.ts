// src/server/routes-undo.test.ts
// Functional call-tests for the "Undo this action" post/comment menu item.

import { describe, it, expect, vi } from 'vitest';
import app from './index';
import { fakeRedis, fakeReddit, fakeListing } from '../../test/setup';
import type { AuditEntry } from './executor';

const call = (path: string, body: unknown = {}) =>
  app.fetch(new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }));

function asMod() {
  fakeReddit.getModerators.mockResolvedValue(fakeListing([{ username: 'caller' }]));
}

/** Seed a `remove`-post audit entry + rollback token the way executor.writeAuditAndRollback would. */
async function seedRemoveAudit(actionId: string, thingId: string, opts: { rolledBack?: boolean; withToken?: boolean } = {}) {
  await fakeRedis.zAdd('testsub:audit', { member: actionId, score: Date.now() });
  await fakeRedis.hSet(`testsub:audit:${actionId}`, {
    action: 'remove', outcome: 'applied', thingId, thingType: 'post', authorName: 'spammer', ruleSourceNL: 'remove low effort',
    ...(opts.rolledBack ? { rolledBack: '1' } : {}),
  });
  if (opts.withToken !== false) {
    const entry: AuditEntry = { actionId, ruleId: 'r_x', ruleSourceNL: 'remove low effort', thingId, thingType: 'post', action: 'remove', params: {}, authorName: 'spammer', ts: Date.now(), outcome: 'applied' };
    await fakeRedis.set(`testsub:rollback:${actionId}`, JSON.stringify({ entry, reverseParams: { wasRemoved: false, action: 'remove' } }));
  }
}

describe('POST /internal/menu/undo-action', () => {
  it('rejects a non-moderator', async () => {
    const body = await (await call('/internal/menu/undo-action', { location: 'post', targetId: 't3_x' })).json();
    expect(body.showToast).toEqual({ text: 'Only moderators can use this.', appearance: 'neutral' });
  });

  it('reports when no target id is supplied', async () => {
    asMod();
    const body = await (await call('/internal/menu/undo-action', { location: 'post', targetId: '' })).json();
    expect(body.showToast).toBe('No target.');
  });

  it('reports when there is no vibe-mod action on this item', async () => {
    asMod();
    const body = await (await call('/internal/menu/undo-action', { location: 'post', targetId: 't3_never_touched' })).json();
    expect(body.showToast).toMatch(/No vibe-mod action found/i);
  });

  it('skips an audit entry that was already rolled back', async () => {
    asMod();
    await seedRemoveAudit('a_done', 't3_done', { rolledBack: true });
    const body = await (await call('/internal/menu/undo-action', { location: 'post', targetId: 't3_done' })).json();
    expect(body.showToast).toMatch(/No vibe-mod action found/i);
  });

  it('rolls back a removal: approves the post, consumes the token, marks the audit', async () => {
    asMod();
    const post = { approve: vi.fn() };
    fakeReddit.getPostById.mockResolvedValue(post);
    await seedRemoveAudit('a_undo', 't3_target');

    const body = await (await call('/internal/menu/undo-action', { location: 'post', targetId: 't3_target' })).json();
    expect(body.showToast).toEqual({ text: 'Rolled back.', appearance: 'success' });
    expect(post.approve).toHaveBeenCalled();
    expect(await fakeRedis.get('testsub:rollback:a_undo')).toBeUndefined();
    expect((await fakeRedis.hGetAll('testsub:audit:a_undo')).rolledBack).toBe('1');
  });

  it('surfaces a friendly failure when the rollback window has expired', async () => {
    asMod();
    await seedRemoveAudit('a_expired', 't3_expired', { withToken: false }); // audit hash exists, token gone
    const body = await (await call('/internal/menu/undo-action', { location: 'post', targetId: 't3_expired' })).json();
    expect(body.showToast.appearance).toBe('neutral');
    expect(body.showToast.text).toMatch(/Couldn't roll back/i);
  });
});
