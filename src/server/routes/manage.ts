// src/server/routes/manage.ts
// Per-rule control surface (Phase 1.7b, audit findings #3 + #10). Replaces
// the previous bulk "Activate N drafts" flow that lived on the Dashboard.
//
// Flow:
//   /internal/menu/manage-rules         → renders one form-group per rule
//   /internal/form/manage-rules-submit  → applies non-destructive actions OR
//                                          forwards deletes to the confirm form
//   /internal/form/manage-delete-confirm → applies once explicitly confirmed
//
// Persistence runs through `applyManageActions()` (private to this module),
// which uses Devvit's redis.watch/multi/exec for an atomic dual-write of
// the active + draft bundles.

import type { Hono } from 'hono';
import { redis } from '@devvit/web/server';
import type { FormField, MenuItemRequest, UiResponse } from '@devvit/web/shared';
import { keys } from '../../shared/redis-keys';
import { type RuleBundleType, type RuleType } from '../../shared/rule-schema';
import { getCurrentSubredditName } from '../devvit-helpers';
import { isCallerModerator } from '../middleware/auth';
import { describeErr } from '../middleware/diagnostics';
import { safeParseBundle } from '../helpers/rule-validation';
import { humanizeRule, readOpenaiModel, unwrapFormString } from '../helpers/openai';
import type { DryRunResult } from './scheduler';

