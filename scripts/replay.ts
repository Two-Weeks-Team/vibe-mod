#!/usr/bin/env tsx
// scripts/replay.ts
// Replay a Devvit event / form submit against the local Hono app — no
// `devvit playtest`, no sandbox subreddit. Uses the same in-memory Redis +
// Devvit SDK doubles as the test suite, so trigger/menu/form logic can be
// iterated in <1s.
//
// Usage:
//   npm run replay fixtures/post-submit.json
//   npm run replay fixtures/compose-rule-submit.json
//   npm run replay <file> /internal/trigger/on-post-submit   # explicit route override
//
// Fixture shape (all optional except `body` or a raw event with `type`):
//   {
//     "route":   "/internal/...",          // omit to auto-derive from event `type`
//     "body":    { ... },                   // request JSON body  (or put the event at top level)
//     "mod":     true,                      // caller is a moderator of the playtest sub (default: true)
//     "settings":{ "openaiApiKey": "sk-x" },// values returned by settings.get(...)
//     "openai":  { ...ruleJson... },        // canned OpenAI compile result (sets a fake fetch)
//     "redis":      { "testsub:rules:active": "{...json...}" },          // pre-seed string keys
//     "redisHashes":{ "testsub:audit:<id>": { "action": "remove", ... } }, // pre-seed hash keys
//     "redisZsets": { "testsub:audit": [ { "member": "<id>", "score": 1730000000000 } ] }  // pre-seed zsets
//   }
//
// This shells out to vitest so it reuses test/setup.ts's mocks verbatim; the
// actual replay logic lives in test/replay-runner.test.ts.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const fixture = process.argv[2];
const routeOverride = process.argv[3] ?? '';

if (!fixture) {
  console.error('usage: npm run replay <fixture.json> [routePathOverride]');
  console.error('example: npm run replay fixtures/post-submit.json');
  process.exit(2);
}
const fixturePath = resolve(process.cwd(), fixture);
if (!existsSync(fixturePath)) {
  console.error(`fixture not found: ${fixturePath}`);
  process.exit(2);
}

try {
  execFileSync('npx', ['vitest', 'run', 'test/replay-runner.test.ts', '--reporter=verbose'], {
    stdio: 'inherit',
    env: { ...process.env, REPLAY_FIXTURE: fixturePath, REPLAY_ROUTE: routeOverride },
  });
} catch {
  process.exit(1);
}
