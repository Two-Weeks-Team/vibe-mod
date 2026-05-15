// shared/rule-schema.ts
// Single source of truth for vibe-mod's rule shape.
// Imported by:
//   - server/index.ts (OpenAI response validator)
//   - server/evaluator.ts (runtime predicate evaluator)
//   - server/executor.ts (action whitelist enforcement)
//
// IMPORTANT: every field here is a security boundary.
// LLM output MUST validate against this schema before storage.
// Anything outside the schema = silent drop, not silent accept.

import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────────
// Permitted action verbs — HARDCODED in code, not in prompt.
//   "safe":   LLM can freely emit these
//   "guarded": LLM can emit, but the form layer requires explicit checkbox
//   "denied": LLM proposes → server rejects compile
// ──────────────────────────────────────────────────────────────────────────────
export const SAFE_ACTIONS = ['report', 'flair', 'lock', 'modqueue', 'remove'] as const;
// 'approve' is GUARDED (not SAFE) because its failure mode is asymmetric:
// CRITICAL RULE #5 forces the LLM to require the explicit verb "remove" — but
// natural language has many positive paraphrases ("trust regulars", "let them
// through", "whitelist") that an LLM might compile to `approve`. A mistaken
// approve waves spam/abusive content through (irreversible reputation cost),
// whereas a mistaken remove rolls back. Mods must opt-in via the "Allow
// guarded actions" checkbox before approve is even storable.
export const GUARDED_ACTIONS = ['ban', 'mute', 'permaban', 'approve'] as const;
export const ACTION_VERBS = [...SAFE_ACTIONS, ...GUARDED_ACTIONS] as const;
export type ActionVerb = (typeof ACTION_VERBS)[number];

// ──────────────────────────────────────────────────────────────────────────────
// Fact bag — every fact the predicate tree can reference.
// Hand-built per event, never sourced from LLM. Closed schema.
// ──────────────────────────────────────────────────────────────────────────────
export const FactPaths = [
  // Author (account-level)
  'author.accountAgeHours',
  'author.totalKarma',
  'author.postKarma', // link/post karma only
  'author.commentKarma', // comment karma only
  'author.subKarma',
  'author.isModerator',
  'author.hasVerifiedEmail',
  'author.subJoinAgeHours', // estimated: time since first activity in this sub

  // Author flair (sub-scoped — set by mods of this sub).
  // Empty string when the author has no flair in this sub. Useful for
  // "trusted contributor" patterns (e.g. flair text contains 'verified').
  'author.flairText',

  // Content (post or comment body)
  'content.length',
  'content.wordCount', // whitespace-delimited token count of the body
  'content.linkCount',
  'content.imageCount', // image URLs detected in the body (+1 if the post itself links an image)
  'content.upperCaseRatio', // body's A–Z uppercase ratio (0 for link posts / empty bodies)
  'content.nonAsciiRatio', // fraction of non-ASCII characters in the body (0 for empty body) — a crude "non-English / different script" signal
  'content.isLinkPost', // true for a link/image/video submission (no selftext body); always false for comments
  'content.over18', // post flagged NSFW (the post's own flag, not the subreddit's); always false for comments
  'content.isVideo', // post is a video submission; always false for comments
  'content.isSpoiler', // post flagged as a spoiler; always false for comments
  'content.isCrosspost', // post is a crosspost of another post; always false for comments
  'content.containsRegex', // requires .params.regex
  'content.title.length',
  'content.title.contains', // requires .params.needle
  'content.title.upperCaseRatio', // title's A–Z uppercase ratio — the "ALL CAPS TITLE" signal
  'content.url', // full URL (post link)
  'content.urlDomain', // hostname only

  // Post flair (post-only — comments always have ''). Populated for onPostSubmit
  // (the flair at submit time, often empty) AND onPostFlairUpdate (the newly
  // applied flair). The text is the human-readable label; cssClass is the
  // template's CSS class hook. Mods typically rule on text.
  'post.flairText',
  'post.flairCssClass',

  // Trigger-time clock (UTC only — Devvit does not expose subreddit timezone).
  // Computed at the moment the trigger fires; identical fact-bag will yield
  // identical results, but DIFFERENT trigger times produce different bags
  // (this is a real time-dependency, expected by mods who say "after midnight").
  'time.hourOfDay', // 0..23 (UTC)
  'time.dayOfWeek', // 0..6 (UTC, Sunday=0)

  // Subreddit context
  'sub.weeklyActiveUsers',
  'sub.over18',

  // Reports
  'reports.count',
  'reports.distinctReporters',
] as const;
export type FactPath = (typeof FactPaths)[number];

