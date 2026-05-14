# Gap Analysis 02 — Competitive Landscape

_vibe-mod · Mod Tools and Migrated Apps Hackathon (Best New Mod Tool, $10K)_
_Date: 2026-05-13. Sources cited inline; full list at the bottom._

---

## 1. Summary

The Reddit moderation-automation space is **crowded but bimodal**:

- **Powerful-but-painful rule engines** for advanced mods — AutoModerator (YAML + regex), ContextMod, Better-Auto-Moderator, and the new Devvit "automator" family (Modmail Automator, Flair Assistant). These are deterministic and auditable, but authoring them is a developer task.
- **Easy-but-opaque ML filters** that Reddit ships natively — Crowd Control, the **Harassment Filter (explicitly an LLM)**, the Reputation/Contributor-Quality filter, Ban Evasion Filter. Zero authoring, but a mod cannot express *their own* rule, cannot see why something matched, and cannot undo at the rule level.
- **Bring-your-own-AI bots** — ModerateHatespeech, Perspective API integrations, OpenAI Moderation API, Hive, ModerationAPI.com. These add toxicity scoring but are per-item LLM calls, send content off-platform, and are still "filter" not "rule."
- **Devvit App Directory** already has dozens of mod utilities (Comment Mop, Comment Nuke, Spam Source Spotter, Modmail User Info, Banhammer, Image Sourcery, Sub Stats Bot, Toolbox-notes transfer, etc.) — but these are *point tools*, not a rule platform.

**vibe-mod's wedge sits in the empty quadrant: a rule platform you author in plain English, that compiles to a deterministic/inspectable artifact, with no runtime LLM and no content ever leaving Reddit, wrapped in shadow-mode + dry-run + 30-day undo.** Nobody on this list combines "natural-language authoring" with "deterministic, content-private runtime" — the closest competitors get one or the other, never both. The risk is on table-stakes: no modmail support, no usernotes, no Toolbox migration story, English-only, and an unproven runtime (`devvit playtest` not yet done).

---

## 2. Competitor table

