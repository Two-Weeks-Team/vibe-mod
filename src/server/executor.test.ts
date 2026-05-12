// src/server/executor.test.ts
// Action execution, audit trail, rollback, and the circuit breakers.
// Devvit SDK is mocked via ../../test/setup.ts.

import { describe, it, expect, vi } from 'vitest';
import { fakeRedis, fakeReddit, fakeSettings } from '../../test/setup';
import { executeActions, rollbackAction, type ExecutionContext } from './executor';
import type { RuleType } from '../shared/rule-schema';

function rule(over: Partial<RuleType> = {}): RuleType {
  return {
    id: 'r_demo',
    name: 'demo',
    sourceNL: 'remove low-effort posts',
    on: ['onPostSubmit'],
    when: { fact: 'content.length', op: 'lt', value: 10 },
    then: [{ action: 'remove', params: { spam: false } }],
    enabled: true,
    shadow: false,
    createdAt: 0,
    createdBy: 't2_x',
    ...over,
  } as RuleType;
}

function ctx(over: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    rule: rule(),
    thingId: 't3_post1',
    thingType: 'post',
    authorName: 'spammer',
    authorId: 't2_spammer',
    isDryRun: false,
    isShadowMode: false,
    ...over,
  };
}

describe('executeActions — short-circuit paths', () => {
  it('records "shadow" and does not call Reddit when the rule is in shadow mode', async () => {
    const post = { remove: vi.fn() };
    fakeReddit.getPostById.mockResolvedValue(post);

    const audits = await executeActions(ctx({ isShadowMode: true }));

    expect(audits).toHaveLength(1);
    expect(audits[0].outcome).toBe('shadow');
    expect(post.remove).not.toHaveBeenCalled();
  });

  it('treats dryRunOnly setting as global shadow', async () => {
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'dryRunOnly' ? true : undefined));
    const audits = await executeActions(ctx());
    expect(audits[0].outcome).toBe('shadow');
  });

  it('returns rate_limited for every action when the beta freeze kill switch is set', async () => {
    await fakeRedis.set('circuit:beta_freeze', '1');
    const audits = await executeActions(ctx({ rule: rule({ then: [{ action: 'lock', params: {} }, { action: 'remove', params: { spam: false } }] }) }));
    expect(audits.map((a) => a.outcome)).toEqual(['rate_limited', 'rate_limited']);
  });

  it('returns rate_limited when the per-sub breaker is open', async () => {
    await fakeRedis.set('testsub:circuit:open', '1');
    const audits = await executeActions(ctx());
    expect(audits[0].outcome).toBe('rate_limited');
  });

  it('honours per-author rate limit and is atomic on the second hit', async () => {
    const post = { remove: vi.fn(), removed: false };
    fakeReddit.getPostById.mockResolvedValue(post);
    const r = rule({ rateLimit: { perAuthor: '1/hour' } });

    const first = await executeActions(ctx({ rule: r }));
    expect(first[0].outcome).toBe('applied');

    const second = await executeActions(ctx({ rule: r }));
    expect(second[0].outcome).toBe('rate_limited');
    expect(post.remove).toHaveBeenCalledTimes(1);
  });
});

describe('executeActions — guarded verbs', () => {
  it('skips ban/mute/permaban silently when not in shadow mode (v0.1 never auto-fires)', async () => {
    const r = rule({ then: [{ action: 'ban', params: { reason: 'spam' } }] });
    const audits = await executeActions(ctx({ rule: r }));
    expect(audits[0].outcome).toBe('guarded_skip');
    expect(fakeReddit.banUser).not.toHaveBeenCalled();
  });
});

