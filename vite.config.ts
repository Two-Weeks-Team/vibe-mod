// vite.config.ts — builds the Devvit Web *server* bundle.
// vibe-mod is server-only (no webview/post), so there's just one build target:
// the Node server endpoints in src/server/index.ts, compiled to a single
// CommonJS file at dist/server/index.cjs. devvit.json declares this as
// `server: { dir: "dist/server", entry: "index.cjs" }` — `entry` is the filename
// *within* `dir`, not a path from the project root, so it must stay in sync with
// `outDir` + `entryFileNames` below. The Devvit Web runtime requires CJS — ESM
// server output is not
// supported. Run via `vite build` (= devvit.json `scripts.build`, used by
// `devvit upload`) or `vite build --watch` (= `scripts.dev`, used by `devvit playtest`).
//
// (Tests use vitest.config.ts, not this file.)

import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

export default defineConfig({
  ssr: {
    // Bundle every npm dep (@devvit/web, hono, zod, …) into the server bundle;
    // only Node built-ins stay external (provided by the runtime).
    noExternal: true,
  },
  build: {
    emptyOutDir: false,
    target: 'node22',
    sourcemap: true,
    // vite 8 migration: 'esbuild' is no longer bundled with vite — it must be
    // installed separately OR you can use vite 8's default oxc transformer.
    // `true` selects the default minifier (oxc in vite 8), which is fine for
    // our CJS server bundle (we don't need esbuild-specific behaviour).
    minify: true,
    outDir: 'dist/server',
    ssr: 'src/server/index.ts',
    rollupOptions: {
      external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
      output: {
        format: 'cjs',
        entryFileNames: 'index.cjs',
      },
    },
    // vite 8 migration: `inlineDynamicImports: true` is deprecated; use the
    // top-level `codeSplitting: false` instead. This still inlines every
    // dynamic import into the single index.cjs bundle Devvit expects.
    codeSplitting: false,
  },
});
