// vitest.devvit.config.ts — runs the `*.devvit.test.ts` files, which use the
// OFFICIAL `@devvit/test` harness (`createDevvitTest()`): a miniature Devvit
// backend per test (real-ish Redis with transactions, Scheduler, Settings, etc.,
// with built-in isolation — no `beforeEach`). These do NOT load `test/setup.ts`
// (no `vi.mock(...)` of `@devvit/web/server` — `@devvit/test` fences the app code).
//
// Run: `npm run test:devvit`. The hand-rolled `test/devvit-testkit.ts` harness +
// the `*.test.ts` suite still cover the bulk of vibe-mod (route call-tests, etc.);
// `@devvit/test` is the recommended path for new mods / a future migration.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.devvit.test.ts'],
  },
});
