// server/evaluator.ts
// Pure deterministic predicate evaluator. ZERO LLM calls.
// Called on every onPostSubmit / onCommentSubmit / onReport.

import type { FactBag, RuleType } from '../shared/rule-schema';

type PredicateTree =
  | { fact: string; op: string; value: unknown }
  | { all: PredicateTree[] }
  | { any: PredicateTree[] }
  | { not: PredicateTree };

export function evaluatePredicate(tree: PredicateTree, facts: FactBag): boolean {
  // Defensive: empty `all`/`any` arrays would invert truth semantics
  // (`[].every(...)` → true, `[].some(...)` → false). Schema enforces
  // min(1) at compile time; this is belt-and-suspenders at runtime.
  if ('all' in tree) {
    if (tree.all.length === 0) return false;
    return tree.all.every(t => evaluatePredicate(t, facts));
  }
  if ('any' in tree) {
    if (tree.any.length === 0) return false;
    return tree.any.some(t => evaluatePredicate(t, facts));
  }
  if ('not' in tree) return !evaluatePredicate(tree.not, facts);

  // Leaf
  const factValue = (facts as Record<string, unknown>)[tree.fact];
  const v = tree.value;

  switch (tree.op) {
    case 'eq':   return factValue === v;
    case 'neq':  return factValue !== v;
    case 'lt':   return typeof factValue === 'number' && typeof v === 'number' && factValue < v;
    case 'lte':  return typeof factValue === 'number' && typeof v === 'number' && factValue <= v;
    case 'gt':   return typeof factValue === 'number' && typeof v === 'number' && factValue > v;
    case 'gte':  return typeof factValue === 'number' && typeof v === 'number' && factValue >= v;
    case 'in':
      return Array.isArray(v) && (v as unknown[]).includes(factValue);
    case 'contains':
      return typeof factValue === 'string' && typeof v === 'string' &&
             factValue.toLowerCase().includes(v.toLowerCase());
    case 'matches':
      if (typeof factValue !== 'string' || typeof v !== 'string') return false;
      // Catastrophic-backtracking safety is enforced at COMPILE TIME (see
      // validatePredicateRegexes in server/index.ts which uses safe-regex on
      // rule submit). Runtime guards here are belt-and-suspenders:
      //   - Reject patterns >100 chars
      //   - Reject patterns with classic nested-quantifier shape "(...)+/*"
      //   - Reject patterns with backreferences
      //   - Bound input to 4096 chars (truncates oversized post bodies)
      if (v.length > 100) return false;
      if (/[)\]]\s*[+*]/.test(v)) return false;     // nested quantifier shape
      if (/\\[1-9]/.test(v)) return false;            // backreference
      try {
        const re = new RegExp(v, 'iu');
        const sample = factValue.length > 4096 ? factValue.slice(0, 4096) : factValue;
        return re.test(sample);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

/**
 * Decide which rules apply for a given trigger + fact bag.
 * Returns rules to execute in order. Skips disabled rules.
 * Honors shadow flag (caller decides whether to actually act on shadow rules).
 */
export function selectMatchingRules(
  rules: RuleType[],
  trigger: 'onPostSubmit' | 'onCommentSubmit' | 'onPostReport' | 'onCommentReport',
  facts: FactBag
): RuleType[] {
  return rules.filter(r => {
    if (!r.enabled) return false;
    if (!r.on.includes(trigger)) return false;
    return evaluatePredicate(r.when as PredicateTree, facts);
  });
}