// ──────────────────────────────────────────────────────────────────────────────
// Predicate operators — closed set. Exported so evaluator.ts and the
// property-based tests can share the same source of truth (previously the
// evaluator hard-coded its own list of supported ops which could drift).
// ──────────────────────────────────────────────────────────────────────────────
export const PredicateOps = ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in', 'notIn', 'contains', 'matches'] as const;
export type PredicateOp = (typeof PredicateOps)[number];

const LeafPredicate = z.object({
  fact: z.enum(FactPaths),
  op: z.enum(PredicateOps),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]),
});

// ──────────────────────────────────────────────────────────────────────────────
// Composite predicate — recursive tree with bounded depth (max 6 levels)
// ──────────────────────────────────────────────────────────────────────────────
type PredicateTree =
  | z.infer<typeof LeafPredicate>
  | { all: PredicateTree[] }
  | { any: PredicateTree[] }
  | { not: PredicateTree };

const MAX_TREE_DEPTH = 6;

const PredicateTreeSchema: z.ZodType<PredicateTree> = z.lazy(() =>
  z.union([
    LeafPredicate,
    z.object({
      all: z
        .array(z.lazy(() => PredicateTreeSchema))
        .min(1)
        .max(20),
    }),
    z.object({
      any: z
        .array(z.lazy(() => PredicateTreeSchema))
        .min(1)
        .max(20),
    }),
    z.object({ not: z.lazy(() => PredicateTreeSchema) }),
  ]),
);

// ──────────────────────────────────────────────────────────────────────────────
// Action — closed action verbs + bounded params
// ──────────────────────────────────────────────────────────────────────────────
const Action = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('report'),
    params: z.object({ reason: z.string().max(200) }),
  }),
  z.object({
    action: z.literal('flair'),
    params: z.object({ flairText: z.string().max(64), cssClass: z.string().max(64).optional() }),
  }),
  z.object({
    action: z.literal('lock'),
    params: z.object({}).strict(),
  }),
  z.object({
    action: z.literal('modqueue'),
    params: z.object({ note: z.string().max(200) }),
  }),
  z.object({
    action: z.literal('remove'),
    params: z.object({ spam: z.boolean().default(false), reasonId: z.string().optional() }),
  }),
  // Guarded — server requires explicit checkbox from mod
  z.object({
    action: z.literal('ban'),
    params: z.object({ duration: z.number().int().positive().max(999).optional(), reason: z.string().max(200) }),
  }),
  z.object({
    action: z.literal('mute'),
    params: z.object({ duration: z.number().int().positive().max(72), note: z.string().max(200).optional() }),
  }),
  z.object({
    action: z.literal('permaban'),
    params: z.object({ reason: z.string().max(200) }),
  }),
  z.object({
    action: z.literal('approve'),
    // Optional reason — mods may want an audit trail of *why* a rule
    // auto-approved (e.g. "verified contributor flair"), but the API call
    // itself takes no parameters.
    params: z.object({ reason: z.string().max(200).optional() }),
  }),
]);

