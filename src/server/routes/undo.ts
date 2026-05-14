// src/server/routes/undo.ts
// Menu: "vibe-mod: Undo this action" on a specific post/comment.
// Looks up the most recent applied action against this thingId in the audit
// ZSet, then calls executor.rollbackAction() to restore the post/comment.

import type { Hono } from 'hono';
import { redis } from '@devvit/web/server';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import { keys } from '../../shared/redis-keys';
import { rollbackAction } from '../executor';
import { getCurrentSubredditName } from '../devvit-helpers';
import { isCallerModerator } from '../middleware/auth';
import { describeErr } from '../middleware/diagnostics';

export function registerUndoRoutes(app: Hono): void {
  app.post('/internal/menu/undo-action', async (c) => {
    if (!(await isCallerModerator())) {
      return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
    }
    const { targetId } = await c.req.json<MenuItemRequest>();
    if (!targetId) return c.json<UiResponse>({ showToast: 'No target.' });

    const subredditName = getCurrentSubredditName();
    // Best-effort — reddit/devvit#258 may make every redis read throw. Return
    // an informative toast instead of 500 so the user sees what's happening.
    let recentIds: Array<{ member: string | number }> = [];
    try {
      const auditKey = keys.audit(subredditName);
      recentIds = await redis.zRange(auditKey, 0, 99, { by: 'rank', reverse: true });
    } catch (err) {
      console.warn('[vibe-mod] undo: redis.zRange(audit) threw:', describeErr(err));
      return c.json<UiResponse>({
        showToast: {
          text: 'Audit log unreachable (reddit/devvit#258). Undo cannot run until plugin RPC is restored.',
          appearance: 'neutral',
        },
      });
    }

    // Fetch all candidate audit entries in parallel (Gemini review HIGH on
    // PR #45 flagged the previous sequential loop — 100 hGetAll calls in
    // series can blow the menu handler's deadline). Once they've all
    // returned, scan in original ZSet order to find the first applicable
    // one — that preserves the "most recent first" behaviour of the
    // original break-on-found loop.
    const fetched = await Promise.allSettled(
      recentIds.map((m) => redis.hGetAll(keys.auditEntry(subredditName, m.member as string))),
    );
    let found: string | null = null;
    for (let i = 0; i < recentIds.length; i++) {
      const settled = fetched[i];
      if (settled.status === 'rejected') {
        console.warn('[vibe-mod] undo: redis.hGetAll(entry) failed — skipping:', describeErr(settled.reason));
        continue;
      }
      const h = settled.value;
      if (h.thingId === targetId && h.outcome === 'applied' && !h.rolledBack) {
        found = recentIds[i].member as string;
        break;
      }
    }
    if (!found)
      return c.json<UiResponse>({
        showToast: 'No vibe-mod action found for this item (or already rolled back, or window expired).',
      });

    try {
      const result = await rollbackAction(subredditName, found);
      return c.json<UiResponse>({
        showToast: {
          text: result.ok ? 'Rolled back.' : `Couldn't roll back: ${result.reason}`,
          appearance: result.ok ? 'success' : 'neutral',
        },
      });
    } catch (err) {
      console.warn('[vibe-mod] undo: rollbackAction threw:', describeErr(err));
      return c.json<UiResponse>({
        showToast: { text: 'Rollback failed — plugin RPC unreachable.', appearance: 'neutral' },
      });
    }
  });
}