| Tool | What it does | Overlap with vibe-mod | vibe-mod advantage | vibe-mod gap |
|---|---|---|---|---|
| **AutoModerator** (Reddit native) [1] | YAML/regex rule DSL on posts/comments; the de-facto standard. Free, ships everywhere. | Same job: "if post matches X, do Y." Same trigger surface (post/comment). | Plain English instead of YAML+regex; clarifying question on ambiguity; mandatory shadow + dry-run + 30-day undo (AutoMod has none of these safety rails); strict-schema + action-whitelist guardrails. | AutoMod is universal, battle-tested, supports far more conditions (domain lists, karma thresholds, body regex, crosspost rules, modmail), and is *already installed*. vibe-mod must justify "yet another rule engine." |
| **ContextMod / context-mod** (FoxxMD, snoowrap bot) [2] | Event-based bot; YAML in subreddit wiki; complex user-history checks ("posted same link in N subs"), sentiment rule, dashboard, dry-run support. | Heavy overlap on philosophy: "fill AutoMod's gaps with safer, richer rules + dry-run." It even *has* a dry-run/"run mode" concept. | Devvit-native (one-click install, hosted) vs. self-host a Node bot; English authoring vs. YAML; runtime is pure-TS no-LLM vs. CM's sentiment rule calls an NLP model. | CM is more powerful at user-history logic and is years more mature. Its dry-run prior art means vibe-mod's "dry-run preview" is not novel by itself. |
| **Better-Auto-Moderator (BAM)** [3] | "AutoMod but better" — identical YAML syntax, more conditions/actions. | Same target user (AutoMod power users wanting more). | English authoring is a different axis entirely; safety rails. | BAM keeps the YAML mental model power users already know — lower switching cost for that audience than learning to trust an LLM-compiled rule. |
| **Reddit Crowd Control** (native) [4] | Auto-collapse/filter posts & comments from users "not yet trusted in this community"; one slider, no authoring. | Both reduce mod workload on low-trust accounts; vibe-mod's "low-karma / new-account" starter rules cover similar ground. | vibe-mod lets the mod *write the exact threshold/action they want* and see/undo it; Crowd Control is a black-box slider. | Crowd Control is zero-config, ships natively, and Reddit tunes the model. vibe-mod can't match "literally one slider, already there." |
| **Reddit Harassment Filter** (native, **LLM-based**) [5] | Optional setting; an LLM auto-filters comments "likely to be harassing." | Direct conceptual rival: "AI helps moderate." | vibe-mod is *deterministic* (LLM only at edit time, never sees content), inspectable, and undoable per-action; Harassment Filter is a per-comment LLM black box you can't tune. | Reddit's filter requires literally zero work from the mod and is free/native. vibe-mod must sell "controllable & private" over "effortless." |
| **Reddit Reputation Filter / Contributor-Quality Score** (native) [5] | Filters content from accounts likely to spam, using a Reddit-internal risk score. | Overlaps vibe-mod's "low-trust account" starter rules. | vibe-mod's signals (account age, karma, post length) are transparent and rule-author-chosen; CQS is opaque. | CQS uses signals an app *can't* see (cross-Reddit behavior). vibe-mod can't replicate its detection quality. |
| **Reddit Ban Evasion Filter** (native) [6] | Auto-filters posts/comments/modmail from suspected ban evaders, using internal signals. | None on mechanism — but it's part of the "Safety Filters" suite mods think of first. | n/a (different problem). | vibe-mod has *no* ban-evasion / alt-detection capability — a gap if judges expect breadth. |
| **Devvit "automator" apps** — Modmail Automator (fsvreddit) [7], Flair Assistant [8] | YAML-configured rules for **modmail** and **flair-set events**, respectively. Devvit-native, in the App Directory. | Same "configurable rule on a Reddit event" pattern, Devvit-native, App-Directory-installable — these are the closest *structural* peers. | English authoring vs. YAML; vibe-mod covers the post/comment/report surface; shadow + undo + audit log. | They cover surfaces vibe-mod doesn't (modmail, flair triggers). A judge could ask "why not just extend Modmail Automator?" Also: they prove "YAML config on Devvit" is an accepted pattern, somewhat blunting vibe-mod's "no YAML" pitch. |
| **Comment Mop / Comment Nuke** (fsvreddit, Devvit) [9] | Mass-remove/lock entire comment chains from the ⋯ menu. | None on rules; both are mod-action tools. Comment Mop is a likely "Ported Data API" category entry — a co-competitor in the hackathon. | Different problem (vibe-mod automates *prevention*; Comment Mop is manual cleanup). | vibe-mod has no bulk-cleanup story. |
| **Spam Source Spotter, Modmail User Info, Banhammer, Image Sourcery, Sub Stats Bot, Toolbox-notes-transfer** (Devvit App Directory) [7][9][10] | Point utilities: alert on rare domains; summarize a user's history into modmail; cross-sub spammer bans; reverse-image search; subreddit stats; Toolbox→native usernotes migration. | Minimal — these are the "competition for mod attention/install slots" rather than feature competition. Several are likely fellow hackathon entries. | vibe-mod is a *platform* (mods author arbitrary rules) vs. these single-purpose tools. | Collectively they show mods value *focused* tools; vibe-mod's broader surface needs the demo to feel equally polished. |
| **Toolbox** (browser extension) [11] | The dominant mod power-tool: user history, queue tools, mod macros, removal reasons, usernotes (legacy), ban tools, bulk actions. ~60%+ of active mods use it. | None on automation; it's a manual workflow accelerator. | vibe-mod automates; Toolbox doesn't. | Toolbox sets mods' expectations for *removal reasons, usernotes, mod macros* — vibe-mod has none of those niceties. |
| **ModerateHatespeech** (nonprofit AI bot) [12] | Free toxicity API + Reddit bot that auto-reports/removes "toxic" comments; ~98% claimed accuracy, ~4% FP. | Conceptual rival on "AI for moderation"; produces `report`/`remove` actions like vibe-mod. | vibe-mod doesn't send content off-platform and is deterministic; MHS is a per-comment ML call to an external service. | MHS actually does toxicity detection well; vibe-mod's deterministic evaluator can't do "is this comment hateful?" — only structural rules. |
| **Perspective API / OpenAI Moderation API / Hive / ModerationAPI.com** [13][14][15] | Toxicity / policy-category scoring services; some have Reddit integrations (ModerationAPI.com explicitly). Free (Perspective, OpenAI) to paid (Hive). | "AI scores content" overlap; could be embedded in a competing Devvit app. | vibe-mod's runtime makes **zero** per-item AI calls and never ships content to a third party — a real privacy/cost differentiator vs. all of these. | These provide semantic content understanding vibe-mod deliberately forgoes. A "vibe-mod + Moderation API" hybrid would be strictly more capable. |
| **Karmatic, Conbersa, and other "Reddit mgmt" SaaS** [11][16] | Analytics / community-management dashboards (often marketing-oriented), not in-subreddit automation. | Negligible. | vibe-mod operates inside the subreddit with real mod permissions. | Not a real competitor; ignore. |

