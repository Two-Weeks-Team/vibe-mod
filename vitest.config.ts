// vitest.config.ts
// vibe-mod test runner config. Pure-TS unit + component-integration layer.
// Devvit SDK is mocked via setup file; LLM calls are mocked via MSW.

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
      exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
      thresholds: {
        // Security-critical paths must stay above 95%
        'src/shared/rule-schema.ts': { branches: 95, functions: 95, lines: 95 },
        'src/server/evaluator.ts': { branches: 95, functions: 95, lines: 95 },
        'src/server/executor.ts': { branches: 90, functions: 90, lines: 90 },
      },
    },
  },
});
