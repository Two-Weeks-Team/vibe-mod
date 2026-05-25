# vibe-mod — architecture

The single load-bearing idea: **build-time AI, runtime determinism.** The model runs exactly once per
rule edit; runtime evaluation is plain TypeScript — no network, no model, fully reproducible.

```
Moderator types a rule
        │  (only the moderator's sentence is sent — never Reddit content)
        ▼
OpenAI gpt-5.4-mini   ──►  JSON  ──►  Zod strict parse + action whitelist  ──►  rules:draft (Redis)
   (build-time only)                         (reject if invalid)
        │  dry-run preview / activate
        ▼
rules:active (Redis)
        │
Reddit triggers (onPostSubmit / onCommentSubmit / onPostReport / onCommentReport / onPostFlairUpdate)
        ▼
Deterministic evaluator (pure TS, 0 network, 0 LLM)  ──►  fact bag from the item + author + sub state
        ▼
Action executor  ──►  shadow? log only  :  live? act + write 30-day undo token + audit entry
        ▲
Scheduler: audit retention (daily) · dry-run replay · shadow-promote check (15 min) · rate-limit breaker (5 min)
```

## Guarantees that hold by construction

| What | Value | Verify |
| --- | --- | --- |
| LLM calls per post/comment at runtime | **0** (pure-TS evaluator, no network) | [`src/server/evaluator.ts`](../src/server/evaluator.ts) |
| LLM calls per rule | exactly **1**, at edit time | [`src/server/routes/compose.ts`](../src/server/routes/compose.ts) |
| New-rule blast radius for first 24h | **0 live actions** (shadow default on) | `shadow: true` in [`rule-schema.ts`](../src/shared/rule-schema.ts) |
| Live action reversibility | **100% for 30 days** (per-action undo) | [`src/server/executor.ts`](../src/server/executor.ts) |
| Reddit content sent to the LLM | **none** (only the mod's typed sentence) | README → _Fetch domains_ |

## Runtime

- **Devvit Web app** (Hono server, `@devvit/web`); all state in Devvit Redis, scoped per installation:
  `rules:active`, `rules:draft`, `audit`, `rollback:<actionId>`, plus daily-quota counters.
- The evaluator builds a **fact bag** from the triggering item + author account + subreddit-scoped state,
  then evaluates the rule's boolean tree over a closed set of fact paths. Zero network, zero model.
- The executor, in shadow, only logs; live, it acts and writes a 30-day undo token + an audit entry.
- Multi-rule conflicts are surfaced as a read-only preview in _"vibe-mod: View rules + log"_
  (see [`conflict-handling.md`](./conflict-handling.md)).

## Tested without Devvit's runtime

A 236-test suite (1 skipped): unit + route tests (`app.fetch()` against Devvit/OpenAI doubles) +
property-based tests, the official [`@devvit/test`](https://www.npmjs.com/package/@devvit/test) harness
for the executor, an `npm run acceptance` gate (G1–G4), and an `npm run replay` event replayer. The Devvit
runtime itself (routing, payload injection, RPC) is verified by `devvit playtest`. See
[`for-developers.md`](./for-developers.md).
