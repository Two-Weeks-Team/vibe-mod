// test/replay-runner.test.ts
// The engine behind `npm run replay` (scripts/replay.ts). Skipped during the
// normal `npm test` run — only active when REPLAY_FIXTURE is set.

import { describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import app from '../src/server/index';
import { fakeRedis, fakeReddit, fakeSettings, fakeFetch, fakeListing, openaiResponse } from './setup';

const FIXTURE = process.env.REPLAY_FIXTURE;

// Map a Devvit trigger event `type` to its route, so a raw event fixture works
// without specifying `route`.
const ROUTE_BY_TYPE: Record<string, string> = {
  PostSubmit: '/internal/trigger/on-post-submit',
  CommentSubmit: '/internal/trigger/on-comment-submit',
  PostReport: '/internal/trigger/on-post-report',
  CommentReport: '/internal/trigger/on-comment-report',
  AppInstall: '/internal/trigger/on-app-install',
  AppUpgrade: '/internal/trigger/on-app-upgrade',
};

type Fixture = {
  route?: string;
  body?: unknown;
  type?: string;
  mod?: boolean;
  settings?: Record<string, unknown>;
  openai?: unknown;
  redis?: Record<string, string>; // string keys, e.g. `${sub}:rules:active`
  redisHashes?: Record<string, Record<string, string>>; // hash keys, e.g. `${sub}:audit:<id>`
  redisZsets?: Record<string, Array<{ member: string; score: number }>>; // zset keys, e.g. `${sub}:audit`
};

function snapshotRedisKeys() {
  return {
    strings: [...fakeRedis.store.keys()].sort(),
    hashes: [...fakeRedis.hashes.keys()].sort(),
    zsets: [...fakeRedis.zsets.keys()].sort(),
  };
}

describe.skipIf(!FIXTURE)('replay', () => {
  it(`replays ${FIXTURE}`, async () => {
    const fx = JSON.parse(readFileSync(FIXTURE!, 'utf8')) as Fixture;
    const route = process.env.REPLAY_ROUTE || fx.route || (fx.type ? ROUTE_BY_TYPE[fx.type] : undefined);
    if (!route)
      throw new Error(
        `could not determine route — add "route" to the fixture, or a known event "type" (${Object.keys(ROUTE_BY_TYPE).join(', ')})`,
      );
    const body = 'body' in fx && fx.body !== undefined ? fx.body : fx;

    // Generic Reddit "thing" stub so action/rollback flows complete in a replay
    // (tests use precise mocks; here we just want to observe the control flow).
    const stubThing = {
      approve: async () => {},
      unlock: async () => {},
      lock: async () => {},
      remove: async () => {},
      removed: false,
      flair: null as { text: string } | null,
    };
    fakeReddit.getPostById.mockResolvedValue(stubThing);
    fakeReddit.getCommentById.mockResolvedValue(stubThing);

    // Apply fixture-driven mock state.
    if (fx.mod ?? true) fakeReddit.getModerators.mockResolvedValue(fakeListing([{ username: 'caller' }]));
    if (fx.settings) fakeSettings.get.mockImplementation(async (k: string) => fx.settings![k]);
    if (fx.openai !== undefined) fakeFetch.mockResolvedValue(openaiResponse(fx.openai));
    if (fx.redis) for (const [k, v] of Object.entries(fx.redis)) await fakeRedis.set(k, v);
    if (fx.redisHashes) for (const [k, h] of Object.entries(fx.redisHashes)) await fakeRedis.hSet(k, h);
    if (fx.redisZsets)
      for (const [k, members] of Object.entries(fx.redisZsets)) for (const m of members) await fakeRedis.zAdd(k, m);

    const before = snapshotRedisKeys();
    const res = await app.fetch(
      new Request(`http://localhost${route}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
    const json = await res.json().catch(() => '<non-json>');
    const after = snapshotRedisKeys();

    const newKeys = [
      ...after.strings.filter((k) => !before.strings.includes(k)),
      ...after.hashes.filter((k) => !before.hashes.includes(k)),
      ...after.zsets.filter((k) => !before.zsets.includes(k)),
    ];

    console.log('\n────────────────────────────────────────────────────────');
    console.log(`POST ${route}`);
    console.log('request body :', JSON.stringify(body));
    console.log('response     :', res.status, JSON.stringify(json));
    console.log('redis +keys  :', newKeys.length ? newKeys.join(', ') : '(none)');
    if (fakeReddit.report.mock.calls.length)
      console.log('reddit.report:', JSON.stringify(fakeReddit.report.mock.calls));
    if (fakeReddit.setPostFlair.mock.calls.length)
      console.log('setPostFlair :', JSON.stringify(fakeReddit.setPostFlair.mock.calls));
    if (fakeReddit.banUser.mock.calls.length)
      console.log('banUser      :', JSON.stringify(fakeReddit.banUser.mock.calls));
    console.log('────────────────────────────────────────────────────────\n');
  });
});
