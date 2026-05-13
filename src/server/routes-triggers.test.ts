// src/server/routes-triggers.test.ts
// Functional call-tests for the Devvit trigger endpoints: post/comment submit
// (the deterministic evaluation path — ZERO LLM calls), install/upgrade seeding,
// and the report stubs.

import { describe, it, expect } from 'vitest';
import app from './index';
import { fakeRedis, fakeReddit, fakeSettings, fakeScheduler } from '../../test/setup';
import { Rule, RuleBundle, type RuleType } from '../shared/rule-schema';
import { seedStarterRules } from '../shared/starter-rules';

const call = (path: string, body: unknown) =>
  app.fetch(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

/** A live (shadow:false) active bundle with one rule matching short content → modqueue.
 *  Keyed on `content.length` (not author karma) so it matches the test events
 *  regardless of the default author profile. */
function activeLowKarmaModqueueBundle() {
  const r: RuleType = Rule.parse({
    id: 'r_short_content_modqueue',
    name: 'short content → mod queue',
    sourceNL: 'send very short posts/comments to the mod queue',
    on: ['onPostSubmit', 'onCommentSubmit'],
    when: { fact: 'content.length', op: 'lt', value: 50 },
    then: [{ action: 'modqueue', params: { note: 'low-karma' } }],
    createdAt: 0,
    createdBy: 't2_seed',
    enabled: true,
    shadow: false,
  });
  return RuleBundle.parse({
    schemaVersion: '1.0.0',
    bundleVersion: 1,
    compiledAt: 0,
    llmModel: 'seed',
    llmTokensIn: 0,
    llmTokensOut: 0,
    rules: [r],
  });
}

const POST_EVENT = {
  type: 'PostSubmit',
  post: { id: 't3_p1', title: 'hello', selftext: 'a body', url: 'https://example.com/x' },
  author: { id: 't2_alice', name: 'alice' },
  subreddit: { subscribersCount: 100, nsfw: false },
};
const COMMENT_EVENT = {
  type: 'CommentSubmit',
  comment: { id: 't1_c1', body: 'a comment', parentId: 't3_p1' },
  author: { id: 't2_alice', name: 'alice' },
  subreddit: { subscribersCount: 100, nsfw: false },
};

describe('POST /internal/trigger/on-post-submit', () => {
  it('is a no-op when the payload is missing post/author', async () => {
    const res = await call('/internal/trigger/on-post-submit', { type: 'PostSubmit' });
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('is a no-op when no rules are active', async () => {
    const res = await call('/internal/trigger/on-post-submit', POST_EVENT);
    expect(await res.json()).toEqual({ status: 'ok' });
    expect(fakeReddit.report).not.toHaveBeenCalled();
  });

  it('evaluates active rules deterministically and acts when one matches (no LLM call)', async () => {
    await fakeRedis.set('testsub:rules:active', JSON.stringify(activeLowKarmaModqueueBundle()));
    fakeReddit.getPostById.mockResolvedValue({});

    await call('/internal/trigger/on-post-submit', POST_EVENT);
    expect(fakeReddit.report).toHaveBeenCalledWith({}, { reason: 'vibe-mod: low-karma' });
    expect((await fakeRedis.zRange('testsub:audit', 0, -1)).length).toBe(1);
  });

  it('deduplicates a re-delivered trigger for the same post (Gap #5 idempotency)', async () => {
    await fakeRedis.set('testsub:rules:active', JSON.stringify(activeLowKarmaModqueueBundle()));
    fakeReddit.getPostById.mockResolvedValue({});

    await call('/internal/trigger/on-post-submit', POST_EVENT);
    await call('/internal/trigger/on-post-submit', POST_EVENT);
    expect(fakeReddit.report).toHaveBeenCalledTimes(1);
  });

  it('does not act when dryRunOnly is set — only writes a shadow audit row', async () => {
    await fakeRedis.set('testsub:rules:active', JSON.stringify(activeLowKarmaModqueueBundle()));
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'dryRunOnly' ? true : undefined));

    await call('/internal/trigger/on-post-submit', POST_EVENT);
    expect(fakeReddit.report).not.toHaveBeenCalled();
    const ids = await fakeRedis.zRange('testsub:audit', 0, -1);
    expect(ids).toHaveLength(1);
    expect((await fakeRedis.hGetAll(`testsub:audit:${ids[0].member}`)).outcome).toBe('shadow');
    // shadow → no rollback token (nothing to undo)
    expect(await fakeRedis.get(`testsub:rollback:${ids[0].member}`)).toBeUndefined();
  });

  it('does not act when the matching rule is still in shadow mode', async () => {
    const shadowBundle = JSON.parse(JSON.stringify(activeLowKarmaModqueueBundle()));
    shadowBundle.rules[0].shadow = true;
    await fakeRedis.set('testsub:rules:active', JSON.stringify(shadowBundle));

    await call('/internal/trigger/on-post-submit', POST_EVENT);
    expect(fakeReddit.report).not.toHaveBeenCalled();
    const ids = await fakeRedis.zRange('testsub:audit', 0, -1);
    expect(ids).toHaveLength(1);
    expect((await fakeRedis.hGetAll(`testsub:audit:${ids[0].member}`)).outcome).toBe('shadow');
  });

  it('is a safe no-op when the persisted active bundle is malformed JSON (never 500s the trigger)', async () => {
    await fakeRedis.set('testsub:rules:active', '{ not valid json at all');
    const res = await call('/internal/trigger/on-post-submit', POST_EVENT);
    expect(await res.json()).toEqual({ status: 'ok' });
    expect(fakeReddit.report).not.toHaveBeenCalled();
  });

  it('is a safe no-op when the persisted active bundle fails schema validation', async () => {
    await fakeRedis.set('testsub:rules:active', JSON.stringify({ schemaVersion: '1.0.0', rules: [{ bogus: true }] }));
    const res = await call('/internal/trigger/on-post-submit', POST_EVENT);
    expect(await res.json()).toEqual({ status: 'ok' });
    expect(fakeReddit.report).not.toHaveBeenCalled();
  });
});

describe('POST /internal/trigger/on-comment-submit', () => {
  it('is a no-op without a comment/author', async () => {
    expect(await (await call('/internal/trigger/on-comment-submit', { type: 'CommentSubmit' })).json()).toEqual({
      status: 'ok',
    });
  });

  it('acts on a matching comment', async () => {
    await fakeRedis.set('testsub:rules:active', JSON.stringify(activeLowKarmaModqueueBundle()));
    fakeReddit.getCommentById.mockResolvedValue({});
    await call('/internal/trigger/on-comment-submit', COMMENT_EVENT);
    expect(fakeReddit.report).toHaveBeenCalledWith({}, { reason: 'vibe-mod: low-karma' });
  });
});

describe('POST /internal/trigger/on-app-install', () => {
  // The handler is bare-minimum — returns 200 immediately, NO body parse, NO
  // I/O, NO scheduler. Even a try/catch + scheduler.runJob() was enough to push
  // the first-request cold start over Devvit's install-trigger RPC deadline
  // (failed in production with "context canceled" on a 2 MB CJS bundle).
  // Seeding moved to a manual scheduler endpoint (`/internal/scheduler/seed-on-install`)
  // for explicit invocation post-install.
  it('returns ok immediately with no side effects (no Redis writes, no scheduler call)', async () => {
    const res = await call('/internal/trigger/on-app-install', { type: 'AppInstall' });
    expect(await res.json()).toEqual({ status: 'ok' });
    expect(fakeScheduler.runJob).not.toHaveBeenCalled();
    expect(await fakeRedis.get('testsub:rules:active')).toBeUndefined();
    expect(await fakeRedis.get('testsub:rules:draft')).toBeUndefined();
  });
});

describe('POST /internal/scheduler/seed-on-install', () => {
  it('seeds an empty active bundle and 5 starter draft rules', async () => {
    await call('/internal/scheduler/seed-on-install', {});
    const active = JSON.parse((await fakeRedis.get('testsub:rules:active'))!);
    const draft = JSON.parse((await fakeRedis.get('testsub:rules:draft'))!);
    expect(active.rules).toHaveLength(0);
    expect(draft.rules).toHaveLength(5);
    expect(draft.rules.every((r: { shadow: boolean }) => r.shadow === true)).toBe(true);
  });

  it('does not clobber an existing draft on re-run', async () => {
    const existing = JSON.stringify(seedStarterRules(999));
    await fakeRedis.set('testsub:rules:draft', existing);
    await call('/internal/scheduler/seed-on-install', {});
    expect(await fakeRedis.get('testsub:rules:draft')).toBe(existing);
  });

  it('does not clobber an existing active bundle on re-run', async () => {
    const existing = JSON.stringify(seedStarterRules(999));
    await fakeRedis.set('testsub:rules:active', existing);
    await call('/internal/scheduler/seed-on-install', {});
    expect(await fakeRedis.get('testsub:rules:active')).toBe(existing);
  });

  it('returns ok even when seeding throws (non-fatal)', async () => {
    const origSet = fakeRedis.set;
    // sabotage the next Redis write
    let called = 0;
    fakeRedis.set = (async (k: string, v: string) => {
      if (k.includes('rules:active')) {
        called++;
        throw new Error('redis quota exceeded');
      }
      return origSet(k, v);
    }) as typeof fakeRedis.set;
    try {
      const res = await call('/internal/scheduler/seed-on-install', {});
      expect(await res.json()).toEqual({ status: 'ok' });
      expect(called).toBeGreaterThan(0);
    } finally {
      fakeRedis.set = origSet;
    }
  });
});

describe('trigger stubs', () => {
  it('on-app-upgrade returns ok', async () => {
    expect(await (await call('/internal/trigger/on-app-upgrade', { type: 'AppUpgrade' })).json()).toEqual({
      status: 'ok',
    });
  });
  it('on-post-report returns ok (v0.1 stub)', async () => {
    expect(await (await call('/internal/trigger/on-post-report', { type: 'PostReport' })).json()).toEqual({
      status: 'ok',
    });
  });
  it('on-comment-report returns ok (v0.1 stub)', async () => {
    expect(await (await call('/internal/trigger/on-comment-report', { type: 'CommentReport' })).json()).toEqual({
      status: 'ok',
    });
  });
});
