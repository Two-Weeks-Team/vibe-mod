# vibe-mod - Devpost Submission Copy

Generated: 2026-05-26 KST  
Hackathon: Reddit Mod Tools and Migrated Apps Hackathon  
Track: Best New Mod Tool

This is the current, paste-ready Devpost write-up based on the live Reddit App
Directory listing, current `main` README, `devvit.json`, architecture docs,
developer docs, and latest CI. Do not reintroduce old v0.0.49/v0.0.51 framing;
the current public submission story is the App Directory listing plus the public
GitHub repo and landing page.

## Standard Fields

### Project Name

vibe-mod

### Tagline

Write a moderation rule in plain English. vibe-mod compiles it once, runs it
deterministically, shadows it first, and keeps one-click undo.

### Category

Best New Mod Tool

### Built With

Reddit Devvit, TypeScript, Hono, Zod, OpenAI gpt-5.4-mini, Devvit Redis, Vite,
Vitest, @devvit/test, GitHub Actions

### Links

- Reddit App Directory: https://developers.reddit.com/apps/vibe-mod
- Source code: https://github.com/Two-Weeks-Team/vibe-mod
- Product landing page: https://two-weeks-team.github.io/vibe-mod/
- Terms of Service: https://github.com/Two-Weeks-Team/vibe-mod/blob/main/docs/tos.md
- Privacy Policy: https://github.com/Two-Weeks-Team/vibe-mod/blob/main/docs/privacy.md

### Media Assets

- Devpost thumbnail, 3:2: `assets/devpost-thumbnail.jpg`
- App icon: `assets/icon.png`
- Banner: `assets/banner.jpg`
- Landing page with visual walkthrough: https://two-weeks-team.github.io/vibe-mod/

## Summary

vibe-mod lets a Reddit moderator type a rule in plain English, such as "send
links from accounts under 7 days old to the mod queue," and turns it into a
validated, deterministic moderation rule. The AI is used only when the moderator
writes the rule. Once the rule is saved, every post and comment is evaluated by
plain TypeScript: no model call, no network call, no per-post token cost, and no
Reddit content sent to the model.

The product is built around trust. Every new rule starts in dry-run/shadow mode,
the moderator sees a preview before activation, live actions are capped by a
rate limiter, and every action carries a 30-day undo path. It is not an AI judge
for Reddit content; it is a rule compiler for moderators.

## Inspiration

AutoModerator is powerful, but it asks moderators to think in YAML, regular
expressions, and exact syntax. Many mod teams know the rule they want in normal
language but do not have a specialist who can safely translate that intent into
configuration. A small typo can remove the wrong posts, and a newly saved rule
can go live before anyone sees its effect.

We wanted the ease of a natural-language interface without turning moderation
into a black-box AI decision. The useful job for a language model here is not
"judge this post." The useful job is "compile this moderator's intent into a
structured rule." vibe-mod keeps that boundary strict: the model sees only the
moderator's typed rule sentence, never post bodies, comment bodies, usernames,
or community content.

That gives moderators a safer path: describe the rule, inspect the compiled
logic, preview matches, let the rule observe in shadow mode, and undo any action
if needed.

## What It Does

vibe-mod adds moderator-only Devvit menu actions to a subreddit:

1. **Compose rule**: a moderator writes a rule in plain English and clicks
   Compile + Preview. OpenAI gpt-5.4-mini translates the sentence into a JSON
   rule. vibe-mod then validates that output with a strict Zod schema and an
   action whitelist before it can be stored.
2. **Preview and clarify**: if the sentence is ambiguous, vibe-mod asks a
   clarifying question instead of guessing. If it compiles, the moderator sees a
   dry-run preview against recent posts before activation.
3. **Shadow-first activation**: new rules default to shadow mode. They log what
   they would do, but do not take live action until the configured shadow window
   has passed.
4. **View rules + log**: moderators can inspect active and draft rules, recent
   shadow decisions, live actions, and potential multi-rule conflicts.
