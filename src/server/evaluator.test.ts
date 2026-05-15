// src/server/evaluator.test.ts
// The evaluator runs on every post/comment/report with ZERO LLM calls.
// It must be pure and total — no throw, no I/O, deterministic.

import { describe, it, expect } from 'vitest';
import { evaluatePredicate, selectMatchingRules } from './evaluator';
import type { FactBag, RuleType } from '../shared/rule-schema';

function facts(overrides: Partial<Record<string, string | number | boolean>> = {}): FactBag {
  return {
    'author.accountAgeHours': 100,
    'author.totalKarma': 500,
    'author.subKarma': 20,
    'author.isModerator': false,
    'author.hasVerifiedEmail': true,
    'author.subJoinAgeHours': 100,
    'content.length': 280,
    'content.linkCount': 1,
    'content.imageCount': 0,
    'content.upperCaseRatio': 0.1,
    'content.containsRegex': 'hello world join my discord.gg/abc',
    'content.title.length': 12,
    'content.title.contains': 'My Cool Title',
    'content.title.upperCaseRatio': 0.25,
    'content.url': 'https://discord.gg/abc',
    'content.urlDomain': 'discord.gg',
    'sub.weeklyActiveUsers': 1000,
    'sub.over18': false,
    'reports.count': 0,
    'reports.distinctReporters': 0,
    ...overrides,
  } as FactBag;
}

describe('evaluatePredicate — leaf operators', () => {
  const f = facts();

  it('eq / neq compare strictly', () => {
    expect(evaluatePredicate({ fact: 'author.isModerator', op: 'eq', value: false }, f)).toBe(true);
    expect(evaluatePredicate({ fact: 'author.isModerator', op: 'neq', value: true }, f)).toBe(true);
    expect(evaluatePredicate({ fact: 'author.totalKarma', op: 'eq', value: '500' }, f)).toBe(false); // no coercion
  });

  it('lt / lte / gt / gte require numeric both sides', () => {
    expect(evaluatePredicate({ fact: 'author.totalKarma', op: 'lt', value: 600 }, f)).toBe(true);
    expect(evaluatePredicate({ fact: 'author.totalKarma', op: 'lte', value: 500 }, f)).toBe(true);
    expect(evaluatePredicate({ fact: 'author.totalKarma', op: 'gt', value: 500 }, f)).toBe(false);
    expect(evaluatePredicate({ fact: 'author.totalKarma', op: 'gte', value: 500 }, f)).toBe(true);
    // non-numeric fact → false, never throw
    expect(evaluatePredicate({ fact: 'content.urlDomain', op: 'gt', value: 5 }, f)).toBe(false);
    // non-numeric value → false
    expect(evaluatePredicate({ fact: 'author.totalKarma', op: 'lt', value: 'lots' }, f)).toBe(false);
  });

  it('in checks array membership', () => {
    expect(evaluatePredicate({ fact: 'content.urlDomain', op: 'in', value: ['discord.gg', 't.me'] }, f)).toBe(true);
    expect(evaluatePredicate({ fact: 'content.urlDomain', op: 'in', value: ['t.me'] }, f)).toBe(false);
    expect(evaluatePredicate({ fact: 'content.urlDomain', op: 'in', value: 'discord.gg' }, f)).toBe(false); // value must be array
  });

  it('notIn is the negation of in for any array value', () => {
    // Member → in true → notIn false
    expect(evaluatePredicate({ fact: 'content.urlDomain', op: 'notIn', value: ['discord.gg', 't.me'] }, f)).toBe(false);
    // Non-member → in false → notIn true
    expect(evaluatePredicate({ fact: 'content.urlDomain', op: 'notIn', value: ['t.me'] }, f)).toBe(true);
    // Non-array value → returns false (defensive, matches 'in' behaviour)
    expect(evaluatePredicate({ fact: 'content.urlDomain', op: 'notIn', value: 'discord.gg' }, f)).toBe(false);
    // Empty array → notIn always true (nothing is a member of empty set)
    expect(evaluatePredicate({ fact: 'content.urlDomain', op: 'notIn', value: [] }, f)).toBe(true);
  });

  it('contains is case-insensitive substring on strings only', () => {
    expect(evaluatePredicate({ fact: 'content.title.contains', op: 'contains', value: 'cool' }, f)).toBe(true);
    expect(evaluatePredicate({ fact: 'content.title.contains', op: 'contains', value: 'COOL' }, f)).toBe(true);
    expect(evaluatePredicate({ fact: 'content.title.contains', op: 'contains', value: 'lame' }, f)).toBe(false);
    expect(evaluatePredicate({ fact: 'author.totalKarma', op: 'contains', value: '50' }, f)).toBe(false); // not a string fact
  });

  it('matches runs a regex against string facts', () => {
    expect(evaluatePredicate({ fact: 'content.containsRegex', op: 'matches', value: 'discord\\.gg/\\w+' }, f)).toBe(
      true,
    );
    expect(evaluatePredicate({ fact: 'content.containsRegex', op: 'matches', value: 'telegram' }, f)).toBe(false);
  });

  it('matches refuses dangerous regex shapes at runtime (belt-and-suspenders)', () => {
    expect(evaluatePredicate({ fact: 'content.containsRegex', op: 'matches', value: '(a+)+' }, f)).toBe(false); // nested quantifier shape
    expect(evaluatePredicate({ fact: 'content.containsRegex', op: 'matches', value: '(\\w)\\1' }, f)).toBe(false); // backreference
    expect(evaluatePredicate({ fact: 'content.containsRegex', op: 'matches', value: 'x'.repeat(101) }, f)).toBe(false); // too long
  });

  it('matches returns false on an invalid regex instead of throwing', () => {
    expect(evaluatePredicate({ fact: 'content.containsRegex', op: 'matches', value: '[' }, f)).toBe(false);
  });

  it('matches truncates oversized input before testing', () => {
    const big = facts({ 'content.containsRegex': 'a'.repeat(5000) + 'NEEDLE' });
    // NEEDLE sits past the 4096-char window → not found
    expect(evaluatePredicate({ fact: 'content.containsRegex', op: 'matches', value: 'NEEDLE' }, big)).toBe(false);
  });

  it('unknown operator returns false', () => {
    expect(evaluatePredicate({ fact: 'content.length', op: 'wat', value: 1 }, f)).toBe(false);
  });
});

