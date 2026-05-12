// src/server/executor.devvit.test.ts
// Uses the OFFICIAL `@devvit/test` harness (`createDevvitTest()`) — a miniature
// Devvit backend per test (real-ish Redis with watch/multi/exec transactions,
// built-in isolation). This complements the hand-rolled `devvit-testkit.ts`
// suite and is the recommended pattern going forward. Run: `npm run test:devvit`.
//
// `@devvit/test` mocks Redis/Scheduler/Settings/context fully; the Reddit API is
// only partially mocked, so the few Reddit calls in the executor are still spied.

import { createDevvitTest } from '@devvit/test/server/vitest';
import { expect, vi } from 'vitest';
import { redis, reddit } from '@devvit/web/server';
import { executeActions, rollbackAction, type ExecutionContext } from './executor';
import type { RuleType } from '../shared/rule-schema';

const test = createDevvitTest({ subredditName: 'testsub', subredditId: 't5_testsub' });

const removeRule: RuleType = {
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
} as RuleType;

const ctx = (over: Partial<ExecutionContext> = {}): ExecutionContext => ({
  rule: removeRule,
  thingId: 't3_post1',
  thingType: 'post',
  authorName: 'spammer',
  authorId: 't2_spammer',
  isDryRun: false,
  isShadowMode: false,
  ...over,
});

test('executeActions removes a post and persists audit + rollback through the real Redis (transactions)', async () => {
  const post = { remove: vi.fn(), removed: false };
  vi.spyOn(reddit, 'getPostById').mockResolvedValue(post as never);

  const audits = await executeActions(ctx());
  expect(audits[0].outcome).toBe('applied');
  expect(post.remove).toHaveBeenCalledWith(false);

  const id = audits[0].actionId;
  const rb = JSON.parse((await redis.get(`testsub:rollback:${id}`))!);
  expect(rb.entry.thingId).toBe('t3_post1');
  const z = await redis.zRange('testsub:audit', 0, -1, { by: 'rank' });
  expect(z.map((e) => e.member)).toContain(id);
});

test('rollbackAction approves a removed post and consumes the rollback token', async () => {
  const post = { remove: vi.fn(), approve: vi.fn(), removed: false };
  vi.spyOn(reddit, 'getPostById').mockResolvedValue(post as never);

  const id = (await executeActions(ctx()))[0].actionId;
  const res = await rollbackAction('testsub', id);
  expect(res.ok).toBe(true);
  expect(post.approve).toHaveBeenCalled();
  expect(await redis.get(`testsub:rollback:${id}`)).toBeUndefined();
});

test('per-author rate limit is atomic (second hit within the window is rate_limited)', async () => {
  vi.spyOn(reddit, 'getPostById').mockResolvedValue({ remove: vi.fn(), removed: false } as never);
  const rl: RuleType = { ...removeRule, rateLimit: { perAuthor: '1/hour' } } as RuleType;
  expect((await executeActions(ctx({ rule: rl })))[0].outcome).toBe('applied');
  expect((await executeActions(ctx({ rule: rl })))[0].outcome).toBe('rate_limited');
});
