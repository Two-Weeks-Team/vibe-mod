// src/server/conflict.test.ts
// Unit tests for the pure multi-rule conflict detector (server/conflict.ts).

import { describe, it, expect } from 'vitest';
import { Rule, type RuleType, type RuleTriggerName } from '../shared/rule-schema';
import { detectRuleConflicts, summarizeConflicts } from './conflict';

let seq = 0;
function mkRule(
  partial: {
    id?: string;
    on?: RuleTriggerName[];
    then: RuleType['then'];
    enabled?: boolean;
  } & Partial<RuleType>,
): RuleType {
  seq += 1;
  return Rule.parse({
    id: partial.id ?? `r_test_${seq}`,
    name: partial.name ?? `rule ${seq}`,
    sourceNL: partial.sourceNL ?? 'test rule',
    on: partial.on ?? ['onPostSubmit'],
    when: partial.when ?? { fact: 'content.length', op: 'gt', value: 0 },
    then: partial.then,
    createdAt: partial.createdAt ?? 1,
    createdBy: partial.createdBy ?? 't2_tester',
    enabled: partial.enabled ?? true,
    shadow: partial.shadow ?? true,
  });
}

const approve: RuleType['then'] = [{ action: 'approve', params: {} }];
const remove: RuleType['then'] = [{ action: 'remove', params: { spam: false } }];
const modqueue: RuleType['then'] = [{ action: 'modqueue', params: { note: 'n' } }];
const flair = (text: string): RuleType['then'] => [{ action: 'flair', params: { flairText: text } }];

describe('detectRuleConflicts', () => {
  it('returns no conflicts for a single rule', () => {
    expect(detectRuleConflicts([mkRule({ then: modqueue })])).toEqual([]);
  });

  it('returns no conflicts for two same-disposition rules', () => {
    const conflicts = detectRuleConflicts([mkRule({ then: modqueue }), mkRule({ then: remove })]);
    expect(conflicts).toEqual([]);
  });

  it('flags a disposition conflict: approve vs remove on a shared trigger', () => {
    const a = mkRule({ id: 'r_keep', on: ['onPostSubmit'], then: approve });
    const b = mkRule({ id: 'r_drop', on: ['onPostSubmit'], then: remove });
    const conflicts = detectRuleConflicts([a, b]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      kind: 'disposition',
      ruleA: 'r_keep',
      ruleB: 'r_drop',
      trigger: 'onPostSubmit',
    });
  });

  it('flags approve vs modqueue as a disposition conflict', () => {
    const conflicts = detectRuleConflicts([
      mkRule({ id: 'r_a', then: approve }),
      mkRule({ id: 'r_b', then: modqueue }),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].kind).toBe('disposition');
  });

  it('does NOT flag a conflict when triggers are disjoint', () => {
    const a = mkRule({ on: ['onPostSubmit'], then: approve });
    const b = mkRule({ on: ['onCommentSubmit'], then: remove });
    expect(detectRuleConflicts([a, b])).toEqual([]);
  });

  it('flags a flair conflict when two rules set different flair on a shared trigger', () => {
    const a = mkRule({ id: 'r_x', then: flair('Edit your title?') });
    const b = mkRule({ id: 'r_y', then: flair('Spam') });
    const conflicts = detectRuleConflicts([a, b]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ kind: 'flair', ruleA: 'r_x', ruleB: 'r_y' });
    expect(conflicts[0].detail).toContain('Edit your title?');
    expect(conflicts[0].detail).toContain('Spam');
  });

  it('does NOT flag a flair conflict when both rules set the SAME flair', () => {
    const a = mkRule({ then: flair('Needs review') });
    const b = mkRule({ then: flair('Needs review') });
    expect(detectRuleConflicts([a, b])).toEqual([]);
  });

  it('ignores disabled rules', () => {
    const a = mkRule({ then: approve, enabled: false });
    const b = mkRule({ then: remove });
    expect(detectRuleConflicts([a, b])).toEqual([]);
  });

  it('de-duplicates by rule id (active + draft copies of one rule are one rule)', () => {
    const r = mkRule({ id: 'r_same', then: approve });
    const dup = mkRule({ id: 'r_same', then: remove }); // same id, different body
    // Same id collapses to the first occurrence → no self-pair, no conflict.
    expect(detectRuleConflicts([r, dup])).toEqual([]);
  });

  it('emits both a disposition AND a flair conflict for a multi-action pair', () => {
    const a = mkRule({
      id: 'r_a',
      then: [
        { action: 'approve', params: {} },
        { action: 'flair', params: { flairText: 'OK' } },
      ],
    });
    const b = mkRule({
      id: 'r_b',
      then: [
        { action: 'remove', params: { spam: false } },
        { action: 'flair', params: { flairText: 'Removed' } },
      ],
    });
    const kinds = detectRuleConflicts([a, b])
      .map((c) => c.kind)
      .sort();
    expect(kinds).toEqual(['disposition', 'flair']);
  });
});

describe('summarizeConflicts', () => {
  it('joins conflict details with the given separator', () => {
    const conflicts = detectRuleConflicts([
      mkRule({ id: 'r_keep', then: approve }),
      mkRule({ id: 'r_drop', then: remove }),
    ]);
    const line = summarizeConflicts(conflicts, ' · ');
    expect(line).toContain('r_keep');
    expect(line).toContain('r_drop');
  });

  it('returns an empty string for no conflicts', () => {
    expect(summarizeConflicts([], ' · ')).toBe('');
  });
});
