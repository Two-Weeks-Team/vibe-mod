// src/shared/starter-rules.ts
// Five conservative starter rules seeded on install (onAppInstall trigger).
// Design constraints:
//   - SAFE actions only (report / flair / modqueue) — never remove, never guarded.
//   - shadow: true on every rule — nothing acts for real until a mod promotes it.
//   - Each rule's `when` only references facts that are reliably populated even
//     when the Reddit author lookup fails (see fact-bag SAFE_AUTHOR_DEFAULTS).
//   - `createdBy` is the synthetic seed actor `t2_vibemod`; `createdAt` is stamped
//     at seed time by the caller via `seedStarterRules(now)`.
//
// These are intentionally low-stakes: they surface things to the mod queue or
// add a flair, so a brand-new install behaves visibly but harmlessly on day one.

import { Rule, RuleBundle, type RuleType, type RuleBundleType } from './rule-schema';

const SEED_ACTOR = 't2_vibemod';

type SeedRule = Omit<RuleType, 'createdAt' | 'createdBy' | 'enabled' | 'shadow'>;

const STARTER_RULE_SEEDS: readonly SeedRule[] = [
  {
    id: 'r_new_account_fast_post',
    name: 'New account, immediate post → mod queue',
    sourceNL: 'If an account less than one day old makes a post, send it to the mod queue so we can take a look.',
    on: ['onPostSubmit'],
    when: { fact: 'author.accountAgeHours', op: 'lt', value: 24 },
    then: [{ action: 'modqueue', params: { note: 'new-account-post (<24h old)' } }],
    rateLimit: { perAuthor: '1/hour' },
  },
  {
    id: 'r_low_karma_link_drop',
    name: 'Low-karma account dropping several links → mod queue',
    sourceNL: 'If a post has three or more links and the author has under 50 karma, flag it for the mod queue.',
    on: ['onPostSubmit'],
    when: {
      all: [
        { fact: 'content.linkCount', op: 'gte', value: 3 },
        { fact: 'author.totalKarma', op: 'lt', value: 50 },
      ],
    },
    then: [{ action: 'modqueue', params: { note: 'low-karma link drop (>=3 links, <50 karma)' } }],
  },
  {
    id: 'r_shouting_title',
    name: 'All-caps title → flair "Edit your title?"',
    sourceNL:
      'If a post title is mostly capital letters and reasonably long, add a flair asking the author to edit their title.',
    on: ['onPostSubmit'],
    when: {
      all: [
        { fact: 'content.title.upperCaseRatio', op: 'gt', value: 0.7 },
        { fact: 'content.title.length', op: 'gte', value: 12 },
      ],
    },
    then: [{ action: 'flair', params: { flairText: 'Edit your title?' } }],
  },
  {
    id: 'r_wall_of_caps_comment',
    name: 'Long all-caps comment → report',
    sourceNL: 'If someone writes a long comment that is almost entirely capital letters, report it.',
    on: ['onCommentSubmit'],
    when: {
      all: [
        { fact: 'content.upperCaseRatio', op: 'gt', value: 0.8 },
        { fact: 'content.length', op: 'gt', value: 60 },
      ],
    },
    then: [{ action: 'report', params: { reason: 'Wall of caps' } }],
  },
  {
    id: 'r_url_shortener_post',
    name: 'Post linking only a URL shortener → mod queue',
    sourceNL:
      'If a post links to a known URL shortener, send it to the mod queue (we want to see where it actually goes).',
    on: ['onPostSubmit'],
    when: {
      fact: 'content.urlDomain',
      op: 'in',
      value: ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly'],
    },
    then: [{ action: 'modqueue', params: { note: 'url-shortener link' } }],
  },
] as const;

/**
 * Build the install-time rule bundle: the five starter rules, each disabled-free
 * (`enabled: true`) but in `shadow: true` mode so nothing acts for real until a
 * moderator promotes it from the Dashboard.
 *
 * @param now epoch-ms timestamp to stamp on every rule + the bundle.
 */
export function seedStarterRules(now: number = Date.now()): RuleBundleType {
  const rules = STARTER_RULE_SEEDS.map(
    (seed): RuleType => Rule.parse({ ...seed, createdAt: now, createdBy: SEED_ACTOR, enabled: true, shadow: true }),
  );
  return RuleBundle.parse({
    schemaVersion: '1.0.0',
    bundleVersion: 1,
    compiledAt: now,
    llmModel: 'seed',
    llmTokensIn: 0,
    llmTokensOut: 0,
    rules,
  });
}

export const STARTER_RULE_IDS = STARTER_RULE_SEEDS.map((r) => r.id);
