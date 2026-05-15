# vibe-mod — Devvit setup & launch guide

> Step-by-step procedure for taking this repo from "code only" to "published Devvit Mod Tool",
> following the official Devvit docs. Everything here that runs in a browser or needs Reddit OAuth
> must be done by **you** (the repo owner) — Claude/CI cannot do it. The repo is already
> implementation-ready; this guide is the human part.
>
> Sources (snapshotted in `docs/devvit-reference.md`):
> - Mod tool quickstart — https://developers.reddit.com/docs/quickstart/quickstart-mod-tool
> - Devvit CLI — https://developers.reddit.com/docs/guides/tools/devvit_cli
> - Playtest — https://developers.reddit.com/docs/guides/tools/playtest
> - Launch guide — https://developers.reddit.com/docs/guides/launch/launch-guide
> - Settings & Secrets — https://developers.reddit.com/docs/capabilities/server/settings-and-secrets
> - `devvit.json` reference — https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_overview
>
> Deadline context: hackathon submission **2026-05-27 18:00 PT** (firm). `devvit publish --public`
> review takes ≈1 business week, so start Step 7 by **~2026-05-18 (D-9)**.

---

## TL;DR command sequence

```bash
# 0. one-time
node --version                       # must be >= 22.2.0

# 1. wizard (browser) — creates a NEW directory with the Mod Tool template
#    https://developers.reddit.com/new  → "Other templates" → "Mod Tool"

# 2. overlay this repo's files onto the wizard directory (see Step 2), then:
cd <wizard-dir>
npm install
npm run typecheck                    # tsc --noEmit — must be clean
npm run build                        # tsc --noEmit && vite build → dist/server/index.cjs
npm run doctor                       # 0 hard issues (login / .devvit-app-id warnings are OK pre-upload)
npm run acceptance                   # 4/4 (G1..G4)

# 3. authenticate + first upload (creates the app account + an auto playtest sub)
npx devvit login
npx devvit upload                    # app is private, visible only to you

# 4. now that the app exists, set the deploy-side OpenAI key (secret, global)
npx devvit settings set openaiApiKey # paste sk-...   (separate from local .env)
npx devvit settings list             # confirm

# 5. playtest (live, on a <200-subscriber test sub you moderate)
npm run dev                          # = devvit playtest  (Ctrl+C to stop)
npx devvit logs <your-test-sub> vibe-mod --since 5m --verbose   # in another terminal if needed

# 6. run the 3 manual gates (see Step 6)

# 7. publish for review (≈1 week). start by D-9 (2026-05-18).
npx devvit publish --public          # general-purpose mod tool → request App Directory listing
```

---

## Step 0 — Prerequisites

- **Node.js ≥ 22.2.0** (`node --version`). This repo's `.nvmrc` pins 22; the dev machine here has v24,
  which also works. `npm ci` does **not** work in this repo (esbuild per-platform optional deps →
  `EBADPLATFORM`); always use `npm install`.
- A **Reddit account** you can log in with in a browser, that will become the developer account.
- (For playtest) a **test subreddit with fewer than 200 subscribers that you moderate** — or let
  Devvit auto-create one for you (see Step 5).
- An **OpenAI API key** with billing enabled (or be on the free daily-tier "API I/O sharing"
  program). You'll use this key in two places: locally in `.env` (for `npm run openai:smoketest`),
  and as a Devvit secret (for the deployed app). They can be the same key or different keys.

---

## Step 1 — Run the Devvit "Mod Tool" wizard

Per the official quickstart:

1. Go to **https://developers.reddit.com/new** in a browser.
2. Choose **"Mod Tool"** under **"Other templates"**.
3. Go through the wizard. You'll create a Reddit account (or sign in) and connect it to Reddit
   developers; the wizard then drops you into a terminal flow.
4. Follow the terminal instructions. On success you'll see something like:

   ```
   Your Devvit authentication token has been saved to ~/.devvit/token
   Fetching and extracting the template...
   Cutting the template to the target directory...
   🔧 Installing dependencies...
   🚀🚀🚀 Devvit app successfully initialized!
   ┌────────────────────────────────────────────────────┐
   │ • `cd my-app` to open your project directory        │
   │ • `npm run dev` to develop in your test community   │
   └────────────────────────────────────────────────────┘
   ```

This creates a **new directory** containing the stock Comment-Mop-style Mod Tool template
(a `devvit.json`, `package.json`, `src/client/`, `src/server/`, etc.).

**Naming note:** `devvit.json`'s `name` must be 3–16 chars, start with a letter, lowercase letters /
digits / hyphens only. We use `vibe-mod`. If `vibe-mod` is already taken on upload, pick another slug
(e.g. `vibemod`, `vibe-mod-app`) and update `name` in `devvit.json` accordingly.

---

## Step 2 — Overlay this repo onto the wizard directory

The wizard gives you an empty-ish template. We replace its app code with vibe-mod's. Copy these from
this repo (`~/Documents/GitHub/vibe-mod/`) **into the wizard directory**, overwriting where noted:

