// src/shared/rule-schema.test.ts
// The schema is a security boundary — LLM output must validate against it
// before it ever reaches Redis. These tests pin the boundary shape.

import { describe, it, expect } from 'vitest';
import {
  Rule,
  RuleBundle,
  checkTreeDepth,
  SAFE_ACTIONS,
  GUARDED_ACTIONS,
  ACTION_VERBS,
  FactPaths,
} from './rule-schema';

const baseRule = {
  id: 'r_new_account_fast_post',
  name: 'New-account fast post',
  sourceNL: 'If a brand-new account posts within 3 hours of joining, send it to mod queue',
  on: ['onPostSubmit'],
  when: {
    all: [
      { fact: 'author.accountAgeHours', op: 'lt', value: 24 },
      { fact: 'author.subJoinAgeHours', op: 'lt', value: 3 },
    ],
  },
  then: [{ action: 'modqueue', params: { note: 'new-account-fast-post' } }],
  createdAt: 1_700_000_000_000,
  createdBy: 't2_abc123',
};

describe('action verb constants', () => {
  it('keeps safe and guarded sets disjoint', () => {
    for (const v of SAFE_ACTIONS) expect(GUARDED_ACTIONS).not.toContain(v);
  });

  it('ACTION_VERBS is the union of safe + guarded', () => {
    expect([...ACTION_VERBS].sort()).toEqual([...SAFE_ACTIONS, ...GUARDED_ACTIONS].sort());
  });

  it('locks the v0.1 whitelist exactly', () => {
    expect([...SAFE_ACTIONS]).toEqual(['report', 'flair', 'lock', 'modqueue', 'remove']);
    // v0.0.50: 'approve' joined GUARDED (not SAFE) so mods must opt-in before
    // an LLM-emitted rule can auto-wave content through. See SAFE/GUARDED
    // commentary in rule-schema.ts for the asymmetric-failure reasoning.
    expect([...GUARDED_ACTIONS]).toEqual(['ban', 'mute', 'permaban', 'approve']);
  });
});

describe('FactPaths', () => {
  it('has no duplicates', () => {
    expect(new Set(FactPaths).size).toBe(FactPaths.length);
  });
});

describe('Rule schema', () => {
  it('accepts a well-formed rule and applies defaults', () => {
    const parsed = Rule.parse(baseRule);
    expect(parsed.enabled).toBe(true);
    expect(parsed.shadow).toBe(true); // shadow defaults ON (hard lock #4)
  });

  it('rejects an unknown top-level field (.strict — audit Gap #1)', () => {
    expect(() => Rule.parse({ ...baseRule, evil: 'smuggled' })).toThrow();
  });

  it('rejects an unknown action verb', () => {
    expect(() => Rule.parse({ ...baseRule, then: [{ action: 'shadowban', params: {} }] })).toThrow();
  });

  it('rejects an unknown fact path', () => {
    expect(() =>
      Rule.parse({
        ...baseRule,
        when: { fact: 'author.isAdmin', op: 'eq', value: true },
      }),
    ).toThrow();
  });

  it('rejects an unknown predicate operator', () => {
    expect(() =>
      Rule.parse({
        ...baseRule,
        when: { fact: 'author.totalKarma', op: 'startsWith', value: 'x' },
      }),
    ).toThrow();
  });

  it('rejects an id that does not match the r_ pattern', () => {
    expect(() => Rule.parse({ ...baseRule, id: 'BadId!' })).toThrow();
    expect(() => Rule.parse({ ...baseRule, id: 'r_' + 'x'.repeat(61) })).toThrow();
  });

  it('rejects a createdBy that is not a t2_ thing id', () => {
    expect(() => Rule.parse({ ...baseRule, createdBy: 'u/spez' })).toThrow();
  });

  it('requires at least one trigger and at most RULE_TRIGGERS.length entries', () => {
    expect(() => Rule.parse({ ...baseRule, on: [] })).toThrow();
    // Over-cap: 6 entries when RULE_TRIGGERS has 5 (post-v0.0.50). The
    // duplicate at the end is deliberate so the array exceeds the cap
    // regardless of how many enum members are added later.
    expect(() =>
      Rule.parse({
        ...baseRule,
        on: ['onPostSubmit', 'onCommentSubmit', 'onPostReport', 'onCommentReport', 'onPostFlairUpdate', 'onPostSubmit'],
      }),
    ).toThrow();
  });

  it('requires at least one action and caps at five', () => {
    expect(() => Rule.parse({ ...baseRule, then: [] })).toThrow();
    expect(() =>
      Rule.parse({
        ...baseRule,
        then: Array.from({ length: 6 }, () => ({ action: 'lock', params: {} })),
      }),
    ).toThrow();
  });

  it('rejects an empty all/any array (min(1))', () => {
    expect(() => Rule.parse({ ...baseRule, when: { all: [] } })).toThrow();
    expect(() => Rule.parse({ ...baseRule, when: { any: [] } })).toThrow();
  });

  it('rejects an extra param on a lock action (.strict params)', () => {
    expect(() => Rule.parse({ ...baseRule, then: [{ action: 'lock', params: { surprise: 1 } }] })).toThrow();
  });

  it('clamps mute duration to <=72 hours', () => {
    expect(() => Rule.parse({ ...baseRule, then: [{ action: 'mute', params: { duration: 73 } }] })).toThrow();
    const ok = Rule.parse({ ...baseRule, then: [{ action: 'mute', params: { duration: 72 } }] });
    expect(ok.then[0].action).toBe('mute');
  });

  it('accepts a deeply nested but valid predicate tree', () => {
    const nested = {
      ...baseRule,
      when: { not: { any: [{ all: [{ fact: 'content.length', op: 'gt', value: 0 }] }] } },
    };
    expect(() => Rule.parse(nested)).not.toThrow();
  });
});

