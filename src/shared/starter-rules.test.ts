// src/shared/starter-rules.test.ts
// The install-time seed bundle must be safe-by-construction: SAFE actions only,
// shadow ON, schema-valid, and within the depth/size caps.

import { describe, it, expect } from 'vitest';
import { seedStarterRules, STARTER_RULE_IDS } from './starter-rules';
import { RuleBundle, checkTreeDepth, GUARDED_ACTIONS, SAFE_ACTIONS } from './rule-schema';
import { selectMatchingRules } from '../server/evaluator';
import type { FactBag } from './rule-schema';

describe('seedStarterRules', () => {
  it('produces a schema-valid bundle of exactly 5 rules', () => {
    const bundle = seedStarterRules(1_700_000_000_000);
    expect(() => RuleBundle.parse(bundle)).not.toThrow();
    expect(bundle.rules).toHaveLength(6);
    expect(bundle.rules.map((r) => r.id)).toEqual(STARTER_RULE_IDS);
  });

  it('stamps the supplied timestamp on every rule and the bundle', () => {
    const now = 1_725_000_000_000;
    const bundle = seedStarterRules(now);
    expect(bundle.compiledAt).toBe(now);
    for (const r of bundle.rules) expect(r.createdAt).toBe(now);
  });

  it('marks every rule shadow:true and enabled:true (hard lock #4)', () => {
    for (const r of seedStarterRules().rules) {
      expect(r.shadow).toBe(true);
      expect(r.enabled).toBe(true);
    }
  });

  it('uses only SAFE actions — never a guarded verb, never remove', () => {
    for (const r of seedStarterRules().rules) {
      for (const act of r.then) {
        expect(SAFE_ACTIONS as readonly string[]).toContain(act.action);
        expect(GUARDED_ACTIONS as readonly string[]).not.toContain(act.action);
        expect(act.action).not.toBe('remove');
      }
    }
  });

  it('keeps every predicate tree within the depth cap', () => {
    for (const r of seedStarterRules().rules) {
      expect(() => checkTreeDepth(r.when as Parameters<typeof checkTreeDepth>[0])).not.toThrow();
    }
  });

  it('has unique rule ids', () => {
    const ids = seedStarterRules().rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is deterministic for a fixed timestamp', () => {
    expect(JSON.stringify(seedStarterRules(42))).toBe(JSON.stringify(seedStarterRules(42)));
  });
});

describe('starter rules behave as intended against representative fact bags', () => {
  const base: FactBag = {
    'author.accountAgeHours': 1000,
    'author.totalKarma': 5000,
    'author.postKarma': 2000,
    'author.commentKarma': 3000,
    'author.subKarma': 100,
    'author.isModerator': false,
    'author.hasVerifiedEmail': true,
    'author.subJoinAgeHours': 1000,
    'author.flairText': '',
    'content.length': 100,
    'content.wordCount': 20,
    'content.linkCount': 0,
    'content.imageCount': 0,
    'content.upperCaseRatio': 0.05,
    'content.nonAsciiRatio': 0,
    'content.isLinkPost': false,
    'content.over18': false,
    'content.isVideo': false,
    'content.isSpoiler': false,
    'content.isCrosspost': false,
    'content.containsRegex': 'a normal post',
    'content.title.length': 20,
    'content.title.contains': 'A Normal Title',
    'content.title.upperCaseRatio': 0.05,
    'content.url': '',
    'content.urlDomain': '',
    'post.flairText': '',
    'post.flairCssClass': '',
    'time.hourOfDay': 12,
    'time.dayOfWeek': 3,
    'sub.weeklyActiveUsers': 500,
    'sub.over18': false,
    'reports.count': 0,
    'reports.distinctReporters': 0,
  };
  const rules = seedStarterRules().rules;

  it('a calm post from an established account matches nothing', () => {
    expect(selectMatchingRules(rules, 'onPostSubmit', base)).toHaveLength(0);
  });

  it('a fresh-account post matches the new-account rule', () => {
    const out = selectMatchingRules(rules, 'onPostSubmit', { ...base, 'author.accountAgeHours': 3 });
    expect(out.map((r) => r.id)).toContain('r_new_account_fast_post');
  });

  it('a low-karma multi-link post matches the link-drop rule', () => {
    const out = selectMatchingRules(rules, 'onPostSubmit', {
      ...base,
      'content.linkCount': 4,
      'author.totalKarma': 10,
    });
    expect(out.map((r) => r.id)).toContain('r_low_karma_link_drop');
  });

  it('an ALL-CAPS title matches the shouting-title rule (title ratio, not body ratio)', () => {
    const out = selectMatchingRules(rules, 'onPostSubmit', {
      ...base,
      'content.title.upperCaseRatio': 0.95,
      'content.title.length': 30,
    });
    expect(out.map((r) => r.id)).toContain('r_shouting_title');
  });

  it('a normal-cased title with an ALL-CAPS body does NOT trigger the shouting-title rule', () => {
    const out = selectMatchingRules(rules, 'onPostSubmit', {
      ...base,
      'content.upperCaseRatio': 0.95, // body is shouty, title is not
      'content.title.upperCaseRatio': 0.05,
      'content.title.length': 30,
    });
    expect(out.map((r) => r.id)).not.toContain('r_shouting_title');
  });

  it('a long all-caps comment matches the wall-of-caps rule', () => {
    const out = selectMatchingRules(rules, 'onCommentSubmit', {
      ...base,
      'content.upperCaseRatio': 0.9,
      'content.length': 120,
    });
    expect(out.map((r) => r.id)).toContain('r_wall_of_caps_comment');
  });

  it('a bit.ly post matches the url-shortener rule', () => {
    const out = selectMatchingRules(rules, 'onPostSubmit', { ...base, 'content.urlDomain': 'bit.ly' });
    expect(out.map((r) => r.id)).toContain('r_url_shortener_post');
  });
});