5. **Manage rules**: moderators can activate, pause, or delete rules per rule.
6. **Undo this action**: when vibe-mod acts on a post or comment, the item menu
   exposes a rollback action for 30 days.

Safety controls are built in: a subreddit-level dry-run-only switch, a max
actions per hour circuit breaker, 50 compiles per day per subreddit, Devvit
Redis audit storage, and guarded actions. The model can emit report, flair,
lock, modqueue, and remove by default; ban, mute, permaban, and approve require
explicit moderator opt-in.

## How We Built It

vibe-mod is a server-only Devvit Web app. `devvit.json` declares the server
bundle, moderator menu items, form endpoints, post/comment/report/flair-update
triggers, scheduler tasks, Devvit Redis, Reddit moderator permissions, and the
single outbound HTTP domain: `api.openai.com`.

The core architecture is:

- **Compile path**: moderator sentence -> OpenAI gpt-5.4-mini -> strict JSON
  rule -> Zod parse -> action whitelist -> draft rule in Devvit Redis.
- **Runtime path**: Devvit trigger -> fact bag -> deterministic evaluator ->
  shadow log or live action -> rollback token and audit entry.
- **Schedulers**: audit retention, dry-run replay, shadow promotion checks, and
  rate-limit circuit breaker.

The rule evaluator is intentionally pure TypeScript. It evaluates a closed set
of facts from the Reddit item, author context, and subreddit-scoped state. It
does not call OpenAI, perform network I/O, or make stochastic decisions. This is
the core guarantee: AI helps author the rule; deterministic code applies it.

Testing had to compensate for the lack of a full local Devvit runtime. The repo
uses Vitest route tests against `app.fetch()`, an in-memory Devvit-style test
setup, property-style checks around the schema and evaluator, the official
`@devvit/test` harness, and an acceptance script that checks Devvit config,
route wiring, compiler/schema sync, rollback support, scheduler wiring, starter
rules, and ToS/Privacy presence. CI runs lint, format check, typecheck,
coverage tests, `@devvit/test`, acceptance, Vite build, and a server-bundle load
smoke test.

Current evidence:

- Public App Directory listing: https://developers.reddit.com/apps/vibe-mod
- Public GitHub repo: https://github.com/Two-Weeks-Team/vibe-mod
- MIT license file in repo
- CI green on `main`
- 236 tests passing, 1 skipped
- Coverage: 86.31% statements, 87.96% lines
- App icon compressed under Devvit's 500 KB limit

## Challenges We Ran Into

The biggest design challenge was keeping the AI boundary honest. A generic AI
moderation bot would be easier to describe but harder to trust: it would need
to read community content and make a judgment on every post. vibe-mod takes the
opposite approach. The model only translates the moderator's typed sentence, and
the rest of the system is deterministic.

That meant the schema had to be strict, the prompt had to stay aligned with the
schema, and invalid output had to fail closed. The action whitelist is separate
from the schema so a parsed rule still has to pass a policy gate before it can
be stored. Ambiguity is handled as a product path: ask a clarifying question
instead of guessing.

Devvit also shaped the implementation. The app had to fit Devvit's permission,
settings, Redis, scheduler, and server-bundle model. We added a doctor script to
check config integrity, declared only one fetch domain, and kept OpenAI key
management as a developer-owned encrypted global setting so subreddit
moderators do not need to bring keys or billing.

Finally, multi-rule behavior required an honest scope decision. The current app
executes every matching rule in order, but repo HEAD also surfaces a read-only
potential conflict preview in the dashboard. It warns moderators about likely
collisions without pretending to solve full predicate satisfiability or runtime
arbitration.

## Accomplishments We're Proud Of

- **AI as a compiler, not a judge**: the model never reads Reddit content and
  never runs per post.
- **Deterministic hot path**: runtime moderation is repeatable TypeScript logic,
  not inference.
