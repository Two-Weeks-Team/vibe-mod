// src/server/routes/triggers.ts
// Reddit trigger handlers: post/comment submit + report, plus the install
// hook (no-op — actual seeding moved to a deferred scheduler task to dodge
// a cold-start vs trigger-deadline race).
//
// Each submit handler dedupes (audit Gap #5), builds a fact bag, and runs
// the deterministic evaluator + executor against the active rule bundle.

import type { Hono } from 'hono';
import { redis } from '@devvit/web/server';
import type {
  OnPostSubmitRequest,
  OnCommentSubmitRequest,
  OnPostReportRequest,
  OnCommentReportRequest,
  OnAppUpgradeRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { LIMITS } from '../../shared/limits';
import { keys } from '../../shared/redis-keys';
import { buildPostFactBag, buildCommentFactBag } from '../fact-bag';
import { selectMatchingRules } from '../evaluator';
import { executeActions, acquireOnce } from '../executor';
import { getCurrentSubredditName } from '../devvit-helpers';
import { safeParseBundle } from '../helpers/rule-validation';

// We process this trigger iff we win the "acquire once" race; otherwise it's
// a duplicate delivery (audit Gap #5 — the old watch/multi/exec never checked
// exec()'s result, so a real concurrent re-delivery still double-processed).
async function isDuplicateTrigger(trigger: string, thingId: string): Promise<boolean> {
  const subName = getCurrentSubredditName();
  const dedupeKey = keys.seen(subName, trigger, thingId);
  return !(await acquireOnce(dedupeKey, LIMITS.TRIGGER_DEDUPE_SECONDS));
}

export function registerTriggerRoutes(app: Hono): void {
  app.post('/internal/trigger/on-post-submit', async (c) => {
    const { post, author, subreddit } = await c.req.json<OnPostSubmitRequest>();
    if (!post || !author) return c.json<TriggerResponse>({ status: 'ok' });

    if (await isDuplicateTrigger('postSubmit', post.id)) {
      return c.json<TriggerResponse>({ status: 'ok' });
    }

    const facts = await buildPostFactBag({
      id: post.id,
      title: post.title,
      body: post.selftext ?? '',
      url: post.url,
      nsfw: post.nsfw,
      isVideo: post.isVideo,
      isSpoiler: post.isSpoiler,
      crosspostParentId: post.crosspostParentId,
      authorId: author.id,
      authorName: author.name,
      sub: subreddit
        ? { weeklyActiveUsers: subreddit.subscribersCount ?? 0, over18: subreddit.nsfw ?? false }
        : undefined,
    });

    const subredditName = getCurrentSubredditName();
    const bundle = safeParseBundle(await redis.get(keys.rulesActive(subredditName)), 'on-post-submit');
    if (!bundle) return c.json<TriggerResponse>({ status: 'ok' });
    const matching = selectMatchingRules(bundle.rules, 'onPostSubmit', facts);

    for (const rule of matching) {
      await executeActions({
        rule,
        thingId: post.id,
        thingType: 'post',
        authorName: author.name,
        authorId: author.id,
        isDryRun: false,
        isShadowMode: rule.shadow,
      });
    }

    return c.json<TriggerResponse>({ status: 'ok' });
  });

  app.post('/internal/trigger/on-comment-submit', async (c) => {
    const { comment, author, subreddit } = await c.req.json<OnCommentSubmitRequest>();
    if (!comment || !author) return c.json<TriggerResponse>({ status: 'ok' });

    if (await isDuplicateTrigger('commentSubmit', comment.id)) {
      return c.json<TriggerResponse>({ status: 'ok' });
    }

    const facts = await buildCommentFactBag({
      id: comment.id,
      body: comment.body,
      parentId: comment.parentId,
      authorId: author.id,
      authorName: author.name,
      sub: subreddit
        ? { weeklyActiveUsers: subreddit.subscribersCount ?? 0, over18: subreddit.nsfw ?? false }
        : undefined,
    });

    const subredditName = getCurrentSubredditName();
    const bundle = safeParseBundle(await redis.get(keys.rulesActive(subredditName)), 'on-comment-submit');
    if (!bundle) return c.json<TriggerResponse>({ status: 'ok' });
    const matching = selectMatchingRules(bundle.rules, 'onCommentSubmit', facts);

    for (const rule of matching) {
      await executeActions({
        rule,
        thingId: comment.id,
        thingType: 'comment',
        authorName: author.name,
        authorId: author.id,
        isDryRun: false,
        isShadowMode: rule.shadow,
      });
    }

    return c.json<TriggerResponse>({ status: 'ok' });
  });

  app.post('/internal/trigger/on-app-install', (c) => {
    // Minimal handler — return 200 immediately, no body parse, no scheduler
    // call, no I/O at all. Previous versions (even with seeding deferred)
    // still failed with "context canceled" on install — likely a cold-start
    // vs trigger-deadline race on the first request to a 2 MB CJS bundle.
    //
    // Starter rules are seeded by the deferred /internal/scheduler/seed-on-install
    // task (registered in devvit.json's `scheduler.tasks` block). Reddit's
    // platform invokes that task after install once the bundle has warmed up.
    // The submit triggers (on-post-submit / on-comment-submit) DO NOT seed
    // — they fail-safe by returning ok when no bundle exists, so a sub
    // running with the seed not yet landed simply takes no action that tick.
    return c.json<TriggerResponse>({ status: 'ok' });
  });

  app.post('/internal/trigger/on-app-upgrade', async (c) => {
    await c.req.json<OnAppUpgradeRequest>();
    return c.json<TriggerResponse>({ status: 'ok' });
  });

  app.post('/internal/trigger/on-post-report', async (c) => {
    await c.req.json<OnPostReportRequest>();
    return c.json<TriggerResponse>({ status: 'ok' });
  });

  app.post('/internal/trigger/on-comment-report', async (c) => {
    await c.req.json<OnCommentReportRequest>();
    return c.json<TriggerResponse>({ status: 'ok' });
  });
}
