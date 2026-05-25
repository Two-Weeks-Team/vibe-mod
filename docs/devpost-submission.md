# vibe-mod - Say It, Ship Subreddit Rules

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

vibe-mod - Say It, Ship Subreddit Rules

Use the full name above in Devpost's **Project name** field. It stays within
the 60-character limit while making the core wow point visible before judges
open the project page.

### Elevator Pitch

Say the rule. Run safer subreddit moderation. vibe-mod covers AI compile cost,
then enforces deterministic checks with $0 per-post AI cost and 30-day undo.

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

- Devpost thumbnail, 3:2: `assets/devpost-thumbnail.png`
- App icon: `assets/icon.png`
- Banner: `assets/banner.jpg`
- Landing page with visual walkthrough: https://two-weeks-team.github.io/vibe-mod/

## Project Story

Copy from **Inspiration** through **What's next** into Devpost's **About the
project** field. Keep the later impact and compliance notes as reference unless
there is room for an extra section.

## Inspiration

Most subreddit rules start as a sentence, not YAML. A mod sees the same pattern
all week - fresh accounts dropping links, ALL-CAPS titles, short low-effort
posts - and knows exactly what should happen. The hard part is turning that
judgment into automation that is safe enough to run on a live community.

AutoModerator is powerful, but it asks volunteer mod teams to maintain YAML,
regex, and exact syntax. A small mistake can catch the wrong posts, and a new
rule can affect a community before anyone has seen what it would do.

The product line became: **say it, ship subreddit rules**. The safety line
became just as important: the model can help write the rule, but it should never
be the judge of the community.

We built vibe-mod for the gap between "I know the rule I want" and "I trust this
rule enough to turn it on."

## What it does

vibe-mod is a Devvit mod tool that turns a moderator's plain-language rule into
a validated subreddit rule. A moderator can type something like "send links from
accounts under 7 days old to the mod queue," preview what it would catch, save
it as a draft, and let it run in shadow mode before it takes real action.

The AI runs only when a moderator clicks Compile. After that, the saved rule
runs as deterministic TypeScript with **$0 per-post AI cost**. The model never
reads subreddit posts, comments, usernames, or community history. It only sees
the rule sentence the moderator typed.

The moderator experience is:

- **Compose rule**: write the rule in normal language.
- **Compile + Preview**: vibe-mod validates the compiled rule and shows what it
  would do before anything happens.
- **Shadow first**: new rules log decisions before going live.
- **Manage rules**: pause, activate, delete, and inspect active or draft rules.
- **Undo this action**: every live action keeps a 30-day rollback path.

Subreddit moderators do not need an OpenAI key or billing account. vibe-mod
covers AI compilation up to a daily quota, then enforces saved rules without
model calls.

## How we built it

vibe-mod is a server-only Reddit Devvit app built with TypeScript. Devvit
handles the moderator menu actions, form submissions, post/comment/report
triggers, scheduled jobs, permissions, and subreddit-scoped Redis storage.

There are two main paths:

- **Compile path**: moderator sentence -> OpenAI gpt-5.4-mini -> strict JSON
  rule -> Zod parse -> action whitelist -> draft rule in Devvit Redis.
- **Runtime path**: Devvit trigger -> fact bag -> deterministic evaluator ->
  shadow log or live action -> audit entry and rollback token.

The rule evaluator is intentionally pure TypeScript. It evaluates a closed set
of facts from the Reddit item, author context, and subreddit-scoped state. It
does not call OpenAI, perform network I/O, or make stochastic decisions. That is
the core guarantee: AI helps author the rule; deterministic code applies it.

We also built the boring parts that make the idea usable: strict schema
validation, guarded moderation actions, a subreddit-level dry-run switch, action
rate limits, audit entries, rollback tokens, scheduler checks, starter rules,
Terms and Privacy docs, and CI.

## Challenges we ran into

The hardest decision was saying no to the obvious AI bot. It would have been
flashier to call a model on every post, but moderators need consistency,
privacy, and predictable cost. A model that reads every submission is expensive
and hard to audit. A compiled rule is cheaper, repeatable, and easier to
explain.

That choice made the implementation stricter. Model output has to pass a Zod
schema, then pass an action whitelist, then be stored as a draft. If the request
is ambiguous, vibe-mod asks a clarifying question instead of guessing. If a rule
would use guarded actions like ban, mute, permaban, or approve, the moderator has
to opt in explicitly.

Devvit also shaped the implementation. The app had to fit Devvit's permission,
settings, Redis, scheduler, and server-bundle model. We added a doctor script to
check config integrity, declared only one fetch domain, and kept OpenAI key
management as a developer-owned encrypted global setting so subreddit
moderators do not need to bring keys or billing.

Finally, multi-rule behavior required an honest scope decision. The current app
executes every matching rule in order, but it also surfaces potential conflict
warnings in the dashboard. That tells moderators where rules may collide without
pretending the app can solve every policy question automatically.

## Accomplishments that we're proud of

- vibe-mod is live in the Reddit App Directory.
- The model is used as a rule compiler, not a content judge.
- Runtime moderation has **$0 per-post AI cost**.
- New rules get preview and shadow mode before live action.
- Every action has a 30-day undo path.
- Guarded actions require explicit moderator opt-in.
- Subreddit moderators do not need their own OpenAI key or billing account.
- The public repo includes README, architecture notes, developer docs, Terms,
  Privacy Policy, MIT license, icon, thumbnail, and landing page.
- The current suite has 236 passing tests, 1 skipped test, CI, Devvit harness
  checks, acceptance gates, build checks, and server-bundle smoke loading.

## What we learned

The safest use of AI in moderation is to narrow its job. A language model is
useful for translating moderator intent into structure. It should not be the
thing making live moderation decisions on every post.

We also learned that trust features are not polish. Preview, shadow mode, audit
logs, rate limits, guarded actions, and undo are what make natural-language
moderation usable by real mod teams. Without those controls, "say the rule"
would be convenient but risky.

On the platform side, Devvit rewards small, explicit systems. Declaring exact
permissions, keeping state in subreddit-scoped Redis, and proving route/config
parity made the app easier to review and easier to explain.

## What's next

Next, we want to add richer rule signals while keeping the deterministic model
intact: more account-history facts, richer link/domain patterns, repost
indicators, edited-content facts, and better language signals.

We also want to make rule management stronger: conflict warnings during compose,
an explicit promotion gate for high-risk conflicts, rule import/export between
subreddits, and a dashboard with hit-rate history and false-positive notes.

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