describe('RuleBundle schema', () => {
  const bundle = {
    schemaVersion: '1.0.0',
    bundleVersion: 1,
    compiledAt: Date.now(),
    llmModel: 'gpt-5.4-nano',
    llmTokensIn: 100,
    llmTokensOut: 50,
    rules: [baseRule],
  };

  it('accepts a valid bundle', () => {
    expect(() => RuleBundle.parse(bundle)).not.toThrow();
  });

  it('pins schemaVersion to 1.0.0', () => {
    expect(() => RuleBundle.parse({ ...bundle, schemaVersion: '2.0.0' })).toThrow();
  });

  it('caps the bundle at 50 rules', () => {
    const rules = Array.from({ length: 51 }, (_, i) => ({ ...baseRule, id: `r_x${i}` }));
    expect(() => RuleBundle.parse({ ...bundle, rules })).toThrow();
  });

  it('rejects unknown bundle fields (.strict)', () => {
    expect(() => RuleBundle.parse({ ...bundle, sneaky: true })).toThrow();
  });
});

describe('checkTreeDepth', () => {
  it('passes a shallow tree', () => {
    expect(() => checkTreeDepth({ fact: 'content.length', op: 'gt', value: 0 })).not.toThrow();
  });

  it('passes a tree exactly at the depth limit (6)', () => {
    // depth counter starts at 0 and increments per nesting level; 6 nested
    // wrappers reach depth 6 which is allowed (the throw is on >6).
    let tree: unknown = { fact: 'content.length', op: 'gt', value: 0 };
    for (let i = 0; i < 6; i++) tree = { not: tree };
    expect(() => checkTreeDepth(tree as Parameters<typeof checkTreeDepth>[0])).not.toThrow();
  });

  it('throws when the tree is deeper than 6 levels', () => {
    let tree: unknown = { fact: 'content.length', op: 'gt', value: 0 };
    for (let i = 0; i < 8; i++) tree = { all: [tree] };
    expect(() => checkTreeDepth(tree as Parameters<typeof checkTreeDepth>[0])).toThrow(/too deep/);
  });

  it('walks all branches of an all/any node', () => {
    let deep: unknown = { fact: 'content.length', op: 'gt', value: 0 };
    for (let i = 0; i < 8; i++) deep = { any: [deep] };
    const tree = { all: [{ fact: 'content.length', op: 'gt', value: 0 }, deep] };
    expect(() => checkTreeDepth(tree as Parameters<typeof checkTreeDepth>[0])).toThrow(/too deep/);
  });
});
