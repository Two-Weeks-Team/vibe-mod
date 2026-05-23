// src/server/conflict.ts
// Pure, read-only multi-rule conflict detection. ZERO I/O, ZERO LLM.
//
// Runtime evaluation (routes/triggers.ts) applies EVERY matching rule in
// sequence — there is no built-in arbitration when two rules disagree about
// the same item. This module is the *preview* layer: given the rule set, it
// surfaces pairs that COULD collide so a moderator sees them before promoting
// a rule to live. It does NOT block promotion and is not on the runtime path.
//
// It is deliberately CONSERVATIVE and HEURISTIC. See docs/conflict-handling.md
// for exactly what it does and does not catch (notably: it does NOT analyse
// predicate overlap, so two rules that share a trigger but can never match the
// same post will still be reported as a *potential* conflict).

import type { RuleType, RuleTriggerName } from '../shared/rule-schema';

export type ConflictKind = 'disposition' | 'flair';

export interface RuleConflict {
  kind: ConflictKind;
  /** id of the first rule in the pair */
  ruleA: string;
  /** id of the second rule in the pair */
  ruleB: string;
  /** a trigger both rules listen to (the reason they could co-fire) */
  trigger: RuleTriggerName;
  /** human-readable, dashboard-ready one-liner */
  detail: string;
}

// Actions that suppress or route an item for review. `approve` is their direct
// opposite — a rule that auto-approves an item another rule wants removed/
// queued is contradictory intent. `lock` is intentionally excluded: locking a
// post's comments is orthogonal to approving the post, not a contradiction.
const NEGATIVE_DISPOSITION = new Set<string>(['remove', 'ban', 'mute', 'permaban', 'modqueue']);
const POSITIVE_DISPOSITION = 'approve' as const;

interface RuleActionProfile {
  hasPositive: boolean;
  hasNegative: boolean;
  flairTexts: Set<string>;
}

function profileActions(rule: RuleType): RuleActionProfile {
  let hasPositive = false;
  let hasNegative = false;
  const flairTexts = new Set<string>();
  for (const a of rule.then) {
    if (a.action === POSITIVE_DISPOSITION) hasPositive = true;
    else if (NEGATIVE_DISPOSITION.has(a.action)) hasNegative = true;
    if (a.action === 'flair') flairTexts.add(a.params.flairText);
  }
  return { hasPositive, hasNegative, flairTexts };
}

function firstSharedTrigger(a: RuleType, b: RuleType): RuleTriggerName | undefined {
  return a.on.find((t) => b.on.includes(t));
}

/**
 * Detect *potential* conflicts between rules that could both fire on the same
 * item. Two heuristic conflict classes:
 *   - `disposition`: one rule approves an item while another removes / bans /
 *     mutes / queues it (opposing intent on a shared trigger).
 *   - `flair`: two rules set DIFFERENT flair text on a shared trigger
 *     (silent last-write-wins at runtime today).
 *
 * Only ENABLED rules are considered. Rules are de-duplicated by id (a rule that
 * appears in both the active and draft bundles is treated as one rule). The
 * function does NOT evaluate predicates, so a reported conflict is "these two
 * rules could collide on a post both happen to match", not "they will".
 */
export function detectRuleConflicts(rules: RuleType[]): RuleConflict[] {
  // De-dupe by id — first occurrence wins (callers pass active rules first).
  const byId = new Map<string, RuleType>();
  for (const r of rules) {
    if (!r.enabled) continue;
    if (!byId.has(r.id)) byId.set(r.id, r);
  }
  const list = [...byId.values()];
  const out: RuleConflict[] = [];

  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const trigger = firstSharedTrigger(a, b);
      if (!trigger) continue;

      const pa = profileActions(a);
      const pb = profileActions(b);

      // Disposition conflict: one keeps, the other suppresses.
      if ((pa.hasPositive && pb.hasNegative) || (pa.hasNegative && pb.hasPositive)) {
        out.push({
          kind: 'disposition',
          ruleA: a.id,
          ruleB: b.id,
          trigger,
          detail: `${a.id} vs ${b.id} on ${trigger}: one approves while the other removes/bans/queues the same item`,
        });
      }

      // Flair conflict: both set flair, and at least one text differs.
      if (pa.flairTexts.size > 0 && pb.flairTexts.size > 0) {
        const union = new Set<string>([...pa.flairTexts, ...pb.flairTexts]);
        if (union.size > 1) {
          out.push({
            kind: 'flair',
            ruleA: a.id,
            ruleB: b.id,
            trigger,
            detail: `${a.id} vs ${b.id} on ${trigger}: set different flair (${[...union].join(' / ')}) — last write wins`,
          });
        }
      }
    }
  }
  return out;
}

/** Render conflicts as a single line for the dashboard's helpText surface. */
export function summarizeConflicts(conflicts: RuleConflict[], sep = ' · '): string {
  return conflicts.map((c) => c.detail).join(sep);
}
