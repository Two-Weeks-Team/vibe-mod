// src/server/evaluator.property.test.ts
// Property-based tests (fast-check) for the deterministic evaluator. The
// evaluator runs on every post/comment/report and must be pure + total.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { evaluatePredicate } from './evaluator';
import { FactPaths, type FactBag } from '../shared/rule-schema';

const OPS = ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in', 'contains', 'matches'] as const;
const scalarArb = fc.oneof(
  fc.string({ maxLength: 40 }),
  fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e9, max: 1e9 }),
  fc.boolean(),
);
const leafArb = fc.record({
  fact: fc.constantFrom(...FactPaths),
  op: fc.constantFrom(...OPS),
  value: fc.oneof(scalarArb, fc.array(fc.oneof(fc.string({ maxLength: 10 }), fc.integer()), { maxLength: 5 })),
});
// arbitrary FactBag — give every closed key a value (the evaluator must tolerate type mismatches)
const factsArb: fc.Arbitrary<FactBag> = fc
  .tuple(...FactPaths.map(() => scalarArb))
  .map((vals) => Object.fromEntries(FactPaths.map((k, i) => [k, vals[i]])) as FactBag);

type Tree = Parameters<typeof evaluatePredicate>[0];
const treeArb: fc.Arbitrary<Tree> = fc.letrec((tie) => ({
  tree: fc.oneof(
    { depthSize: 'small', withCrossShrink: true },
    { arbitrary: leafArb as fc.Arbitrary<Tree>, weight: 4 },
    {
      arbitrary: fc.record({ all: fc.array(tie('tree'), { minLength: 1, maxLength: 3 }) }) as fc.Arbitrary<Tree>,
      weight: 1,
    },
    {
      arbitrary: fc.record({ any: fc.array(tie('tree'), { minLength: 1, maxLength: 3 }) }) as fc.Arbitrary<Tree>,
      weight: 1,
    },
    { arbitrary: fc.record({ not: tie('tree') }) as fc.Arbitrary<Tree>, weight: 1 },
  ),
})).tree;

describe('evaluatePredicate — properties', () => {
  it('is total: always returns a boolean, never throws, for any predicate + fact bag', () => {
    fc.assert(
      fc.property(treeArb, factsArb, (tree, facts) => {
        const r = evaluatePredicate(tree, facts);
        expect(typeof r).toBe('boolean');
      }),
      { numRuns: 500 },
    );
  });

  it('empty all/any always evaluate to false (no truth inversion)', () => {
    fc.assert(
      fc.property(factsArb, (facts) => {
        expect(evaluatePredicate({ all: [] }, facts)).toBe(false);
        expect(evaluatePredicate({ any: [] }, facts)).toBe(false);
      }),
      { numRuns: 50 },
    );
  });

  it('a singleton all/any equals the inner predicate; not is an involution', () => {
    fc.assert(
      fc.property(treeArb, factsArb, (tree, facts) => {
        const inner = evaluatePredicate(tree, facts);
        expect(evaluatePredicate({ all: [tree] }, facts)).toBe(inner);
        expect(evaluatePredicate({ any: [tree] }, facts)).toBe(inner);
        expect(evaluatePredicate({ not: tree }, facts)).toBe(!inner);
        expect(evaluatePredicate({ not: { not: tree } }, facts)).toBe(inner);
      }),
      { numRuns: 300 },
    );
  });

  it('all = conjunction, any = disjunction over the children', () => {
    fc.assert(
      fc.property(fc.array(treeArb, { minLength: 1, maxLength: 4 }), factsArb, (children, facts) => {
        const evals = children.map((c) => evaluatePredicate(c, facts));
        expect(evaluatePredicate({ all: children }, facts)).toBe(evals.every(Boolean));
        expect(evaluatePredicate({ any: children }, facts)).toBe(evals.some(Boolean));
      }),
      { numRuns: 300 },
    );
  });

  it('numeric comparison ops are mutually consistent', () => {
    const numericFact = 'author.totalKarma';
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        (v, t) => {
          const facts = Object.fromEntries(FactPaths.map((k) => [k, k === numericFact ? v : 0])) as FactBag;
          const P = (op: (typeof OPS)[number]) => evaluatePredicate({ fact: numericFact, op, value: t }, facts);
          // gt ⇒ gte;  lt ⇒ lte;  not(gt && lt);  eq ⟺ (gte && lte);  eq ⟺ !neq
          expect(!P('gt') || P('gte')).toBe(true); // gt implies gte
          expect(!P('lt') || P('lte')).toBe(true); // lt implies lte
          expect(P('gt') && P('lt')).toBe(false);
          expect(P('eq')).toBe(P('gte') && P('lte'));
          expect(P('eq')).toBe(!P('neq'));
        },
      ),
      { numRuns: 300 },
    );
  });

  it('comparison ops on a non-numeric fact value never throw and are false', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('content.urlDomain', 'content.containsRegex', 'author.isModerator'),
        fc.integer(),
        (fact, t) => {
          const facts = Object.fromEntries(FactPaths.map((k) => [k, k === fact ? 'a-string' : 0])) as FactBag;
          if (fact === 'author.isModerator') (facts as Record<string, unknown>)[fact] = true;
          for (const op of ['lt', 'lte', 'gt', 'gte'] as const) {
            expect(evaluatePredicate({ fact, op, value: t }, facts)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
