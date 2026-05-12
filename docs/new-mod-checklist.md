# Starting a new Devvit mod tool — checklist

The reusable pieces from vibe-mod and where to copy them. Order: do the wizard
first (it creates `.devvit-app-id`), drop in the infra, then write your domain
logic against a green `npm run check` loop.

## 0. Scaffold

- `gh repo create <org>/<mod> --template <org>/devvit-mod-template` if that
  template repo exists, otherwise copy the files in §1 out of `vibe-mod`.
- Run the Devvit **"Mod Tool"** wizard at <https://developers.reddit.com/new>
  → creates the project + `.devvit-app-id`. Overlay the infra files on top.

## 1. Infra to copy verbatim (no per-mod changes)

- `eslint.config.js`, `.prettierrc.json`, `.prettierignore` — lint + format. `npm run lint` is 0-warnings strict.
- `.nvmrc` — the Node line CI uses (`node-version-file` in the workflow).
- `tsconfig.json`, `vitest.config.ts` — strict TS; vitest with coverage thresholds on security-critical files.
- `.github/workflows/ci.yml` — push/PR: install → lint → format:check → typecheck → test (coverage) → acceptance.
- `.github/dependabot.yml` — weekly bumps; `@devvit/*` grouped into one PR (the SDK moves fast — keep the drift surface visible).
- `test/devvit-testkit.ts` — in-memory Redis; Reddit/Listing/settings/scheduler doubles matching `@devvit/web@0.12.x`; `installFakeFetch()` + `openaiResponse()/openaiError()`. Zero project knowledge.
- `src/server/devvit-helpers.ts` — `getCurrentSubreddit{Name,Ref}()` (the SDK has no `getCurrentSubredditName`), `asT1`/`asT3` branded-id casts. Every mod needs these.
- `scripts/devvit-doctor.ts` — `npm run doctor`: pre-flight (devvit.json well-formed, every `fetch()`ed host declared under `permissions.http.domains`, route↔config wiring, node engine, login/app-id present).
- `scripts/replay.ts` + `test/replay-runner.test.ts` — `npm run replay fixtures/x.json`: fire an event/form at the local Hono app with the in-memory doubles; prints response + new redis keys + which Reddit calls fired. No `devvit playtest` needed.
- `package.json` scripts block + `simple-git-hooks`/`lint-staged` config — `lint`/`lint:fix`/`format`/`format:check`/`check`/`replay`/`doctor`; `prepare` installs the pre-commit (lint-staged) + pre-push (typecheck+test) hooks.

After copying: `npm install` (runs `prepare` → installs git hooks), then `npm run check` should pass with an empty `src/`.

## 2. Per-mod — copy and adapt

- `test/setup.ts` — thin layer over the testkit; change `'testsub'`/`'caller'` to your playtest identities; keep the `vi.mock(...)` + `beforeEach` reset shape.
- `scripts/acceptance.ts` — the G1–G4 gate runner; keep the structure (config↔code consistency, schema/cron validity, `tsc --noEmit`, full test suite); rewrite the specific assertions for your mod's menus/forms/triggers/schema.
- `src/server/index.ts` — Hono routes per your `devvit.json`. **Keep `isCallerModerator()` and call it in every menu/form handler** — `forUserType: "moderator"` in `devvit.json` is a UI hint, not server enforcement. Use `TaskBody`/`TaskAck` local aliases for scheduler handlers (`@devvit/web/shared` has no `TaskRequest`/`TaskResponse`).
- `src/shared/*.ts` — your Zod schemas. If the LLM emits structured output, mirror the closed enum sets into the system prompt and add an acceptance check that they stay in sync.
- `src/server/{evaluator,executor,fact-bag}.ts` — only if your mod has the "compile rules at build time, evaluate deterministically at trigger time" shape; otherwise drop.
- `fixtures/*.json` — one replay fixture per route you want to iterate on. Shape: `{ route?, body? (or a raw event with a `type` field), mod?, settings?, openai?, redis? }`.

## 3. SDK gotchas baked into the infra (so you don't re-learn them)

- No `reddit.getCurrentSubredditName()` — use `(await reddit.getCurrentSubreddit()).name` (the helper does this).
- `reddit.getPostById` / `getCommentById` take **branded** `t3_…` / `t1_…` ids — use `asT3` / `asT1`.
- Reporting is `reddit.report(thing, { reason })`, not `thing.report(...)`.
- `reddit.getModerators(...)` returns a `Listing<User>` — call `.all()` for the array.
- `reddit.getUserKarmaFromCurrentSubreddit(name)` returns `{ fromComments?, fromPosts? }`, not a number.
- Modmail: `reddit.modMail.createModNotification({ subject, bodyMarkdown, subredditId })`.
- `redis` has no `zCount` — count a score window via `zRange(key, min, max, { by: 'score' })`.
- **Key scoping**: any audit/rollback/circuit key written by one handler and read by another must be `${subName}:…`-scoped consistently (vibe-mod had a bug where they weren't).
- `npm ci` may trip `EBADPLATFORM` on esbuild's per-platform optional deps against a committed lockfile — CI uses `npm install`.

## 4. First green loop

```
npm install            # also installs git hooks
npm run doctor         # 0 hard issues (login / app-id warnings are fine pre-deploy)
npm run check          # typecheck + lint + format:check + test + acceptance
npm run dev            # devvit playtest — the one thing the testkit can't replace
```
