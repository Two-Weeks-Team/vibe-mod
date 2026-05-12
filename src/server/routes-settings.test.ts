// src/server/routes-settings.test.ts
// Functional call-tests for the settings validation endpoints referenced by
// devvit.json (maxActionsPerHour, shadowDurationHours).

import { describe, it, expect } from 'vitest';
import app from './index';

async function validate(path: string, value: unknown): Promise<{ success: boolean; error?: string }> {
  const res = await app.fetch(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ value, isEditing: false }),
    }),
  );
  return res.json();
}

describe('POST /internal/settings/validate-rate-limit', () => {
  const p = '/internal/settings/validate-rate-limit';
  it('accepts a value in [1, 10000]', async () => {
    expect(await validate(p, 1)).toEqual({ success: true });
    expect(await validate(p, 100)).toEqual({ success: true });
    expect(await validate(p, 10_000)).toEqual({ success: true });
  });
  it('rejects values below 1, above 10000, or non-numeric', async () => {
    expect(await validate(p, 0)).toEqual({ success: false, error: 'Must be 1–10000.' });
    expect(await validate(p, 10_001)).toEqual({ success: false, error: 'Must be 1–10000.' });
    expect(await validate(p, 'lots')).toEqual({ success: false, error: 'Must be 1–10000.' });
    expect(await validate(p, undefined)).toEqual({ success: false, error: 'Must be 1–10000.' });
  });
});

describe('POST /internal/settings/validate-shadow', () => {
  const p = '/internal/settings/validate-shadow';
  it('accepts 0 (auto-promote off) through 168 hours', async () => {
    expect(await validate(p, 0)).toEqual({ success: true });
    expect(await validate(p, 24)).toEqual({ success: true });
    expect(await validate(p, 168)).toEqual({ success: true });
  });
  it('rejects negatives, values over a week, or non-numeric', async () => {
    expect(await validate(p, -1)).toEqual({ success: false, error: 'Must be 0–168 hours.' });
    expect(await validate(p, 169)).toEqual({ success: false, error: 'Must be 0–168 hours.' });
    expect(await validate(p, 'forever')).toEqual({ success: false, error: 'Must be 0–168 hours.' });
  });
});
