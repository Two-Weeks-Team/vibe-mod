# vibe-mod ↔ Devvit Web docs — conformance review

Reviewed vibe-mod against the (non-game) Devvit / Reddit-for-Developers docs
(snapshot in `docs/devvit-reference.md`, fetched 2026-05-12). The repo had been
built against a partly-imagined SDK surface; this is what was wrong and what was
fixed. Anything still open is at the bottom.

## Fixed (PR `feat/devvit-web-conformance`)

### 1. `devvit build` / `devvit upload` would have failed — no server bundle
- **`devvit.json` was missing the required `server` block.** A Devvit Web app must declare `post` and/or `server`; vibe-mod is server-only → it needs `"server": { "entry": "<cjs bundle path>" }`. Added `"server": { "entry": "dist/server/index.cjs" }`.
- **No build step produced a CommonJS server bundle.** `tsconfig` had `noEmit: true` and ESM output; the Devvit Web runtime requires **CJS** server output. Added `vite.config.ts` (SSR build, `format: 'cjs'`, `entryFileNames: 'index.cjs'`, `target: 'node22'`, `ssr.noExternal: true` so `@devvit/web`/`hono`/`zod` are bundled in, only Node builtins external, `minify: 'esbuild'` → ~2.1 MB). Added `vite` as a devDep.
- **`devvit.json` had no `scripts`.** `devvit playtest` runs `scripts.dev`, `devvit upload` runs `scripts.build`. Added `"scripts": { "dev": "vite build --watch", "build": "vite build" }`. `package.json`'s `build` is now `tsc --noEmit && vite build`.
- Added `"dev": { "subreddit": "vibemod_playtest" }` so `devvit playtest` doesn't need a generated sub (overridable via `DEVVIT_SUBREDDIT`).
- `dist/` is git-ignored (build artifact).