| From this repo | Action in wizard dir |
|---|---|
| `devvit.json` | **overwrite** — vibe-mod's is self-contained (has `server` / `scripts` / `dev` blocks) |
| `package.json` | **overwrite** |
| `tsconfig.json` | **overwrite** |
| `vite.config.ts` | **add** (this is what builds `dist/server/index.cjs`; replace any wizard-provided vite config) |
| `vitest.config.ts`, `vitest.devvit.config.ts` | **add** |
| `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.nvmrc`, `.env.example`, `.gitignore` | **add** |
| `src/` | **overwrite** the wizard's `src/server/**`. ⚠️ **Do not delete** the wizard's `src/client/` if it exists — vibe-mod is server-only, but leaving an empty client folder is harmless and removing it can confuse the toolchain. (vibe-mod's repo has no `src/client/`; if the wizard created one, keep it.) |
| `scripts/`, `test/`, `fixtures/`, `assets/`, `docs/` | **add** |
| `.github/workflows/ci.yml`, `.github/dependabot.yml` | **add** |
| `LICENSE` | **add** |
| `README.md` (root) | **add** (used by `devvit publish` and as the GitHub front page) |

**Alternative (cleaner):** point the wizard / `npx devvit new --here` at this repo directory itself so
it scaffolds *around* the existing files, then reconcile conflicts in favor of vibe-mod's versions.
Either way the end state is: the wizard directory == this repo's contents, plus whatever `~/.devvit/`
auth + (later) `.devvit-app-id` Devvit adds.

After overlaying:

```bash
cd <wizard-dir>
npm install            # installs @devvit/web, hono, zod + devvit/vite/vitest/eslint... and git hooks
npm run typecheck      # tsc --noEmit  → must be clean
npm run build          # tsc --noEmit && vite build  → produces dist/server/index.cjs (~2 MB CJS bundle)
npm run doctor         # preflight: devvit.json integrity, fetch-domain↔permissions, route↔config, node engine
                       #   2 warnings are expected here: "not logged in" and "no .devvit-app-id" — both fixed by Step 3
npm run acceptance     # G1..G4 — must be 4/4
npm test               # 168 tests, 1 skipped
npm run openai:smoketest   # optional but recommended: cp .env.example .env, put OPENAI_API_KEY=sk-..., expect 7/7
```

If `npm run build` fails: the most common cause is a stale `vite.config.ts` from the wizard — make
sure it's vibe-mod's (SSR build, `format: 'cjs'`, output `dist/server/index.cjs`).

---

## Step 3 — Authenticate and first `devvit upload`

```bash
npx devvit login                 # opens a browser; or `npx devvit login --copy-paste`
npx devvit whoami                # confirms the logged-in Reddit user
npx devvit upload                # uploads the app to the App Directory — PRIVATE, visible only to you
```

`devvit upload`:
- registers the **app account** (`u/vibe-mod`) and reserves the slug,
- writes a local `.devvit-app-id` (so `npm run doctor`'s second warning goes away),
- **auto-creates a private playtest subreddit** for you (you become a moderator; the app is
  pre-installed there; Reddit admins can join it),
- bumps the version (the repo declares `0.1.0`; upload manages the playtest increment).

If the slug `vibe-mod` is taken, `upload` errors — change `name` in `devvit.json`, re-run.

---

## Step 4 — Set the deployed app's OpenAI key (Devvit secret)

`devvit settings set` only works **after at least one upload** (the app must exist). Devvit secrets
are **global to the app** (all subreddit installs share them) — that's why `openaiApiKey` lives under
`settings.global` in `devvit.json` with `isSecret: true`.

```bash
npx devvit settings set openaiApiKey      # paste your sk-... when prompted
npx devvit settings list                  # should list openaiApiKey (value masked)
```

This is **separate from the local `.env`** key used by `npm run openai:smoketest`. They can be the
same key; the deployed app reads only the Devvit secret, never `.env`.

Notes:
- The `openaiModel` setting (default `gpt-5.4-mini`) is a normal global setting; mods don't need to
  touch it.
- There is **no per-subreddit OpenAI key input**. Devvit subreddit-scope settings are not encrypted
  (only `settings.global` with `isSecret: true` is — see the Devvit docs: "Secrets are global settings
  marked with `isSecret: true`. They're encrypted and can only be set by developers via the CLI."),
  so accepting a key from each sub's mods would have exposed it plaintext to every mod of that sub.
  v0.0.51 removed the input. Every install compiles through the shared developer key under the same
  per-sub daily quota.

---

## Step 5 — Playtest (the real runtime check)

```bash
npm run dev          # = `devvit playtest`  →  Ctrl+C to end
```

What `devvit playtest` does: installs the app on your test subreddit, re-installs a new version every
time you save a code change, and streams logs to the terminal. It picks the subreddit from, in order:
`DEVVIT_SUBREDDIT` env var → `dev.subreddit` in `devvit.json` (currently `"SocialSeeding"`) → the
playtest sub stored for your app → otherwise it auto-creates one.

⚠️ `devvit.json` currently has `"dev": { "subreddit": "SocialSeeding" }` — `r/SocialSeeding` is the
team's demo community. Keep it under 200 subscribers (a hackathon rule for the test/demo sub). If you're
working from a different account, either change that value to a test sub you moderate, or delete the
`dev.subreddit` field and let `devvit upload`/`playtest` auto-create one.

Ending the playtest (Ctrl+C) does **not** uninstall — the last playtested version stays installed on
the test sub. To revert: `devvit install <test-sub> [@version]`.

Streaming logs in a second terminal (if the playtest output isn't enough):

```bash
npx devvit logs <your-test-sub> vibe-mod --since 5m --verbose
npx devvit logs <your-test-sub> vibe-mod -j           # JSON lines
```

For client-side logs, append `?playtest=vibe-mod` to the subreddit URL in your browser.

---

## Step 6 — Manual acceptance gates (do these during playtest)

These three round-trips can only be verified inside Devvit (no local emulator exists). If any fail,
grab `devvit logs` output and the error, and that's the next debugging session's input.

1. **Menu renders** — in your test sub, as a moderator, open the subreddit's `⋯` / Mod Tools menu →
   you should see **"vibe-mod: Compose rule"** and **"vibe-mod: View rules + log"**. (On a post or
   comment's `⋯` menu you should also see **"vibe-mod: Undo this action"**.)
2. **OpenAI compile round-trip** — click "vibe-mod: Compose rule" → the form opens → type something
   like *"Send to mod queue any post under 50 characters from accounts less than 7 days old"* →
   submit → it should come back with a compiled rule preview (and a "compiles used today: N / 50"
   counter). This exercises the `api.openai.com` fetch path inside Devvit.
3. **Activate → shadow → undo** — activate a rule (it goes shadow-only for `shadowDurationHours`,
   default 24h, logging without acting) → trigger it with a matching post → confirm an audit entry
   appears in "View rules + log" → use "vibe-mod: Undo this action" on that post → it's restored.
   (To exercise live action faster, you can lower `shadowDurationHours` in the sub's app settings, or
   keep `dryRunOnly` on to verify the logging path only.)

Most common failure modes (per the docs and prior conformance work):
- `permissions.http.domains` missing `api.openai.com` → OpenAI fetch blocked. (It's present in
  `devvit.json` — confirm it wasn't lost in the overlay.)
- `hono` / `zod` not installed → server bundle fails. Re-run `npm install`.
- Server entry mismatch → `devvit.json`'s `server.entry` must be `dist/server/index.cjs` and
  `npm run build` must have produced it.

---

## Step 7 — Publish for review

By default published apps are **unlisted** (installable only by you). vibe-mod is a general-purpose
mod tool, so we request **public listing** in the App Directory:

```bash
npx devvit publish --public        # or: --bump minor / --bump major / --version 1.0.0
```

Requirements the reviewers check (the repo already satisfies the code parts):
- a user-friendly `README.md` with a comprehensive overview, **installer-facing instructions**, and
  **changelogs for major updates** — that's the root `README.md` in this repo.
- working functionality across web + mobile, tested from developer / moderator / regular-user
  accounts.
- compliance with the Devvit Rules.

Review SLA: usually 1–2 business days for updates, longer for new apps and apps using higher-risk
features (we use `http` fetch, so budget more). If nothing after a week, ping r/Devvit modmail or
Discord. → **Start this by ~2026-05-18 (D-9)** so a 1-week review still lands before the 05-27
deadline. If review is slow, fall back to an unlisted install link (`devvit install <sub>`) for the
demo.

Helpful: cross-post to r/Devvit with the "Feedback Friday" flair and share in the Discord
`#mod-chat` channel for moderator feedback (recommended in the launch guide).

---

## Step 8 — Post-publish (Devpost submission assets)

Needs the running app, so it happens after Step 7:
- demo video < 1 min, **no background music** (the rest of HANDOFF.md explains why), uploaded to YouTube;
- ≥ 3 screenshots of the live app;
- ToS + Privacy URLs (already hosted: `…/reddit-mod-tools-port-gallery/vibe-mod/tos.html`,
  `…/privacy.html`);
- the 7-section Devpost write-up — draft is in [`docs/devpost-submission.md`](./devpost-submission.md);
- the app's install link / App Directory URL;
- Project-Impact (which communities will use it).

---

## Quick reference — what only *you* can do vs. what's automated

| Done / automatable (Claude, CI) | Needs you (browser / Reddit OAuth / running app) |
|---|---|
| All app code, schema, evaluator, executor, routes | `developers.reddit.com/new` wizard |
| 168 unit/route tests + `@devvit/test` harness + PBT | `devvit login` / `devvit upload` |
| `npm run acceptance` (G1..G4), `npm run doctor` | `devvit settings set openaiApiKey` |
| `npm run openai:smoketest` (with a key in `.env`) | `devvit playtest` + the 3 manual gates |
| `vite build` → `dist/server/index.cjs` | `devvit publish --public` + review wait |
| README, Devpost template, this guide | Demo video, screenshots, Devpost form |

---

_Last updated: 2026-05-13. If a `devvit` command behaves differently from this guide, the docs may
have moved on — re-crawl into `docs/devvit-reference.md` and reconcile._