export function registerManageRoutes(app: Hono): void {
  app.post('/internal/menu/manage-rules', async (c) => {
    await c.req.json<MenuItemRequest>();
    if (!(await isCallerModerator())) {
      return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
    }

    const subredditName = getCurrentSubredditName();
    let active: RuleBundleType | null = null;
    let draft: RuleBundleType | null = null;
    try {
      active = safeParseBundle(await redis.get(keys.rulesActive(subredditName)), 'manage/active');
      draft = safeParseBundle(await redis.get(keys.rulesDraft(subredditName)), 'manage/draft');
    } catch (err) {
      console.warn('[vibe-mod] manage: redis.get(rules) threw:', describeErr(err));
      return c.json<UiResponse>({
        showToast: {
          text: 'Plugin RPC unreachable (reddit/devvit#258). Cannot manage rules until the platform is restored.',
          appearance: 'neutral',
        },
      });
    }

    const drafts = draft?.rules ?? [];
    const actives = active?.rules ?? [];

    // Empty state (audit finding #A).
    if (drafts.length === 0 && actives.length === 0) {
      return c.json<UiResponse>({
        showToast: {
          text: 'No rules yet. Open the subreddit ⋯ menu → "vibe-mod: Compose rule" to write your first rule.',
          appearance: 'neutral',
        },
      });
    }

    // Pre-fetch dry-run summaries in parallel (Gemini review #1, PR #44).
    const dryRunByRuleId = new Map<string, string>();
    const dryRunFetches = await Promise.allSettled(drafts.map((r) => redis.get(keys.dryrun(subredditName, r.id))));
    for (let i = 0; i < drafts.length; i++) {
      const r = drafts[i];
      const settled = dryRunFetches[i];
      if (settled.status === 'rejected') {
        console.warn(`[vibe-mod] manage: redis.get(dryrun/${r.id}) threw:`, describeErr(settled.reason));
        continue;
      }
      if (!settled.value) continue;
      try {
        const d = JSON.parse(settled.value) as DryRunResult;
        if (d.status === 'ok') {
          dryRunByRuleId.set(
            r.id,
            `Dry-run: would match ${d.matched.length}/${d.sampledPosts} recent post(s)` +
              (d.matched.length ? ` → ${[...new Set(d.matched.flatMap((m) => m.would))].join(', ')}` : ''),
          );
        } else {
          dryRunByRuleId.set(r.id, `Dry-run: ${d.note ?? 'unavailable'}`);
        }
      } catch (err) {
        console.warn(`[vibe-mod] manage: parse(dryrun/${r.id}) failed:`, describeErr(err));
      }
    }

    const fields: FormField[] = [];

    for (const r of drafts) {
      const dry = dryRunByRuleId.get(r.id) ?? 'Dry-run: pending — re-open in 30s.';
      const summary = `${r.sourceNL}\n\n${humanizeRule(r)}\n\n${dry}`;
      fields.push({
        type: 'group',
        label: `📝 Draft: ${r.name}`,
        fields: [
          { name: `info_${r.id}`, label: 'Rule', type: 'paragraph', defaultValue: summary, disabled: true },
          {
            name: `action_${r.id}`,
            label: 'Action',
            type: 'select',
            options: [
              { label: 'Keep as draft', value: 'keep' },
              { label: 'Activate (shadow mode 24h)', value: 'activate-shadow' },
              { label: 'Activate immediately (skip shadow)', value: 'activate-now' },
              { label: 'Delete', value: 'delete' },
            ],
            defaultValue: ['keep'],
            multiSelect: false,
          },
        ],
      });
    }

    for (const r of actives) {
      const status = r.shadow ? '👻 Shadow' : '✅ Live';
      const sinceMs = Date.now() - (r.activatedAt ?? r.createdAt);
      const sinceHours = Math.max(0, Math.round(sinceMs / 3_600_000));
      const summary = `${r.sourceNL}\n\n${humanizeRule(r)}\n\n${status} for ~${sinceHours}h.`;
      fields.push({
        type: 'group',
        label: `${status}: ${r.name}`,
        fields: [
          { name: `info_${r.id}`, label: 'Rule', type: 'paragraph', defaultValue: summary, disabled: true },
          {
            name: `action_${r.id}`,
            label: 'Action',
            type: 'select',
            options: [
              { label: 'Keep', value: 'keep' },
              ...(r.shadow ? [{ label: 'Promote shadow → live', value: 'promote' }] : []),
              { label: 'Pause (back to draft)', value: 'pause' },
              { label: 'Delete', value: 'delete' },
            ],
            defaultValue: ['keep'],
            multiSelect: false,
          },
        ],
      });
    }

    return c.json<UiResponse>({
      showForm: {
        name: 'manageRulesForm',
        form: {
          title: `Manage rules (${drafts.length} draft · ${actives.length} active)`,
          description:
            'Pick an action per rule. Deletes will ask for confirmation. Activate moves a draft into the live bundle (with shadow window). Pause moves a live rule back into drafts.',
          acceptLabel: 'Apply changes',
          cancelLabel: 'Cancel',
          fields,
        },
      },
    });
  });

  // Manage submit — collect every `action_${id}` and apply the diff. Delete
  // actions short-circuit into the confirm form so destructive intent is
  // acknowledged once before the rules disappear (audit finding #B).
  app.post('/internal/form/manage-rules-submit', async (c) => {
    if (!(await isCallerModerator())) {
      return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
    }
    const raw = (await c.req.json<Record<string, unknown>>()) || {};
    const actions: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (!k.startsWith('action_')) continue;
      const id = k.slice('action_'.length);
      const decision = unwrapFormString(v as string | string[]);
      if (decision && decision !== 'keep') actions[id] = decision;
    }

    if (Object.keys(actions).length === 0) {
      return c.json<UiResponse>({ showToast: 'No changes selected.' });
    }

    const deleteIds = Object.entries(actions)
      .filter(([, decision]) => decision === 'delete')
      .map(([id]) => id);

    if (deleteIds.length > 0) {
      const subredditName = getCurrentSubredditName();
      let active: RuleBundleType | null = null;
      let draft: RuleBundleType | null = null;
      try {
        active = safeParseBundle(await redis.get(keys.rulesActive(subredditName)), 'manage/confirm/active');
        draft = safeParseBundle(await redis.get(keys.rulesDraft(subredditName)), 'manage/confirm/draft');
      } catch (err) {
        console.warn('[vibe-mod] manage-confirm: redis.get(rules) threw:', describeErr(err));
      }
      const findRule = (id: string) => active?.rules.find((x) => x.id === id) ?? draft?.rules.find((x) => x.id === id);
      const deleteList = deleteIds
        .map((id) => {
          const r = findRule(id);
          return r ? `- ${r.name}  (${id})` : `- ${id}`;
        })
        .join('\n');

      return c.json<UiResponse>({
        showForm: {
          name: 'manageDeleteConfirmForm',
          form: {
            title: `Delete ${deleteIds.length} rule(s)?`,
            description:
              `These rules will be removed from both the draft and active bundles. Existing audit-log entries are kept (rollback tokens for any past actions remain valid for 30 days).\n\n` +
              deleteList,
            acceptLabel: 'Confirm delete',
            cancelLabel: 'Cancel',
            fields: [
              {
                name: 'confirmed',
                label: 'I understand this is permanent',
                type: 'boolean',
                defaultValue: false,
              },
              {
                name: 'pendingActions',
                label: '(internal) pending action map',
                type: 'paragraph',
                defaultValue: JSON.stringify(actions),
                disabled: true,
              },
            ],
          },
        },
      });
    }

    const result = await applyManageActions(actions);
    return c.json<UiResponse>({
      showToast: { text: result.summary, appearance: result.persisted ? 'success' : 'neutral' },
    });
  });

  app.post('/internal/form/manage-delete-confirm', async (c) => {
    if (!(await isCallerModerator())) {
      return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
    }
    const raw = await c.req.json<{ confirmed?: boolean; pendingActions?: string | string[] }>();
    if (!raw.confirmed) {
      return c.json<UiResponse>({ showToast: 'Delete cancelled. No rules were removed.' });
    }
    let actions: Record<string, string> = {};
    try {
      actions = JSON.parse(unwrapFormString(raw.pendingActions)) as Record<string, string>;
    } catch (_err) {
      return c.json<UiResponse>({
        showToast: { text: 'Could not parse the pending action set. Re-open Manage rules.', appearance: 'neutral' },
      });
    }
    const result = await applyManageActions(actions);
    return c.json<UiResponse>({
      showToast: { text: result.summary, appearance: result.persisted ? 'success' : 'neutral' },
    });
  });
}