- **Safety by default**: dry-run preview, shadow mode, guarded actions, action
  rate limit, audit log, and 30-day undo.
- **Moderator-first install story**: no OpenAI key and no billing for
  subreddit moderators; vibe-mod covers compile cost with a daily quota.
- **Real Devvit distribution**: the app is listed on the Reddit App Directory.
- **Strong verification**: CI covers lint, formatting, strict TypeScript,
  coverage tests, Devvit harness tests, acceptance gates, build, and bundle
  smoke loading.
- **Clean public package**: README, architecture notes, developer guide, ToS,
  Privacy Policy, MIT license, banner, icon, and product landing page are all
  available.

## What We Learned

The safest use of AI in moderation is to narrow its job. A language model is
useful for translating intent into a structured rule, but the actual moderation
decision should be deterministic, inspectable, and reversible.

We also learned that trust features are not secondary polish. Shadow mode,
preview, audit logs, rate limits, and undo are what make a natural-language rule
tool usable by real moderators. Without those controls, "write rules in English"
would be convenient but dangerous.

On the platform side, Devvit rewards small, explicit systems. Declaring exact
permissions, keeping state in subreddit-scoped Redis, and proving route/config
parity made the app easier to review and easier to explain.

## What's Next

The next version should expand the fact layer while keeping the deterministic
model intact. Useful additions include more account-history signals, richer
link/domain patterns, repost indicators, edited-content facts, and better
language signals.

We also want to deepen rule management: conflict warnings during compose, an
explicit promotion gate for high-risk conflicts, rule import/export between
subreddits, and a richer dashboard with hit-rate history and false-positive
annotations.

Longer term, vibe-mod can become a migration path from hand-written
AutoModerator configs: read an existing AutoMod rule, translate it into
vibe-mod's structured schema, preview the result, and let the moderator decide
whether to switch.

## Project Impact

vibe-mod is built for small and mid-sized subreddit teams that need real
moderation automation but do not have someone comfortable maintaining YAML and
regex. It is also useful for larger teams that want safer rule rollout: write a
plain-English rule, preview it, let it shadow real traffic, then promote it with
undo available.

The first concrete demo community is `r/SocialSeeding`, configured in
`devvit.json` as the playtest subreddit. More broadly, any moderator who can
install a Devvit app can try vibe-mod from the public App Directory. The most
natural early adopters are communities with recurring low-effort posts,
new-account spam, link spam, ALL-CAPS titles, flair-triggered cleanup, and
report-driven review workflows.

The impact is not only fewer manual moderation actions. It is lower risk when a
new rule is introduced. Moderators can move from "I hope this YAML does what I
meant" to "I can see what this rule would do before it does anything."

## Compliance And Evidence Notes

- Built on Reddit Devvit: yes, `devvit.json` is the app configuration.
- Public App Directory listing: yes, `https://developers.reddit.com/apps/vibe-mod`.
- Public source: yes, `https://github.com/Two-Weeks-Team/vibe-mod`.
- License: MIT license file present in repo.
- External fetch domains: exactly `api.openai.com`.
- Reddit content sent to OpenAI: no; only the moderator's typed rule sentence is
  sent.
- Runtime AI calls per post/comment: zero.
- ToS and Privacy Policy: present in `docs/tos.md` and `docs/privacy.md`.
- Current non-video submission evidence: README, App Directory page, landing
  page, source repo, CI, tests, architecture docs, developer docs.

## Final Submitter Checklist

These are account-level Devpost fields that are not inferable from the repo and
must be filled by the human submitter:

- Team member Reddit username(s)
- Devpost team/member confirmation
- Any optional video URL, if the submitter chooses to include one
- Any optional feedback survey linked by the hackathon organizers

Do not invent Reddit usernames or community endorsements. The copy above is
complete without claiming endorsements beyond the public App Directory listing,
the public source repo, and the `r/SocialSeeding` playtest/demo context.
