# 03 — Hackathon Judging Gap Analysis (vibe-mod)

> Track: **Best New Mod Tool** ($10K) · Hackathon: *Reddit Mod Tools and Migrated Apps Hackathon*
> Submission deadline: **2026-05-27 18:00 PT** · Judging: 2026-05-28 → 06-09 · Winners ~2026-06-20
> Analysed: **2026-05-13** (D-14) · Sources: [devpost.com/rules](https://mod-tools-migration.devpost.com/rules), [devpost overview](https://mod-tools-migration.devpost.com/), Devvit Rules (`docs/devvit-reference.md` §"Devvit Rules", crawled 2026-05-12)

---

## 1. Summary

vibe-mod is **engineering-complete and ~zero-percent demonstrable**. The codebase, tests (171), CI, conformance audit, icon, ToS/Privacy text, and submission write-up draft are all done and high quality. But every artifact the *judges* actually consume — a working app at `developers.reddit.com/apps/vibe-mod`, a demo post in a <200-member sub they can test in, a demo video, screenshots, the filled Devpost form — depends on a chain the user has not yet started: **Devvit wizard → `devvit upload` → playtest → `devvit publish --public` → ~1-week Reddit app review**. With a ~1-week review lead time, `devvit publish` must be submitted by **~2026-05-20 (D-7)** at the absolute latest, realistically **D-9 (2026-05-18)**, or the app won't be approved/public before the deadline — which directly tanks "Polish", "Reliable UX", and makes "Moderator's Choice" (needs real mod installs) impossible.

The hackathon scores **5 equally-weighted criteria**: Community Impact, Polish, Reliable UX, Port Completion (ported only — N/A for us), Ecosystem Impact (new tools only). vibe-mod's *concept* scores well on Community Impact and Ecosystem Impact; its *current state* scores poorly on Polish and Reliable UX simply because nothing is deployed. **There is no migration story** — that's fine, we're in the New Tool track, not Ported — but it means we forfeit the other $10K category and should not pretend otherwise.

Realistic outcome if the deploy+submission chain completes on time and playtest reveals no major SDK breakage: **Honorable Mention likely (50–65%), Grand $10K plausible (30–45%), Moderator's Choice only if 3–5+ real mod installs land (~20%)**. If the publish-review window is missed, drop all of those by roughly half.

---

## 2. Judging-criteria scorecard

Weights: rules state the Stage-2 criteria are **"equally weighted"** (5 listed; 2 are category-conditional). For us 3 apply: Community Impact, Polish, Reliable UX, plus Ecosystem Impact (new-tool-only). Port Completion = N/A.

| Criterion | Weight | vibe-mod today | Gap | Fix |
|---|---|---|---|---|
| **Community Impact** — time savings for mods, engagement improvement | ~25% (1 of 4 applicable) | **6/10** — Strong *narrative*: "English → deterministic rule" genuinely removes the AutoMod-YAML barrier; shadow + dry-run + 30-day undo are real time-and-trust savers. But **no evidence**: not installed anywhere, no mod testimonials, Project-Impact section still has `<<placeholder>>` communities, and the closed ~22-fact-path ceiling limits how many real rules it can actually express vs AutoMod (per HANDOFF). | No demonstrated impact; placeholder communities; capability ceiling vs the incumbent. | Fill Project-Impact with 1–3 *real* small subs the team/beta mods moderate (rules require this, <200 members each for the demo sub). Get ≥2 beta mods to write a one-line "this saved me X" quote for the description. If feasible in the time, expand the fact layer by even 4–6 paths (repost flag, `content.isEdited`, account-age buckets) to widen the rule space. |
| **Polish** — "publishable quality, compliant with Devvit Rules" | ~25% | **3/10** — Code/CI/docs are polished, **but the app does not exist as a published Devvit app**. Devvit Rules require LLM/fetch apps to (a) be **approved via app review** to be publicly installable and to unlock the LLM/fetch premium features, and (b) ship a ToS + Privacy *linked in the app*. Neither is live. Root `README.md` exists now (good — fixed since the 05-12 audit). Icon exists. | App unpublished/unreviewed; ToS/Privacy not hosted as URLs nor wired into the app listing; no screenshots; playtest never run (SDK-runtime risk unverified). | **Start `devvit publish --public` by D-9 (2026-05-18).** Host `docs/tos.md`/`docs/privacy.md` as HTML (gallery repo) and put the URLs in the app's `devvit.json`/App Directory listing *before* publishing. Run `npm run dev` playtest first; fix any SDK breakage. Write a "detailed app description" (Devvit Rules explicitly say a detailed description speeds review). |
| **Reliable UX** — easy install/config, scalable performance | ~25% | **4/10** — Architecture is genuinely scalable (LLM at edit-time only, 0 model calls per post; per-sub daily compile quota; circuit breaker; all state in Devvit Redis). Install flow is one menu + a settings key. **But unverified end-to-end** — the 3 MANUAL gates (Compose menu renders → form → OpenAI round-trip → undo round-trip) have never run inside Devvit; first playtest may surface 1–2 mismatches. Config UX requires the mod to paste an OpenAI key (friction) unless on the free tier. | Zero runtime verification; OpenAI-key setup step is a config-friction point; no documented install walkthrough with screenshots. | Run playtest ASAP, fix issues, capture the install/config flow as screenshots + a section in the app description. Make the "no key needed on OpenAI free tier" path obvious; document `subredditOpenaiApiKey` BYOK fallback. Confirm `permissions.http.domains` includes `api.openai.com` (it does — keep it). |
| **Port Completion** (ported apps only) | N/A | — | We are in the New Tool track. **No migration story exists** and shouldn't be invented. | None. Do *not* claim a port; it would fail the pass/fail viability screen for the wrong category. |
| **Ecosystem Impact** (new tools only) — net-new functionality, broad appeal | ~25% | **7/10** — This is vibe-mod's strongest axis: nothing in the App Directory does "NL → deterministic compiled rule with shadow/dry-run/undo". Broad appeal (every small-mod-team sub without an AutoMod specialist). The reusable Devvit testkit / new-mod-checklist are a small bonus ecosystem contribution. | Appeal is real but unproven; "net-new" claim is only as credible as a working demo. | Lead the Devpost description and demo video with the **"AI as a compiler, not a judge"** framing — it's the differentiator. Mention the testkit/checklist as ecosystem byproducts. |
| **Stage-1 viability (pass/fail screen)** | gate | **At risk** — must be a working app on Reddit's Developer Platform, in-category, with the required submission materials. Today: no app link, no demo post, no Devpost entry. | The required deliverables (app link, demo post in <200-member sub, Reddit usernames, text description, Project-Impact) don't exist yet. | Complete the deploy→publish→submit chain (see §3). The app link `developers.reddit.com/apps/vibe-mod` is a **hard required field**. |

**Bonus (individual, not project):** Devvit Helper Award ($500×6 — nominate community members who helped), Most Valuable Feedback ($200×10 — fill the developer-satisfaction survey + give substantive Devvit feedback). Low effort, do both.

**Demo video:** the /rules page says it's **optional, "less than one (1) minute"**, must show the project functioning, hosted on YouTube/Vimeo/Facebook/Youku with a public link. *Optional but do it* — a sub-1-min screen capture with voiceover (no background music) materially helps Polish/Reliable-UX scoring.

---

## 3. Action plan — 2026-05-13 → 2026-05-27

> Owner key: **U** = user (CLI/OAuth/recording — not automatable), **C** = Claude can draft now.
> Hard critical-path: anything blocking `devvit publish` must finish by **D-9 (05-18)**.

| Date | Action | Owner | Exit gate |
|---|---|---|---|
| **05-13 (D-14, today)** | Devvit wizard at `developers.reddit.com/new` → "Mod Tool" template → overlay vibe-mod files (HANDOFF Step 1) → `npm install && npm run build && npm run doctor`. | U | `dist/server/index.cjs` builds; doctor = 0 hard issues; `.devvit-app-id` exists. |
| **05-13/14** | `cp .env.example .env`, add OpenAI key (billing active) → `npm run openai:smoketest` (expect 7/7). | U | 7/7. |
| **05-14 (D-13)** | `devvit upload` → **record the app link** `developers.reddit.com/apps/vibe-mod` → `devvit settings set openaiApiKey` → `npm run dev` playtest → walk the 3 MANUAL gates; `devvit logs` on any failure. | U | Compose menu renders → form → OpenAI compile round-trip → undo round-trip all work in Devvit. |
| **05-14/15** | Fix any SDK/runtime mismatches surfaced by playtest. | U (+C for code) | playtest gates green; CI still green. |
| **05-15 (D-12)** | Host `docs/tos.md` + `docs/privacy.md` as HTML in the gallery repo; put both URLs in `devvit.json` / App Directory listing. Write the "detailed app description" for the listing (reuse `docs/devpost-submission.md` §2–3). | C drafts, U hosts/pastes | ToS + Privacy URLs reachable and referenced in the app. |
| **05-16/17 (D-11/10)** | Beta outreach — r/ModSupport, r/redditdev, r/Devvit, hackathon Discord. Aim for ~6–10 mod commitments to install on small subs (Moderator's-Choice ammo). Create the <200-member invite-only demo subreddit + a demo post running the app. | U | Demo sub + post live; ≥3 mod commitments. |
| **🔴 05-18 (D-9)** | **`devvit publish --public`** — start the ~1-week Reddit app review. *This is the hard deadline; do not slip past 05-20.* | U | Review submitted; confirmation received. |
| **05-19–24** | Beta mods install on their subs; triage issues; collect 2–3 one-line testimonials. Capture ≥3 screenshots from the live app (compose form, dry-run preview, audit/dashboard). | U (+C for fixes) | App in ≥3 real subs; screenshots in hand. |
| **05-24 (D-3)** | Record demo video v0 (< 1 min, **no music**, voiceover). Finalize root README screenshots. | U | One take in the can. |
| **05-25 (D-2)** | **FEATURE FREEZE.** Re-record demo video (3 takes), add SRT captions, upload to YouTube (public/unlisted-public). Fill Project-Impact with the 3 real communities; fill all `<<placeholders>>` in `docs/devpost-submission.md`. | U + C | Final video uploaded; submission text complete. |
| **05-26 (D-1)** | Dry-run the full Devpost form. Complete the developer-satisfaction survey (bonus). Nominate Devvit helpers (bonus). Verify app review status; if not yet approved, prepare the unlisted-install link as fallback and note it in the submission. | U | Form ready to submit; fallbacks prepared. |
| **05-27 (D-day, target ~10:00 PT)** | Submit on Devpost: app link · text description · all participants' Reddit usernames · Project-Impact (1–3 communities) · category = "Best New Mod Tool" · explanation of significant updates during the period · (optional) public repo link · (optional) demo video. ≥8h buffer before 18:00 PT. | U | Submitted; confirmation email received. |

---

## 4. Submission blockers (missing ⇒ disqualified or score-tanked)

| # | Blocker | Why it's fatal/severe | Status |
|---|---|---|---|
| B1 | **App link `developers.reddit.com/apps/vibe-mod`** | Hard-required Devpost field. No link ⇒ submission can't be completed / fails Stage-1 viability. | ❌ Not created — needs Devvit wizard + `devvit upload`. |
| B2 | **App published & approved via Reddit app review** (or unlisted-install fallback) | Per Devvit Rules, LLM/fetch apps need approval to be publicly installable and to unlock the LLM/fetch premium features; an unreviewed app reads as "not launch-ready" and judges may not be able to install it. ~1-week review ⇒ must start by **D-9 (05-18)**. | ❌ Not started. **Highest-risk item.** |
| B3 | **Demo post in a public subreddit with <200 members** | Explicit rules requirement so judges can test the app. Missing ⇒ judges can't evaluate ⇒ Stage-1/Polish failure. | ❌ Sub not created. |
| B4 | **Playtest verification (3 MANUAL gates)** | If the app doesn't actually run in Devvit, everything else is moot. First runtime check has never been done; SDK mismatches plausible. | ❌ Not run. |
| B5 | **ToS + Privacy hosted as URLs and linked in the app** | Devvit Rules: apps using HTTP Fetch / collecting personal info "**require** … a terms of service and privacy policy and … a link to both **in your app**". Reddit's own ToS/Privacy links are explicitly *not* accepted. Missing ⇒ app review rejection. | ⚠️ Text written (`docs/tos.md`, `docs/privacy.md`); not hosted as HTML; not wired into the app listing. |
| B6 | **Text description + Project-Impact (1–3 real communities) + all participants' Reddit usernames** | Required Devpost fields. Project-Impact currently `<<placeholder>>`; submitting with placeholders reads as incomplete and hurts Community Impact scoring. | ⚠️ Draft exists (`docs/devpost-submission.md`); placeholders unfilled. |
| B7 | **"Explanation of significant updates during the submission period"** (Best-New-Mod-Tool category-specific field per /rules) | Required for our category. Easy to write but must not be forgotten. | ⚠️ Not written. |
| B8 | **Real mod installs (≥3–5)** — *not* a disqualifier, but a hard gate for **Moderator's Choice** ($10K) | The mod-judge panel evaluates from a shortlist; with zero real-community usage, Moderator's Choice is effectively off the table. | ❌ Zero installs; needs beta outreach starting ~D-11. |

Non-blocking but worth doing: developer-satisfaction survey (bonus prize), Devvit-helper nominations (bonus prize), public GitHub repo confirmed accessible (it's `Two-Weeks-Team/vibe-mod`, MIT — verify it's actually pushed/public), demo video (optional per /rules but materially helps Polish/Reliable-UX).

---

*Rules cited: [mod-tools-migration.devpost.com/rules](https://mod-tools-migration.devpost.com/rules) (judging criteria, prize categories, required submission materials, <200-member sub rule, demo-video specs, category-specific fields), [mod-tools-migration.devpost.com](https://mod-tools-migration.devpost.com/) (prize amounts, dates). Devvit publishing policy: `docs/devvit-reference.md` §"Devvit Rules" (app review ~1 week, ToS/Privacy requirement for fetch/LLM apps, approval needed for public install + premium features) — mirrors [developers.reddit.com/docs/devvit_rules](https://developers.reddit.com/docs/devvit_rules). Not a legal review — verify the live rules pages before submitting.*
