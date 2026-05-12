// vite.config.ts — builds the Devvit Web *server* bundle.
// vibe-mod is server-only (no webview/post), so there's just one build target:
// the Node server endpoints in src/server/index.ts, compiled to a single
// CommonJS file at dist/server/index.cjs (the path `devvit.json`'s `server.entry`
// points at). The Devvit Web runtime requires CJS — ESM server output is not
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
    minify: 'esbuild',
    outDir: 'dist/server',
    ssr: 'src/server/index.ts',
    rollupOptions: {
      external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
      output: {
        format: 'cjs',
        entryFileNames: 'index.cjs',
        inlineDynamicImports: true,
      },
    },
  },
});