// ──────────────────────────────────────────────────────────────────────────────
// Triggers the rule listens to (subset of Devvit triggers vibe-mod handles).
// Exported so callers (evaluator.ts, index.ts trigger handlers, the dry-run
// preview, system-prompt.ts) can import the literal-typed union instead of
// hard-coding 'onPostSubmit' | ... in their own signatures.
// ──────────────────────────────────────────────────────────────────────────────
export const RULE_TRIGGERS = [
  'onPostSubmit',
  'onCommentSubmit',
  'onPostReport',
  'onCommentReport',
  // v0.0.50: onPostFlairUpdate — fires when a mod (or vibe-mod itself) changes
  // a post's flair. Enables natural-language rules like "When the 'Spam' flair
  // is applied, remove and lock the post". The dedupe key for this trigger
  // includes the flair template id (see routes/triggers.ts) so flair-toggle
  // loops terminate after one bounce.
  'onPostFlairUpdate',
] as const;
export type RuleTriggerName = (typeof RULE_TRIGGERS)[number];
const RuleTrigger = z.enum(RULE_TRIGGERS);

// ──────────────────────────────────────────────────────────────────────────────
// Single rule
// ──────────────────────────────────────────────────────────────────────────────
// SECURITY: .strict() on all rule-level objects so the LLM cannot smuggle
// additional fields past validation (audit Gap #1 fix).
export const Rule = z
  .object({
    id: z.string().regex(/^r_[a-z0-9_]{1,60}$/, 'id must match r_[a-z0-9_]{1,60}'),
    name: z.string().min(1).max(80),
    sourceNL: z.string().min(1).max(1000), // mod's original English
    on: z.array(RuleTrigger).min(1).max(RULE_TRIGGERS.length),
    when: PredicateTreeSchema,
    then: z.array(Action).min(1).max(5),
    // Rate-limit per author (to prevent rule from spamming a single user)
    rateLimit: z
      .object({
        perAuthor: z.enum(['1/min', '1/hour', '1/day']).optional(),
      })
      .optional(),
    enabled: z.boolean().default(true),
    shadow: z.boolean().default(true), // default ON, mod must explicitly promote
    createdAt: z.number().int().nonnegative(),
    // Stamped when the rule is first activated (draft → active). The shadow-mode
    // window is measured from this, not createdAt, so a draft that sits unactivated
    // for longer than shadowDurationHours doesn't go live the instant it's promoted.
    activatedAt: z.number().int().nonnegative().optional(),
    createdBy: z.string().regex(/^t2_[a-z0-9]+$/),
  })
  .strict();

// ──────────────────────────────────────────────────────────────────────────────
// Rule bundle — stored at rules:active and rules:draft in Redis
// ──────────────────────────────────────────────────────────────────────────────
export const RuleBundle = z
  .object({
    schemaVersion: z.literal('1.0.0'),
    bundleVersion: z.number().int().nonnegative(),
    compiledAt: z.number().int(),
    llmModel: z.string(),
    llmTokensIn: z.number().int().nonnegative(),
    llmTokensOut: z.number().int().nonnegative(),
    rules: z.array(Rule).max(50), // hard cap: 50 rules per sub
  })
  .strict();

// Predicate tree depth check — runs after schema validation
export function checkTreeDepth(tree: PredicateTree, depth = 0): void {
  if (depth > MAX_TREE_DEPTH) throw new Error(`predicate tree too deep (>${MAX_TREE_DEPTH})`);
  if ('all' in tree) tree.all.forEach((t) => checkTreeDepth(t, depth + 1));
  else if ('any' in tree) tree.any.forEach((t) => checkTreeDepth(t, depth + 1));
  else if ('not' in tree) checkTreeDepth(tree.not, depth + 1);
}

export type RuleType = z.infer<typeof Rule>;
export type RuleBundleType = z.infer<typeof RuleBundle>;
export type ActionType = z.infer<typeof Action>;
export type FactBag = Record<FactPath, string | number | boolean>;
