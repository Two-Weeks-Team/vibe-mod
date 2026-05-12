// vitest.config.ts
// vibe-mod test runner config. Unit + route-level call tests.
// Devvit SDK + the OpenAI `fetch` are mocked via test/setup.ts (which builds on
// test/devvit-testkit.ts).

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      // index.ts is the Hono router — exercised functionally by routes-*.test.ts,
      // but excluded from line-coverage gating (its branches are response shapes).
      exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
      thresholds: {
        // Security-critical decision code must stay near-fully covered.
        'src/shared/rule-schema.ts': { branches: 95, functions: 95, lines: 95 },
        'src/server/evaluator.ts': { branches: 95, functions: 95, lines: 95 },
        // executor.ts carries deliberately-unreachable code in v0.1: the
        // ban/mute/permaban arms of applyAction (hard-lock #2 — guarded actions
        // never auto-fire), so its *branch* coverage floor is lower. Statements,
        // functions and lines still gate at 90%.
        'src/server/executor.ts': { branches: 78, functions: 90, lines: 90 },
      },
    },
  },
});
