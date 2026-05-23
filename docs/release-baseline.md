# Release baseline & changelog evidence

> Canonical, judge-facing record of **which build is which**, what each contains, its CI status, and how to verify it locally. Companion to the README's [Submission baseline & build versions](../README.md#-submission-baseline--build-versions-read-this-first) section.
>
> Last verified: **2026‑05‑23**. Repo HEAD at writing: [`7ad2f85`](https://github.com/Two-Weeks-Team/vibe-mod/commit/7ad2f85).

---

## 1. Build matrix

| Build | Kind | Pointer | Status | Contains |
|---|---|---|---|---|
| **v0.0.49** | Reddit App Directory **listed** build | <https://developers.reddit.com/apps/vibe-mod> | **Approved & PUBLIC** since 2026‑05‑15 (≤1‑day review) | Full mod-tool flow: English→JSON compile, dry-run preview, 24h shadow, 30-day rollback, audit log, action whitelist, per-hour circuit breaker, per-sub daily quota, 5 seeded starter rules |
| **v0.0.50** | Devvit publish (re-review queue) | commit [`b376d88`](https://github.com/Two-Weeks-Team/vibe-mod/commit/b376d88) | Submitted to re-review 2026‑05‑15; **not** the listed build as last verified | v0.0.49 + `onPostFlairUpdate` trigger + dashboard multi-line render + Chrome live-verify script |
| **v0.0.51** | Devvit publish (re-review queue) **= repo HEAD** | commit [`7938bd0`](https://github.com/Two-Weeks-Team/vibe-mod/commit/7938bd0) (merge [`7ad2f85`](https://github.com/Two-Weeks-Team/vibe-mod/commit/7ad2f85), PR #54) | Submitted to re-review 2026‑05‑15; **not** the listed build as last verified | v0.0.50 + **security: removed per-sub BYOK OpenAI key input** |
| **repo HEAD** | Local-only (this PR) | `main` | Open PR; not published | v0.0.51 + read-only multi-rule **conflict preview** ([`conflict-handling.md`](./conflict-handling.md)) + judge-proof docs |

**Canonical submission baseline = v0.0.49** (what a judge installs from the App Directory). The repo demonstrates the security-hardened **v0.0.51**. These are intentionally different builds — see the README baseline section for the rationale.

### Versioning model (important, often misread)

- `v0.0.x` are **Devvit App Directory build numbers**, assigned by the platform on `devvit publish`. They live in Reddit's listing, **not** in this repo.
- They are **not** git tags (this repo has **none** — see §3) and **not** the npm `version` field in `package.json`, which is an unrelated `0.1.0`.
- Mapping build → commit is therefore done **by hand** in this table and in the README, not by `git tag`.

---

## 2. CI status

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — runs on every push and PR. Pipeline:

```
install → lint (eslint, 0 warnings) → format check (prettier) → tsc --noEmit
        → vitest (unit + route, with coverage) → @devvit/test harness
        → acceptance gates G1..G4 → vite build → "server bundle loads" smoke
```

Observed status (verify with the commands below — do not take these on faith):

| Run | Trigger | Result | Date |
|---|---|---|---|
| `25906679801` (PR #54 merge → v0.0.51) | push to `main` | **success** | 2026‑05‑15 |
| dependabot group (3 PRs) | pull_request | **success** (≈3m each) | 2026‑05‑20 |

Live status badge is in the [README](../README.md) header. Authoritative list:

```bash
gh run list -R Two-Weeks-Team/vibe-mod --branch main --limit 5
gh run list -R Two-Weeks-Team/vibe-mod --workflow ci.yml --limit 5
```

---

## 3. GitHub Release / tag status — and the plan

**There are currently no git tags and no GitHub Releases** in this repository:

```bash
git tag -l                                   # (empty)
gh release list -R Two-Weeks-Team/vibe-mod   # (empty)
```

This is honest and expected: distribution is via the **Devvit App Directory**, not GitHub Releases, so the project never cut a GitHub tag. Nothing below is fabricated — it is the **plan** to add tag/release evidence, not a claim that it exists.

### Tag/release plan (not yet executed)

Map each published Devvit build to an annotated git tag at its merge commit, then a matching GitHub Release:

| Tag (to create) | Commit | Release title |
|---|---|---|
| `v0.0.49-appdir` | (publish-submitted build) | App Directory listed build |
| `v0.0.50` | `b376d88` | onPostFlairUpdate + dashboard render + verify script |
| `v0.0.51` | `7938bd0` | Security: remove per-sub BYOK key input |

Exact commands (run only with maintainer approval — this PR does **not** run them):

```bash
# annotated tag on the security-hardened build
git tag -a v0.0.51 7938bd0 -m "v0.0.51 — remove per-sub BYOK OpenAI key input (PR #54)"
git push origin v0.0.51

# GitHub Release from that tag, notes drawn from the changelog below
gh release create v0.0.51 \
  --title "v0.0.51 — security hardening" \
  --notes-file docs/release-baseline.md   # or a trimmed notes file
```

> Decision left to the maintainer: tagging repo HEAD `v0.0.51` makes the git tag agree with the *repo* build but **not** with the *listed* build (v0.0.49). If git tags are added, the README baseline table is the tie-breaker for "what a judge installs."

---

## 4. Changelog (build-level)

- **v0.0.51** — *security.* Removed the per-subreddit BYOK OpenAI key input (Devvit sub-scoped settings are not encrypted; the input would expose a pasted key in plaintext to every mod of the sub). All installs now use the single shared encrypted developer key under a uniform per-sub daily quota. PR #54 / `7938bd0`.
- **v0.0.50** — *features + verification.* `onPostFlairUpdate` trigger (enables "when the Spam flair is applied, remove + lock"); dashboard multi-line `helpText` render; Chrome live-verify script; Devpost copy refresh. `b376d88`.
- **v0.0.49** — *App Directory listing.* First publicly approved build. Full flow: English→JSON compile (gpt-5.4-mini), strict Zod schema + action whitelist, deterministic evaluator, dry-run preview, 24h shadow mode, 30-day rollback, audit log, per-hour circuit breaker, per-sub daily compile quota, 5 seeded starter rules.
- **0.1.0** (npm `package.json`, unrelated to the Devvit build numbers) — initial repository version; see the README changelog.

---

## 5. Local verification (reproduces what CI checks)

```bash
npm install            # NOT npm ci — esbuild EBADPLATFORM on this lockfile
npm run lint           # eslint . --max-warnings 0
npm test               # vitest run
npm run build          # tsc --noEmit && vite build → dist/server/index.cjs
# full gate (what CI runs end-to-end):
npm run check          # typecheck + lint + format:check + test + test:devvit + acceptance
```

Node ≥ 22.2.0 (`.nvmrc` pins 22). Results of these commands for this PR are recorded in the PR description.
