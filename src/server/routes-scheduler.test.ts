// src/server/routes-scheduler.test.ts
// Functional call-tests for the cron-scheduled jobs: audit retention, dry-run
// replay (stub), shadow→live promotion, and the actions/hour circuit breaker.

import { describe, it, expect } from 'vitest';
import app from './index';
import { fakeRedis, fakeReddit, fakeSettings } from '../../test/setup';
import { Rule, RuleBundle, type RuleType } from '../shared/rule-schema';

const call = (path: string, body: unknown = {}) =>
  app.fetch(new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }));

function bundleWith(rule: Partial<RuleType>) {
  const r: RuleType = Rule.parse({
    id: 'r_x', name: 'x', sourceNL: 'x', on: ['onPostSubmit'],
    when: { fact: 'content.length', op: 'gt', value: 0 }, then: [{ action: 'lock', params: {} }],
    createdAt: 0, createdBy: 't2_seed', enabled: true, shadow: true, ...rule,
  });
  return RuleBundle.parse({ schemaVersion: '1.0.0', bundleVersion: 1, compiledAt: 0, llmModel: 'seed', llmTokensIn: 0, llmTokensOut: 0, rules: [r] });
}

describe('POST /internal/scheduler/audit-retention', () => {
  it('deletes audit entries (zset member + detail hash) older than 30 days, keeping recent ones', async () => {
    const old = 'a_old', fresh = 'a_fresh';
    await fakeRedis.zAdd('testsub:audit', { member: old, score: 1_000 });            // ancient
    await fakeRedis.zAdd('testsub:audit', { member: fresh, score: Date.now() });
    await fakeRedis.hSet(`testsub:audit:${old}`, { action: 'remove' });
    await fakeRedis.hSet(`testsub:audit:${fresh}`, { action: 'lock' });

    await call('/internal/scheduler/audit-retention');

    const members = (await fakeRedis.zRange('testsub:audit', 0, -1)).map((e) => e.member);
    expect(members).toEqual([fresh]);
    expect(await fakeRedis.hGetAll(`testsub:audit:${old}`)).toEqual({});
    expect((await fakeRedis.hGetAll(`testsub:audit:${fresh}`)).action).toBe('lock');
  });
});

describe('POST /internal/scheduler/dry-run-replay', () => {
  it('acknowledges (v0.1 stub)', async () => {
    expect(await (await call('/internal/scheduler/dry-run-replay', { data: { ruleId: 'r_x', subredditName: 'testsub' } })).json()).toEqual({ status: 'ok' });
  });
});

describe('POST /internal/scheduler/shadow-promote-check', () => {
  it('no-ops when shadow duration is 0 (auto-promote disabled)', async () => {
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'shadowDurationHours' ? 0 : undefined));
    await fakeRedis.set('testsub:rules:active', JSON.stringify(bundleWith({ createdAt: 0, shadow: true })));
    await call('/internal/scheduler/shadow-promote-check');
    expect(JSON.parse((await fakeRedis.get('testsub:rules:active'))!).rules[0].shadow).toBe(true);
  });

  it('no-ops when there is no active bundle', async () => {
    expect(await (await call('/internal/scheduler/shadow-promote-check')).json()).toEqual({ status: 'ok' });
  });

  it('promotes a shadow rule that has aged past the shadow window', async () => {
    // default shadow window = 24h; createdAt = 0 (epoch) is well past it
    await fakeRedis.set('testsub:rules:active', JSON.stringify(bundleWith({ createdAt: 0, shadow: true })));
    await call('/internal/scheduler/shadow-promote-check');
    expect(JSON.parse((await fakeRedis.get('testsub:rules:active'))!).rules[0].shadow).toBe(false);
  });

  it('leaves a freshly-created shadow rule alone', async () => {
    await fakeRedis.set('testsub:rules:active', JSON.stringify(bundleWith({ createdAt: Date.now(), shadow: true })));
    await call('/internal/scheduler/shadow-promote-check');
    expect(JSON.parse((await fakeRedis.get('testsub:rules:active'))!).rules[0].shadow).toBe(true);
  });
});

describe('POST /internal/scheduler/rate-limit-circuit-breaker', () => {
  it('does nothing when actions/hour are under the threshold', async () => {
    const now = Date.now();
    for (let i = 0; i < 3; i++) await fakeRedis.zAdd('testsub:audit', { member: `a${i}`, score: now });
    await call('/internal/scheduler/rate-limit-circuit-breaker');
    expect(await fakeRedis.get('testsub:circuit:open')).toBeUndefined();
    expect(fakeReddit.modMail.createModNotification).not.toHaveBeenCalled();
  });

  it('opens the breaker and modmails the team when the threshold is exceeded', async () => {
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'maxActionsPerHour' ? 2 : undefined));
    const now = Date.now();
    for (let i = 0; i < 5; i++) await fakeRedis.zAdd('testsub:audit', { member: `a${i}`, score: now });

    await call('/internal/scheduler/rate-limit-circuit-breaker');
    expect(await fakeRedis.get('testsub:circuit:open')).toBe('1');
    expect(fakeReddit.modMail.createModNotification).toHaveBeenCalledWith(expect.objectContaining({ subredditId: 't5_testsub', subject: expect.stringContaining('vibe-mod') }));
  });

  it('ignores audit entries older than an hour when counting', async () => {
    fakeSettings.get.mockImplementation(async (k: string) => (k === 'maxActionsPerHour' ? 2 : undefined));
    const old = Date.now() - 2 * 3_600_000;
    for (let i = 0; i < 5; i++) await fakeRedis.zAdd('testsub:audit', { member: `a${i}`, score: old });
    await call('/internal/scheduler/rate-limit-circuit-breaker');
    expect(await fakeRedis.get('testsub:circuit:open')).toBeUndefined();
  });
});