> Note on the hackathon field: the Devpost project gallery for *Mod Tools and Migrated Apps* was **not yet published** as of 2026-05-13 [17], so direct entry-by-entry comparison isn't possible. Expect "Ported Data API App" entries to include things like Comment Mop and other fsvreddit tools (already in flight) and "New Mod Tool" entries to skew toward modmail automation, queue-triage assistants, and analytics dashboards. vibe-mod's NL-rule-compiler angle does not obviously collide with any known entry.

---

## 3. Positioning statement

> **vibe-mod is the only Reddit mod tool that turns a sentence into a deterministic rule.** You describe what you want in plain English; vibe-mod compiles it — once, at edit time — into an inspectable JSON rule that runs in pure TypeScript with zero AI calls per post and no subreddit content ever leaving Reddit. Every new rule starts in 24-hour shadow mode, ships with a dry-run preview, and every action it takes is one click to undo for 30 days — so adopting it is risk-free.

(One-liner: _"AutoModerator's power, plain-English authoring, and a safety net AutoModerator never had — without an AI reading your subreddit."_)

---

## 4. Do NOW vs LATER

### Do NOW (before submission — these win or lose the judging)

1. **Land the live demo.** Run `devvit playtest`, get the three screenshots README promises (compose form → dry-run preview → audit log), and ideally a 60-90s screen recording. Polish/launch-readiness is an explicit scoring criterion [18]; an unrun app loses to a polished single-purpose competitor.
2. **Lead the pitch with the differentiator, not the feature list.** In the Devpost write-up and README, the *first* sentence must be "sentence → deterministic rule, no runtime AI, content never leaves Reddit, shadow+dry-run+undo." Don't bury it under architecture diagrams. Explicitly contrast with (a) AutoMod's YAML/regex barrier and (b) the Harassment/Reputation filters' black-box nature — judges know those products.
3. **Own "deterministic & private" as the wedge.** Add one slide/section: a side-by-side — *AutoMod: deterministic ✔, easy to author ✘, safety net ✘* | *Harassment Filter: deterministic ✘, easy ✔, inspectable ✘* | *ModerateHatespeech: content leaves platform ✘* | *vibe-mod: ✔✔✔✔*. This is the strongest honest claim and no competitor checks all boxes.
4. **Show breadth in the starter rules.** Make the 5 seeded rules visibly diverse (low-karma post, ALL-CAPS title, link-domain match, short low-effort post, report-escalation) so the demo proves it's a *platform*, not a one-rule toy. This is the cheapest defense against "why not just use AutoMod."
5. **Name the safety story explicitly as a feature, not an implementation detail.** "24h shadow → dry-run → 30-day undo → action whitelist → circuit breaker" is genuinely more than AutoMod *or* ContextMod offer as a package. Give it a name ("safe-by-default rollout") and a UI surface.
6. **Pre-empt the obvious objection in writing:** "Why trust an LLM-compiled rule?" → because the LLM output is strict-Zod-validated + action-whitelisted before storage, you see the compiled rule, you dry-run it, and it runs shadow-first. Say this *before* a judge asks.

### LATER (post-hackathon roadmap — mention as "what's next," don't build now)

