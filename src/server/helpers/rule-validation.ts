// src/server/helpers/rule-validation.ts
// Pure helpers for validating LLM output before it can be persisted as a
// rule. Each is a security boundary: anything this module rejects is a
// silent drop, not a silent accept.
//
//   - summarizeValidationError(): scrub Zod paths from a user-facing message.
//   - isSafeRegex():               reject common ReDoS patterns at compile time.
//   - validatePredicateRegexes():  recurse the PredicateTree and check every
//                                  `matches` leaf.
//   - safeParseBundle():           parse a stored RuleBundle JSON, returning
//                                  null on malformed input (fail-SAFE — no
//                                  rules is the restrictive default).

import { RuleBundle, type RuleBundleType } from '../../shared/rule-schema';

// SECURITY: only call this from server-controlled paths — never echo to user
// without first scrubbing with this helper.
export function summarizeValidationError(err: unknown): string {
  // Strip Zod's detailed field paths; return a user-safe short message.
  const raw = String(err);
  if (raw.includes('action')) return 'The compiled rule contained an action this app does not support.';
  if (raw.includes('fact')) return 'The compiled rule referenced an unknown fact.';
  if (raw.includes('predicate')) return "The compiled rule's condition tree was too complex.";
  return 'Compiled rule failed validation. Try rephrasing more simply.';
}

// Safe-regex check: rejects common catastrophic backtracking patterns.
// Conservative — false-negatives possible, false-positives unlikely.
// (Audit FIND-02 fix.)
export function isSafeRegex(pattern: string): boolean {
  if (pattern.length > 80) return false;
  // Nested quantifiers: (...)+/*, (...)*+
  if (/\)[+*][+*]?/.test(pattern)) return false;
  if (/\]\s*[+*][+*]?/.test(pattern)) return false;
  // Backreferences
  if (/\\[1-9]/.test(pattern)) return false;
  // Alternation containing same-prefix branches like (a|aa)+
  if (/\([^()|]*\|[^()|]*\)[+*]/.test(pattern)) return false;
  return true;
}

export interface PredicateTreeShape {
  fact?: string;
  op?: string;
  value?: unknown;
  all?: PredicateTreeShape[];
  any?: PredicateTreeShape[];
  not?: PredicateTreeShape;
}

export function validatePredicateRegexes(tree: PredicateTreeShape): void {
  if ('all' in tree && tree.all) tree.all.forEach(validatePredicateRegexes);
  else if ('any' in tree && tree.any) tree.any.forEach(validatePredicateRegexes);
  else if ('not' in tree && tree.not) validatePredicateRegexes(tree.not);
  else if (tree.op === 'matches' && typeof tree.value === 'string') {
    if (!isSafeRegex(tree.value)) {
      throw new Error('Regex pattern in rule may cause performance issues; please rephrase.');
    }
  }
}

// Parse a persisted RuleBundle, returning null (treated as "no rules" — the
// fail-SAFE direction, since every action is restrictive) if the stored
// JSON is missing, malformed, or fails schema validation. A bad write must
// never 500 the trigger path for every post/comment in the sub.
export function safeParseBundle(raw: string | null | undefined, context: string): RuleBundleType | null {
  if (!raw) return null;
  try {
    return RuleBundle.parse(JSON.parse(raw));
  } catch (err) {
    console.error(`[vibe-mod] ignoring malformed rule bundle (${context}):`, err);
    return null;
  }
}