describe('executeActions — applied path + audit/rollback', () => {
  it('removes a post, writes an audit hash + a rollback token', async () => {
    const post = { remove: vi.fn(), removed: false };
    fakeReddit.getPostById.mockResolvedValue(post);

    const audits = await executeActions(ctx());
    expect(audits[0].outcome).toBe('applied');
    expect(post.remove).toHaveBeenCalledWith(false);

    const id = audits[0].actionId;
    expect(id).toMatch(/^a_\d+_[0-9a-f]{18}$/);
    const hash = await fakeRedis.hGetAll(`testsub:audit:${id}`);
    expect(hash.action).toBe('remove');
    expect(hash.outcome).toBe('applied');
    expect(JSON.parse((await fakeRedis.get(`testsub:rollback:${id}`))!).entry.thingId).toBe('t3_post1');

    const z = await fakeRedis.zRange('testsub:audit', 0, -1);
    expect(z.map((e) => e.member)).toContain(id);
  });

  it('does not double-remove an already-removed post', async () => {
    const post = { remove: vi.fn(), removed: true };
    fakeReddit.getPostById.mockResolvedValue(post);
    const audits = await executeActions(ctx());
    expect(audits[0].outcome).toBe('applied');
    expect(post.remove).not.toHaveBeenCalled();
  });

  it('captures the previous flair when setting a new one', async () => {
    fakeReddit.getPostById.mockResolvedValue({ flair: { text: 'OLD' } });
    const r = rule({ then: [{ action: 'flair', params: { flairText: 'NEW' } }] });
    const audits = await executeActions(ctx({ rule: r }));
    expect(fakeReddit.setPostFlair).toHaveBeenCalledWith(expect.objectContaining({ postId: 't3_post1', text: 'NEW', subredditName: 'testsub' }));
    const rb = JSON.parse((await fakeRedis.get(`testsub:rollback:${audits[0].actionId}`))!);
    expect(rb.reverseParams.prevFlair).toBe('OLD');
  });

  it('records "error" (not throw) when the Reddit call fails', async () => {
    fakeReddit.getPostById.mockRejectedValue(new Error('reddit 503'));
    const audits = await executeActions(ctx());
    expect(audits[0].outcome).toBe('error');
    expect(audits[0].errorMessage).toContain('503');
  });

  it('uses a fresh crypto-random action id per call', async () => {
    fakeReddit.getPostById.mockResolvedValue({ remove: vi.fn(), removed: false });
    const a = (await executeActions(ctx()))[0].actionId;
    const b = (await executeActions(ctx()))[0].actionId;
    expect(a).not.toBe(b);
  });
});

describe('rollbackAction', () => {
  it('fails cleanly when the rollback token is gone', async () => {
    const res = await rollbackAction('testsub', 'a_does_not_exist');
    expect(res).toEqual({ ok: false, reason: expect.stringMatching(/expired|never existed/i) });
  });

  it('approves a removed post and consumes the token', async () => {
    const post = { remove: vi.fn(), approve: vi.fn(), removed: false };
    fakeReddit.getPostById.mockResolvedValue(post);
    const audits = await executeActions(ctx());
    const id = audits[0].actionId;

    const res = await rollbackAction("testsub", id);
    expect(res.ok).toBe(true);
    expect(post.approve).toHaveBeenCalled();
    expect(await fakeRedis.get(`testsub:rollback:${id}`)).toBeUndefined();
    expect((await fakeRedis.hGetAll(`testsub:audit:${id}`)).rolledBack).toBe('1');
  });

  it('unlocks a locked comment on rollback', async () => {
    const comment = { lock: vi.fn(), unlock: vi.fn() };
    fakeReddit.getCommentById.mockResolvedValue(comment);
    const r = rule({ then: [{ action: 'lock', params: {} }] });
    const audits = await executeActions(ctx({ rule: r, thingId: 't1_c1', thingType: 'comment' }));
    const res = await rollbackAction("testsub", audits[0].actionId);
    expect(res.ok).toBe(true);
    expect(comment.unlock).toHaveBeenCalled();
  });

  it('refuses to roll back an irreversible action (report)', async () => {
    const post = { report: vi.fn() };
    fakeReddit.getPostById.mockResolvedValue(post);
    const r = rule({ then: [{ action: 'report', params: { reason: 'spam' } }] });
    const audits = await executeActions(ctx({ rule: r }));
    const res = await rollbackAction("testsub", audits[0].actionId);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/not reversible/i);
  });

  it('returns an error result if the un-action call throws', async () => {
    const post = { remove: vi.fn(), approve: vi.fn().mockRejectedValue(new Error('boom')), removed: false };
    fakeReddit.getPostById.mockResolvedValue(post);
    const audits = await executeActions(ctx());
    const res = await rollbackAction("testsub", audits[0].actionId);
    expect(res).toEqual({ ok: false, reason: expect.stringContaining('boom') });
  });
});