- **Modmail trigger surface** (the single biggest table-stakes gap vs. Modmail Automator / Reddit's filtered folder).
- **Richer conditions**: link-domain allow/deny lists, crosspost rules, user-history checks ("posted in these subs"), comment-body regex — closing distance to AutoMod/ContextMod feature parity.
- **Removal reasons + native mod-notes integration** on actions (Toolbox-shaped expectations).
- **Multi-language rule authoring** (currently English-only, a hard lock — call it out as a known limitation).
- **Optional "semantic" rule type** that *does* call a moderation classifier (OpenAI Moderation API / Perspective) for "is this toxic?" — clearly opt-in, clearly the one place content leaves, so the deterministic-by-default promise stays intact. This is how you eventually compete with the Harassment Filter and ModerateHatespeech on their turf without abandoning the wedge.
- **Toolbox/usernotes import** and an AutoMod-YAML importer ("paste your AutoMod config, get an editable English version") — a strong migration hook.
- **Per-rule analytics** ("this rule matched 412 items / 0.7% FP based on your overrides") to compete with the analytics-dashboard entries.

---

## Sources

1. AutoModerator wiki — https://www.reddit.com/wiki/automoderator/ ; Reddit Help "Moderation Tools overview" — https://support.reddithelp.com/hc/en-us/articles/15484384020756-Moderation-Tools-overview
2. ContextMod — https://contextmod.dev/ ; https://github.com/FoxxMD/context-mod ; subreddit config & "run mode"/dry-run — https://contextmod.dev/subreddit-configuration/
3. Better-Auto-Moderator (BAM) — https://github.com/josephwegner/better-auto-moderator
4. Crowd Control — https://support.reddithelp.com/hc/en-us/articles/15484545006996-Crowd-Control
5. Safety Filters (Harassment Filter "uses a large language model", Reputation Filter / Contributor Quality Score) — https://support.reddithelp.com/hc/en-us/articles/15484574845460-Safety-Filters ; https://redditforcommunity.com/features/safety-filters
6. Ban Evasion Filter — https://support.reddithelp.com/hc/en-us/articles/15484544471444-Ban-evasion-filter ; https://mods.reddithelp.com/hc/en-us/articles/14548700210829-Ban-Evasion-Filter
7. Modmail Automator (Devvit, YAML-configured) — https://github.com/fsvreddit/automodmail ; Made-on-Reddit Mod Tools — https://redditforcommunity.com/made-on-reddit/mod-tools
8. Flair Assistant (Devvit) — https://redditforcommunity.com/made-on-reddit/mod-tools
9. Comment Mop — https://github.com/fsvreddit/comment-nuke (Comment Nuke) / Comment Mop README — https://github.com/fsvreddit/comment-nuke/blob/main/README.md ; Spam Source Spotter — https://github.com/fsvreddit/spam-src-spotter ; Modmail User Info — https://github.com/fsvreddit/modmail-userinfo ; Sub Stats Bot — https://github.com/fsvreddit/sub-stats-bot ; Toolbox notes transfer — https://github.com/fsvreddit/toolboxnotesxfer
10. Banhammer, Image Sourcery, Ban Context — https://redditforcommunity.com/made-on-reddit/mod-tools
11. Moderator Toolbox — https://chromewebstore.google.com/detail/moderator-toolbox-for-red/jhjpjhhkcbkmgdkahnckfboefnkgghpo ; https://github.com/toolbox-team/reddit-moderator-toolbox ; usage stats / overview — https://karmatic.ai/the-most-popular-moderator-tools-on-reddit/
12. ModerateHatespeech — https://moderatehatespeech.com/ ; Reddit bot — https://github.com/ModerateHatespeech/Reddit ; case study — https://moderatehatespeech.com/research/reddit-case-study/
13. Google Perspective API (e.g. ConversationAI Reddit moderator) — https://github.com/conversationai/conversationai-moderator-reddit
14. OpenAI Moderation API (omni-moderation-latest, free) — https://developers.openai.com/api/docs/guides/moderation ; https://openai.com/index/upgrading-the-moderation-api-with-our-new-multimodal-moderation-model/
15. ModerationAPI.com Reddit integration — https://moderationapi.com/integrations/reddit-content-moderation ; Hive / market overview — https://www.edenai.co/post/best-text-moderation-apis
16. Conbersa Reddit community tools — https://www.conbersa.ai/learn/best-reddit-community-management-tools
17. Hackathon Devpost (gallery not yet published) — https://mod-tools-migration.devpost.com/ ; project gallery — https://mod-tools-migration.devpost.com/project-gallery
18. Hackathon scoring emphasizes polish / launch-readiness — https://mod-tools-migration.devpost.com/ ; Reddit Developer Platform 101 — https://redditforcommunity.com/blog/developer-platform-101
