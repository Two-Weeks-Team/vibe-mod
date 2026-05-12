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
export const GUARDED_ACTIONS = ['ban', 'mute', 'permaban'] as const;
export const ACTION_VERBS = [...SAFE_ACTIONS, ...GUARDED_ACTIONS] as const;
export type ActionVerb = typeof ACTION_VERBS[number];

// ──────────────────────────────────────────────────────────────────────────────
// Fact bag — every fact the predicate tree can reference.
// Hand-built per event, never sourced from LLM. Closed schema.
// ──────────────────────────────────────────────────────────────────────────────
export const FactPaths = [
  // Author (account-level)
  'author.accountAgeHours',
  'author.totalKarma',
  'author.subKarma',
  'author.isModerator',
  'author.hasVerifiedEmail',
  'author.subJoinAgeHours',     // estimated: time since first activity in this sub

  // Content (post or comment body)
  'content.length',
  'content.linkCount',
  'content.imageCount',
  'content.upperCaseRatio',
  'content.containsRegex',       // requires .params.regex
  'content.title.length',
  'content.title.contains',      // requires .params.needle
  'content.url',                 // full URL (post link)
  'content.urlDomain',           // hostname only

  // Subreddit context
  'sub.weeklyActiveUsers',
  'sub.over18',

  // Reports
  'reports.count',
  'reports.distinctReporters',
] as const;
export type FactPath = typeof FactPaths[number];

// ──────────────────────────────────────────────────────────────────────────────
// Predicate operators — closed set
// ──────────────────────────────────────────────────────────────────────────────
const PredicateOps = ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in', 'contains', 'matches'] as const;

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
    z.object({ all: z.array(z.lazy(() => PredicateTreeSchema)).min(1).max(20) }),
    z.object({ any: z.array(z.lazy(() => PredicateTreeSchema)).min(1).max(20) }),
    z.object({ not: z.lazy(() => PredicateTreeSchema) }),
  ])
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
]);

// ──────────────────────────────────────────────────────────────────────────────
// Triggers the rule listens to (subset of Devvit triggers vibe-mod handles)
// ──────────────────────────────────────────────────────────────────────────────
const RuleTrigger = z.enum([
  'onPostSubmit',
  'onCommentSubmit',
  'onPostReport',
  'onCommentReport',
]);

// ──────────────────────────────────────────────────────────────────────────────
// Single rule
// ──────────────────────────────────────────────────────────────────────────────
// SECURITY: .strict() on all rule-level objects so the LLM cannot smuggle
// additional fields past validation (audit Gap #1 fix).
export const Rule = z.object({
  id: z.string().regex(/^r_[a-z0-9_]{1,60}$/, 'id must match r_[a-z0-9_]{1,60}'),
  name: z.string().min(1).max(80),
  sourceNL: z.string().min(1).max(1000),     // mod's original English
  on: z.array(RuleTrigger).min(1).max(4),
  when: PredicateTreeSchema,
  then: z.array(Action).min(1).max(5),
  // Rate-limit per author (to prevent rule from spamming a single user)
  rateLimit: z.object({
    perAuthor: z.enum(['1/min', '1/hour', '1/day']).optional(),
  }).optional(),
  enabled: z.boolean().default(true),
  shadow: z.boolean().default(true),         // default ON, mod must explicitly promote
  createdAt: z.number().int().nonnegative(),
  createdBy: z.string().regex(/^t2_[a-z0-9]+$/),
}).strict();

// ──────────────────────────────────────────────────────────────────────────────
// Rule bundle — stored at rules:active and rules:draft in Redis
// ──────────────────────────────────────────────────────────────────────────────
export const RuleBundle = z.object({
  schemaVersion: z.literal('1.0.0'),
  bundleVersion: z.number().int().nonnegative(),
  compiledAt: z.number().int(),
  llmModel: z.string(),
  llmTokensIn: z.number().int().nonnegative(),
  llmTokensOut: z.number().int().nonnegative(),
  rules: z.array(Rule).max(50),    // hard cap: 50 rules per sub
}).strict();

// Predicate tree depth check — runs after schema validation
export function checkTreeDepth(tree: PredicateTree, depth = 0): void {
  if (depth > MAX_TREE_DEPTH) throw new Error(`predicate tree too deep (>${MAX_TREE_DEPTH})`);
  if ('all' in tree) tree.all.forEach(t => checkTreeDepth(t, depth + 1));
  else if ('any' in tree) tree.any.forEach(t => checkTreeDepth(t, depth + 1));
  else if ('not' in tree) checkTreeDepth(tree.not, depth + 1);
}

export type RuleType = z.infer<typeof Rule>;
export type RuleBundleType = z.infer<typeof RuleBundle>;
export type ActionType = z.infer<typeof Action>;
export type FactBag = Record<FactPath, string | number | boolean>;