### 2. Dependency / import hygiene (the canonical Devvit Web shape)
- Devvit Web uses **one `@devvit/web` package with submodule imports** (`@devvit/web/server`, `@devvit/web/client`, `@devvit/web/shared`), not the individual `@devvit/*` packages. Removed `@devvit/reddit` and `@devvit/redis` from `dependencies` (they're transitive deps of `@devvit/web`); kept `@devvit/web`.
- Changed `import { redis } from '@devvit/redis'` → `import { redis } from '@devvit/web/server'` in `index.ts`, `executor.ts`, `fact-bag.ts`.
- Replaced the local `TaskBody`/`TaskAck` aliases with the real `TaskRequest` / `TaskResponse` (re-exported from `@devvit/web/server`).
- CLI dev-dep: `@devvit/cli` → `devvit` (the documented package; both provide the `devvit` bin).

### 3. Use the request `context` instead of an API round-trip
- The docs' pattern for "what subreddit am I in?" is `context.subredditName` / `context.subredditId` from `@devvit/web/server` — a request-scoped object, no API call. (There is no `reddit.getCurrentSubredditName()`.) `devvit-helpers.ts` now reads `context.*` and `getCurrentSubreddit{Name,Ref}()` are synchronous; removed the `await` / `.catch` at call sites in `index.ts` / `executor.ts` / `fact-bag.ts`. (Tests gained a `fakeContext` double.)

## Confirmed already-correct (no change)
- All endpoints start with `/internal/` (menu / form / trigger / scheduler) — the documented prefix for server-handled events. ✓
- `permissions`: `reddit: { scope: "moderator" }` is right for a mod tool — moderation actions (`remove`/`lock`/`report`/`setPostFlair`/`banUser`/…) run as the **app account** (granted full mod perms); `asUser` is only for `submitPost`/`submitComment`/`subscribeToCurrentSubreddit`, which vibe-mod doesn't do. `http: { domains: ["api.openai.com"] }` ✓ (`api.openai.com` is on the global allowlist but must still be declared per-app; OpenAI + Google Gemini are the only allowed AI providers). `redis: true` ✓.
- `settings`: `global.openaiApiKey` (`isSecret: true`) + `subreddit.*` with `validationEndpoint`s — matches the docs' "complete example" exactly (their example literally uses `openaiApiKey`!). Setting types `string`/`boolean`/`number`/`select` all valid. ✓
- Form/menu/toast response shapes (`showForm`/`showToast`, field types `paragraph`/`boolean`, `forUserType: "moderator"`, `location`, `acceptLabel`/`cancelLabel`) — all valid. ✓
- Trigger handler shape (`c.req.json<OnPostSubmitRequest>()` → `{post, author, subreddit}`, return `{status:'ok'}`) and `TriggerResponse` import from `@devvit/web/shared` ✓.
- No recursive triggers (none of vibe-mod's actions create posts/comments). ✓
- `reddit.report(thing, {reason})`, `target.remove(spam)`, `target.lock()`, `reddit.setPostFlair(...)`, `reddit.banUser/muteUser/unbanUser`, `reddit.modMail.createModNotification(...)`, `getModerators().all()`, branded `t3_`/`t1_` ids — all match the SDK and the docs. ✓
- `fetch` users must host a ToS + Privacy Policy and a README "Fetch Domains" section, and go through app review — vibe-mod has `docs/tos.md`, `docs/privacy.md`, and the README section; the HANDOFF accounts for review. ✓

## Still open (not blocking `devvit build`, but needed before publish / for parity)
- **`/internal/scheduler/dry-run-replay` is a v0.1 stub (no-op).** It's a headline feature ("dry-run preview"). Needs the real impl: read `rules:draft`, build fact bags for the last N posts/comments, evaluate, write simulated audit entries the Dashboard can show.
- **`marketingAssets.icon`** — a 1024×1024 PNG is required for the App Directory listing. Not in the repo yet.
- **Publish order** (HANDOFF Step 2 was wrong): you need at least one app installation (`devvit upload` or `npm run dev`) **before** `devvit settings set openaiApiKey` can store the secret. Run `npm run dev`/`devvit upload` first.
- **The "overlay onto the wizard" plan**: vibe-mod's `devvit.json` is now self-contained (has `server` + `scripts`), and `vite.config.ts` + the `vite` devDep are in the repo, so overlaying these onto a fresh Mod Tool template works. But don't *delete* the wizard's `src/client/` if it has one — vibe-mod just doesn't use a client; an empty/absent `post` block is fine.
- **`devvit build` not yet run for real** — it needs `devvit login` + an app id (`.devvit-app-id` from the wizard). The pieces are now in place; the live `devvit build` is the user's next gate.

## How this was gathered
`developers.reddit.com` is blocked from the WebFetch tool, so the docs were
crawled with Playwright (the site is SSG, so `fetch()` from the browser context
returns the rendered article HTML). 58 non-game pages were captured and rendered
to `docs/devvit-reference.md`. API-reference (typedoc) class pages were spot-checked
against `node_modules/@devvit/*/*.d.ts`, which are authoritative for exact signatures.

## Test harness — official `@devvit/test` adopted (alongside the hand-rolled one)

The docs (`/docs/guides/tools/devvit_test`) ship an official harness, `@devvit/test`'s
`createDevvitTest()` — a miniature Devvit backend per test (real-ish Redis with
`watch/multi/exec` transactions, Scheduler, Settings, context; built-in isolation,
no `beforeEach`; the Reddit API is only *partially* mocked, so Reddit calls still need spies).

vibe-mod now uses it for `*.devvit.test.ts` files (`vitest.devvit.config.ts`,
`npm run test:devvit`, run in CI) — see `src/server/executor.devvit.test.ts`
(executor audit/rollback round-trip + per-author rate limit through the real Redis).

The bulk of the suite (route call-tests, etc.) still uses the hand-rolled
`test/devvit-testkit.ts` harness — it's high-fidelity (in-memory Redis with the
`watch/multi/exec` shape, per-test reset), all tests pass, and migrating ~13 files
to `createDevvitTest()` is a large refactor with limited functional gain (and would
need a parallel vitest project anyway, since the global `vi.mock('@devvit/web/server')`
in `test/setup.ts` conflicts with `@devvit/test`'s app-fencing). **The recommended
path: start new mods on `@devvit/test` from day one** (see `docs/new-mod-checklist.md`),
and migrate vibe-mod's existing tests in a dedicated PR if/when it's worth it — not
under hackathon time pressure.
