// eslint.config.js — flat config (ESLint 10). See https://eslint.org/docs/latest/use/configure/configuration-files
// Pairs with Prettier: this file owns *correctness* rules; Prettier owns formatting
// (eslint-config-prettier, applied last, disables any formatting rules that would conflict).

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      'dist',
      'build',
      '.devvit',
      'coverage',
      '**/*.d.ts',
      '.venv-chrome-auth',
      'playwright/.auth',
      'scripts/chrome-reddit-*.py',
      'scripts/repro-*.mjs',
      'scripts/test-*.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // `_`-prefixed args/vars are intentionally unused (Devvit handler signatures, etc.)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // We deliberately use `as unknown` / loose casts at the Devvit/OpenAI SDK boundary.
      '@typescript-eslint/no-explicit-any': 'off',
      // Devvit serverless logs to console on purpose.
      'no-console': 'off',
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
      // ESLint 10 introduced `no-useless-assignment`, which fires on the
      // common resilient-fallback pattern:
      //
      //   let bundle: T | null = null;       // <- flagged as useless
      //   try { bundle = await fetchIt(); }
      //   catch (err) { /* fall back */ }
      //   if (!bundle) return ...;            // <- but the default IS used
      //
      // The default value IS read on the catch path; the rule's analysis
      // doesn't see through the try/catch. Disable so we can keep the
      // pattern (used heavily for reddit/devvit#258 workaround — every
      // plugin RPC call is wrapped this way). See PR #30.
      'no-useless-assignment': 'off',
    },
  },
  {
    // Test files: enable vitest lint rules; the important one is no-focused-tests
    // (a stray `.only` would silently shrink CI coverage).
    files: ['**/*.test.ts', 'test/**/*.ts'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'warn',
      'vitest/expect-expect': 'off',
    },
  },
  {
    // `*.devvit.test.ts` use `createDevvitTest()`'s returned `test()` (not the
    // vitest global), which the plugin can't recognise as a test block.
    files: ['**/*.devvit.test.ts'],
    rules: {
      'vitest/no-standalone-expect': 'off',
      'vitest/expect-expect': 'off',
    },
  },
  {
    // Dev scripts run under tsx; allow process/console freely.
    files: ['scripts/**/*.ts'],
    rules: {},
  },
  // MUST be last: turn off rules that would conflict with Prettier.
  prettier,
);