// Apply a manage-rules action map. Each id maps to one of:
//   keep | activate-shadow | activate-now | promote | pause | delete
//
// Performs an atomic dual-write of the active + draft bundles using
// redis.watch/multi/exec so a partial failure can't leave a rule absent
// from both bundles (Gemini review #4, PR #44). Also enforces the 50-rule
// cap on both bundles (Gemini review #2) and uses the configured openaiModel
// as the bundle's `llmModel` fallback (Gemini review #3).
async function applyManageActions(actions: Record<string, string>): Promise<{ persisted: boolean; summary: string }> {
  const subredditName = getCurrentSubredditName();
  let active: RuleBundleType | null = null;
  let draft: RuleBundleType | null = null;
  try {
    active = safeParseBundle(await redis.get(keys.rulesActive(subredditName)), 'manage/apply/active');
    draft = safeParseBundle(await redis.get(keys.rulesDraft(subredditName)), 'manage/apply/draft');
  } catch (err) {
    console.warn('[vibe-mod] manage/apply: redis.get(rules) threw:', describeErr(err));
    return {
      persisted: false,
      summary: 'Plugin RPC unreachable (reddit/devvit#258). No changes applied.',
    };
  }

  const draftRules: RuleType[] = (draft?.rules ?? []).slice();
  const activeRules: RuleType[] = (active?.rules ?? []).slice();
  const now = Date.now();

  let activated = 0;
  let promoted = 0;
  let paused = 0;
  let deleted = 0;
  let kept = 0;

  for (const [id, decision] of Object.entries(actions)) {
    if (decision === 'keep') {
      kept++;
      continue;
    }
    const inDraftIdx = draftRules.findIndex((r) => r.id === id);
    const inActiveIdx = activeRules.findIndex((r) => r.id === id);

    if (decision === 'activate-shadow' || decision === 'activate-now') {
      if (inDraftIdx < 0) continue;
      const r = draftRules[inDraftIdx];
      r.shadow = decision === 'activate-shadow';
      r.activatedAt = now;
      const existing = activeRules.findIndex((x) => x.id === id);
      if (existing >= 0) activeRules[existing] = r;
      else activeRules.push(r);
      draftRules.splice(inDraftIdx, 1);
      activated++;
    } else if (decision === 'promote') {
      if (inActiveIdx < 0) continue;
      const r = activeRules[inActiveIdx];
      if (r.shadow) {
        r.shadow = false;
        promoted++;
      }
    } else if (decision === 'pause') {
      if (inActiveIdx < 0) continue;
      const r = activeRules[inActiveIdx];
      r.shadow = true;
      const existing = draftRules.findIndex((x) => x.id === id);
      if (existing >= 0) draftRules[existing] = r;
      else draftRules.push(r);
      activeRules.splice(inActiveIdx, 1);
      paused++;
    } else if (decision === 'delete') {
      if (inDraftIdx >= 0) draftRules.splice(inDraftIdx, 1);
      if (inActiveIdx >= 0) activeRules.splice(inActiveIdx, 1);
      if (inDraftIdx >= 0 || inActiveIdx >= 0) deleted++;
    }
  }

  if (activeRules.length > 50 || draftRules.length > 50) {
    return {
      persisted: false,
      summary: `Rule cap exceeded after this change (active=${activeRules.length}, draft=${draftRules.length}, max=50). Delete a rule first, then retry.`,
    };
  }

  const fallbackModel = await readOpenaiModel();
  const draftBundle: RuleBundleType = {
    schemaVersion: '1.0.0',
    bundleVersion: (draft?.bundleVersion ?? 0) + 1,
    compiledAt: now,
    llmModel: draft?.llmModel ?? fallbackModel,
    llmTokensIn: draft?.llmTokensIn ?? 0,
    llmTokensOut: draft?.llmTokensOut ?? 0,
    rules: draftRules,
  };
  const activeBundle: RuleBundleType = {
    schemaVersion: '1.0.0',
    bundleVersion: (active?.bundleVersion ?? 0) + 1,
    compiledAt: now,
    llmModel: active?.llmModel ?? fallbackModel,
    llmTokensIn: active?.llmTokensIn ?? 0,
    llmTokensOut: active?.llmTokensOut ?? 0,
    rules: activeRules,
  };

  let persisted = true;
  let aborted = false;
  try {
    const txn = await redis.watch(keys.rulesActive(subredditName), keys.rulesDraft(subredditName));
    await txn.multi();
    await txn.set(keys.rulesActive(subredditName), JSON.stringify(activeBundle));
    await txn.set(keys.rulesDraft(subredditName), JSON.stringify(draftBundle));
    const result = await txn.exec();
    if (result == null) aborted = true;
  } catch (err) {
    persisted = false;
    console.warn('[vibe-mod] manage/apply: txn.exec threw:', describeErr(err));
  }
  if (aborted) {
    persisted = false;
  }

  const parts: string[] = [];
  if (activated) parts.push(`activated ${activated}`);
  if (promoted) parts.push(`promoted ${promoted}`);
  if (paused) parts.push(`paused ${paused}`);
  if (deleted) parts.push(`deleted ${deleted}`);
  if (parts.length === 0 && kept > 0) parts.push(`kept ${kept} (no other action)`);
  if (parts.length === 0) parts.push('no matching rules to change');
  const summary = persisted
    ? `Applied: ${parts.join(', ')}.`
    : aborted
      ? `Another moderator changed the rules at the same time — your changes were not applied. Re-open Manage rules and try again. (Intended: ${parts.join(', ')}.)`
      : `Could not persist (plugin RPC unreachable). Intended: ${parts.join(', ')}.`;
  return { persisted, summary };
}
