// src/server/routes/settings.ts
// Settings validation endpoints — Devvit calls these whenever a moderator
// edits the per-sub settings page (validationEndpoint in devvit.json).

import type { Hono } from 'hono';
import type { SettingsValidationRequest, SettingsValidationResponse } from '@devvit/web/shared';

export function registerSettingsRoutes(app: Hono): void {
  app.post('/internal/settings/validate-rate-limit', async (c) => {
    const { value } = await c.req.json<SettingsValidationRequest<number>>();
    if (typeof value !== 'number' || value < 1 || value > 10000) {
      return c.json<SettingsValidationResponse>({ success: false, error: 'Must be 1–10000.' });
    }
    return c.json<SettingsValidationResponse>({ success: true });
  });

  app.post('/internal/settings/validate-shadow', async (c) => {
    const { value } = await c.req.json<SettingsValidationRequest<number>>();
    if (typeof value !== 'number' || value < 0 || value > 168) {
      return c.json<SettingsValidationResponse>({ success: false, error: 'Must be 0–168 hours.' });
    }
    return c.json<SettingsValidationResponse>({ success: true });
  });
}
