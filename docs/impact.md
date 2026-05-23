# Moderator impact

> What vibe-mod measurably changes for a moderator, stated honestly. Claims are split into **architectural facts** (true by construction, verifiable in this repo right now) and **to‑measure** metrics (defined precisely, but requiring a real-subreddit pilot to fill in — **not yet measured, and not claimed as results**).

---

## A. Architectural facts (verifiable today, no pilot required)

These follow from the code and schema in this repo; a judge can confirm each by reading the cited file.

| Fact | Value | Where to verify |
|---|---|---|
| LLM calls **per post/comment at runtime** | **0** — runtime evaluation is pure TypeScript, zero network | [`src/server/evaluator.ts`](../src/server/evaluator.ts) (no `fetch`, no model) |
| LLM calls **per rule** | exactly **1**, at rule-edit time | [`src/server/routes/compose.ts`](../src/server/routes/compose.ts) → `callOpenAI` |
| Reddit content sent to the LLM | **none** — only the moderator's own typed sentence + a fixed system prompt | [`src/shared/system-prompt.ts`](../src/shared/system-prompt.ts), README *Fetch domains* |
| New rule's blast radius for the first **24h** | **0 live actions** — shadow mode logs "would do X", acts on nothing, by default | `shadow` defaults `true` in [`rule-schema.ts`](../src/shared/rule-schema.ts); promotion gate in [`routes/scheduler.ts`](../src/server/routes/scheduler.ts) |
| Reversibility of a live action | **100% within 30 days** — every live action writes a rollback token + audit entry | [`src/server/executor.ts`](../src/server/executor.ts) |
| Actions the LLM may emit without explicit opt-in | **5** (`report`/`flair`/`lock`/`modqueue`/`remove`); `ban`/`mute`/`permaban`/`approve` require a moderator checkbox | `SAFE_ACTIONS` / `GUARDED_ACTIONS` in [`rule-schema.ts`](../src/shared/rule-schema.ts) |
| Rules a sub can hold | hard cap **50** active rules; predicate tree depth ≤ **6** | `RuleBundle.rules.max(50)`, `MAX_TREE_DEPTH` in [`rule-schema.ts`](../src/shared/rule-schema.ts) |
| Automated test coverage of this trust boundary | **168 unit + route tests, property-based tests (fast-check), `@devvit/test` harness, G1–G4 acceptance gates** | `npm test`, `npm run check` |

**The headline impact:** a moderator can write a rule and incur **zero risk of irreversible action for at least 24 hours**, and **zero per-post inference cost forever**, because the model has already done its one job by the time the rule is stored.

---

## B. Metrics to measure (defined now, filled by a pilot — *to measure*, not claims)

Each metric below has a precise definition and a data source so a pilot can fill it in. **No number here is asserted as a current result.**

### B1. Dry-run match rate — *to measure*
- **Definition:** of the last *N* recent posts a draft rule was replayed against, the fraction it would have matched (`matched / sampledPosts`).
- **Source:** already computed and surfaced per draft rule in the dashboard dry-run preview ([`routes/dashboard.ts`](../src/server/routes/dashboard.ts) → `would match X/Y recent post(s)`). The number exists per-rule at runtime; the *aggregate* across a real sub is what needs a pilot.
- **Why it matters:** a match rate near 0% or near 100% on a sample is an early "this rule is mis-scoped" signal *before* activation.

### B2. False-positive review workflow — *workflow shipped, rate to measure*
- **Workflow (shipped today):** draft → **dry-run preview** (catch obvious mis-matches) → **24h shadow** (catch real-traffic mis-matches with zero action) → mod reviews shadow audit entries → **promote to live** → any live mistake is **one-click undone for 30 days**. Three independent catch points before an irreversible action is even possible.
- **Metric to measure:** false-positive rate = shadow/live actions a mod judged "shouldn't have fired" ÷ total fired. Source: audit log outcome + a mod "was this correct?" tag (the tag is a pilot addition).

### B3. Estimated moderator time saved — *to measure (transparent model, no asserted number)*
- **Authoring time model:** AutoMod equivalent = (time to recall YAML syntax) + (write regex) + (test by trial-and-error on live traffic, since AutoMod has no dry-run). vibe-mod = (type one English sentence) + (read dry-run preview). The *delta* is the saving; **the minutes are to be measured in a pilot, not asserted here.**
- **Triage time model:** time saved = (posts auto-routed to modqueue/flaired/removed by an active rule) × (avg manual triage seconds/item). Source: count of live `applied` outcomes in the audit log × a per-sub manual-triage constant (the constant is pilot-supplied).

### B4. Shadow decisions reviewed before live promotion — *to measure*
- **Definition:** number of "would have done X" shadow audit entries a moderator can review during the 24h window before a rule auto-promotes.
- **Source:** count of `outcome = shadow` audit entries for a rule between `activatedAt` and `activatedAt + shadowDurationHours`. Already recorded; the per-sub volume needs a pilot.
- **Why it matters:** this is the quantity that makes "shadow mode" more than a label — it is the evidence a mod actually inspects before trusting a rule.

### B5. Rollback / audit-log value — *partly architectural, usage to measure*
- **Architectural (today):** 100% of live actions are individually reversible for 30 days, and every shadow + live decision is logged with its source rule and outcome.
- **To measure:** rollback-usage rate = undone actions ÷ live actions (a low rate after shadow review is the goal); audit-log open rate (how often mods actually inspect it).

---

## C. How a judge can sanity-check the "impact" claims in 2 minutes

1. Open [`src/server/evaluator.ts`](../src/server/evaluator.ts) → confirm there is **no network call** → runtime AI cost is structurally zero.
2. Open [`rule-schema.ts`](../src/shared/rule-schema.ts) → confirm `shadow` defaults to `true` and the action whitelist is hard-coded → safety is by construction, not configuration.
3. Run `npm test` → confirm the 168-test suite that guards the LLM→schema→whitelist boundary is green.

Everything in §A survives that check. Everything in §B is honestly labelled **to measure**.
