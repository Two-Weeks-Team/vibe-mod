// src/shared/rule-schema.property.test.ts
// Property-based tests (fast-check) for the schema — the LLM-output security
// boundary. Complements the example tests in rule-schema.test.ts.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Rule, FactPaths, checkTreeDepth } from './rule-schema';

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789_'.split('');
const T2_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
const idArb = fc.array(fc.constantFrom(...ID_CHARS), { minLength: 1, maxLength: 40 }).map((cs) => `r_${cs.join('')}`);
const createdByArb = fc
  .array(fc.constantFrom(...T2_CHARS), { minLength: 1, maxLength: 12 })
  .map((cs) => `t2_${cs.join('')}`);

const leafArb = fc.record({
  fact: fc.constantFrom(...FactPaths),
  op: fc.constantFrom('eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in', 'contains', 'matches'),
  value: fc.oneof(
    fc.string({ maxLength: 30 }),
    fc.integer({ min: -1_000_000, max: 1_000_000 }),
    fc.boolean(),
    fc.array(fc.oneof(fc.string({ maxLength: 10 }), fc.integer()), { maxLength: 4 }),
  ),
});
// Bounded-depth predicate tree (≤4 wrappers → well under checkTreeDepth's limit of 6).
const treeArb = fc.letrec((tie) => ({
  tree: fc.oneof(
    { depthSize: 'small', withCrossShrink: true },
    { arbitrary: leafArb, weight: 4 },
    { arbitrary: fc.record({ all: fc.array(tie('tree'), { minLength: 1, maxLength: 3 }) }), weight: 1 },
    { arbitrary: fc.record({ any: fc.array(tie('tree'), { minLength: 1, maxLength: 3 }) }), weight: 1 },
    { arbitrary: fc.record({ not: tie('tree') }), weight: 1 },
  ),
})).tree;

const actionArb = fc.oneof(
  fc.record({ action: fc.constant('lock'), params: fc.constant({}) }),
  fc.record({ action: fc.constant('report'), params: fc.record({ reason: fc.string({ maxLength: 50 }) }) }),
  fc.record({ action: fc.constant('modqueue'), params: fc.record({ note: fc.string({ maxLength: 50 }) }) }),
  fc.record({
    action: fc.constant('flair'),
    params: fc.record({ flairText: fc.string({ minLength: 1, maxLength: 30 }) }),
  }),
  fc.record({ action: fc.constant('remove'), params: fc.record({ spam: fc.boolean() }) }),
);

const validRuleArb = fc.record({
  id: idArb,
  name: fc.string({ minLength: 1, maxLength: 80 }),
  sourceNL: fc.string({ minLength: 1, maxLength: 1000 }),
  on: fc.uniqueArray(fc.constantFrom('onPostSubmit', 'onCommentSubmit', 'onPostReport', 'onCommentReport'), {
    minLength: 1,
    maxLength: 4,
  }),
  when: treeArb,
  then: fc.array(actionArb, { minLength: 1, maxLength: 5 }),
  createdAt: fc.nat(),
  createdBy: createdByArb,
});

describe('Rule schema — properties', () => {
  it('accepts every well-formed rule, and parsing is idempotent', () => {
    fc.assert(
      fc.property(validRuleArb, (raw) => {
        const parsed = Rule.parse(raw);
        // round-trip: parsing the parsed value yields a deep-equal value
        expect(Rule.parse(parsed)).toEqual(parsed);
        // defaults applied
        expect(parsed.enabled).toBe(true);
        expect(parsed.shadow).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('rejects any unknown top-level field (.strict — audit Gap #1)', () => {
    fc.assert(
      fc.property(
        validRuleArb,
        fc.string({ minLength: 1, maxLength: 12 }).filter(
          (k) =>
            ![
              'id',
              'name',
              'sourceNL',
              'on',
              'when',
              'then',
              'rateLimit',
              'enabled',
              'shadow',
              'createdAt',
              'createdBy',
              // `__proto__` set via an object literal does not become an own
              // enumerable property, and Zod additionally strips it as a
              // prototype-pollution guard — so it can't be "smuggled" and
              // isn't a meaningful "unknown field" for this test.
              '__proto__',
            ].includes(k),
        ),
        fc.anything(),
        (raw, extraKey, extraVal) => {
          expect(() => Rule.parse({ ...raw, [extraKey]: extraVal })).toThrow();
        },
      ),
      { numRuns: 150 },
    );
  });

  it('rejects any fact name that is not in the closed FactPaths set', () => {
    fc.assert(
      fc.property(
        validRuleArb,
        fc.string({ minLength: 1, maxLength: 25 }).filter((s) => !(FactPaths as readonly string[]).includes(s)),
        (raw, bogusFact) => {
          expect(() => Rule.parse({ ...raw, when: { fact: bogusFact, op: 'eq', value: 1 } })).toThrow();
        },
      ),
      { numRuns: 150 },
    );
  });

  it('rejects any action verb outside the whitelist', () => {
    fc.assert(
      fc.property(
        validRuleArb,
        fc
          .string({ minLength: 1, maxLength: 15 })
          .filter((s) => !['report', 'flair', 'lock', 'modqueue', 'remove', 'ban', 'mute', 'permaban'].includes(s)),
        (raw, bogusAction) => {
          expect(() => Rule.parse({ ...raw, then: [{ action: bogusAction, params: {} }] })).toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('checkTreeDepth throws for any tree nested deeper than 6 levels', () => {
    fc.assert(
      fc.property(fc.integer({ min: 7, max: 30 }), (depth) => {
        let t: unknown = { fact: 'content.length', op: 'gt', value: 0 };
        for (let i = 0; i < depth; i++) t = { all: [t] };
        expect(() => checkTreeDepth(t as Parameters<typeof checkTreeDepth>[0])).toThrow(/too deep/);
      }),
      { numRuns: 30 },
    );
  });
});