describe('evaluatePredicate — composites', () => {
  const f = facts();

  it('all = AND', () => {
    expect(
      evaluatePredicate(
        {
          all: [
            { fact: 'author.totalKarma', op: 'lt', value: 600 },
            { fact: 'sub.over18', op: 'eq', value: false },
          ],
        },
        f,
      ),
    ).toBe(true);
    expect(
      evaluatePredicate(
        {
          all: [
            { fact: 'author.totalKarma', op: 'lt', value: 600 },
            { fact: 'sub.over18', op: 'eq', value: true },
          ],
        },
        f,
      ),
    ).toBe(false);
  });

  it('any = OR', () => {
    expect(
      evaluatePredicate(
        {
          any: [
            { fact: 'sub.over18', op: 'eq', value: true },
            { fact: 'content.length', op: 'gt', value: 0 },
          ],
        },
        f,
      ),
    ).toBe(true);
  });

  it('not negates', () => {
    expect(evaluatePredicate({ not: { fact: 'sub.over18', op: 'eq', value: true } }, f)).toBe(true);
  });

  it('empty all/any return false (do NOT invert truth semantics)', () => {
    expect(evaluatePredicate({ all: [] }, f)).toBe(false);
    expect(evaluatePredicate({ any: [] }, f)).toBe(false);
  });

  it('nests arbitrarily', () => {
    expect(
      evaluatePredicate(
        {
          all: [
            { not: { fact: 'author.isModerator', op: 'eq', value: true } },
            {
              any: [
                { fact: 'content.urlDomain', op: 'eq', value: 'discord.gg' },
                { fact: 'content.linkCount', op: 'gte', value: 5 },
              ],
            },
          ],
        },
        f,
      ),
    ).toBe(true);
  });
});

describe('selectMatchingRules', () => {
  const rule = (over: Partial<RuleType> = {}): RuleType =>
    ({
      id: 'r_test',
      name: 'test',
      sourceNL: 'test',
      on: ['onPostSubmit'],
      when: { fact: 'author.totalKarma', op: 'lt', value: 1000 },
      then: [{ action: 'modqueue', params: { note: 'x' } }],
      enabled: true,
      shadow: true,
      createdAt: 0,
      createdBy: 't2_x',
      ...over,
    }) as RuleType;

  it('returns rules whose trigger and predicate both match', () => {
    const out = selectMatchingRules([rule()], 'onPostSubmit', facts());
    expect(out).toHaveLength(1);
  });

  it('skips disabled rules', () => {
    expect(selectMatchingRules([rule({ enabled: false })], 'onPostSubmit', facts())).toHaveLength(0);
  });

  it('skips rules not listening to this trigger', () => {
    expect(selectMatchingRules([rule({ on: ['onCommentSubmit'] })], 'onPostSubmit', facts())).toHaveLength(0);
  });

  it('skips rules whose predicate is false', () => {
    expect(
      selectMatchingRules(
        [rule({ when: { fact: 'author.totalKarma', op: 'gt', value: 1000 } as RuleType['when'] })],
        'onPostSubmit',
        facts(),
      ),
    ).toHaveLength(0);
  });

  it('preserves rule order', () => {
    const out = selectMatchingRules([rule({ id: 'r_a' }), rule({ id: 'r_b' })], 'onPostSubmit', facts());
    expect(out.map((r) => r.id)).toEqual(['r_a', 'r_b']);
  });
});
