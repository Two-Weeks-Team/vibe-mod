// src/server/index.ts
// vibe-mod entry point. Boots the Hono app and binds it to Devvit's serverless
// runtime. All actual routes live in src/server/routes/* — see app.ts for the
// wiring. Keeping the entry slim avoids the trap that triggered PR #26 (a
// hand-rolled Node→Hono adapter that broke ALS propagation), and it lets
// the route + helper modules be imported by tests without booting a port.
//
// Tests import `app` directly: `import app from './index';`. The `export
// default` below preserves that contract — splitting into app.ts is a
// refactor, not a behaviour change.

import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import app from './app';

export default app;

// Devvit Web server bootstrap — official template pattern.
//
// Source: github.com/reddit/devvit-template-react/blob/main/src/server/index.ts
// (Reddit's canonical Devvit Web template).
//
//   serve({ fetch: app.fetch, createServer, port: getServerPort() })
//
// `@hono/node-server`'s `serve` builds a proper Node IncomingMessage → Web
// `Request` adapter (lazy body streams, correct host handling, idempotent
// close hooks). Crucially it accepts a `createServer` option, so the entire
// adapter pipeline still runs inside Devvit's `createServer` wrapper —
// which installs the per-request `runWithContext(Context(req.headers), …)`
// that downstream plugin RPC reads `context.metadata` from.
//
// Gate on WEBBIT_PORT so module-load smoke (CI `node -e "require(...)"`)
// doesn't bind a port and hang forever — the Devvit runtime is the only
// environment that supplies WEBBIT_PORT.
if (typeof createServer === 'function' && typeof getServerPort === 'function' && process.env.WEBBIT_PORT) {
  try {
    serve({
      fetch: app.fetch,
      createServer,
      port: getServerPort(),
    });
  } catch (err) {
    // In tests, `vi.mock('@devvit/web/server', ...)` may stub these out → silently skip.
    console.warn('[vibe-mod] server bootstrap skipped (test or non-Devvit runtime):', err);
  }
}
