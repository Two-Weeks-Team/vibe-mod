// src/shared/system-prompt.test.ts
// The prompt enumerates the closed fact + action sets to the LLM. It must stay
// in sync with rule-schema.ts (the actual enforcement boundary), and the
// few-shot examples must themselves be valid (or valid clarifications).

import { describe, it, expect } from 'vitest';
import { VIBE_MOD_SYSTEM_PROMPT, FEW_SHOT_EXAMPLES } from './system-prompt';
import { FactPaths, SAFE_ACTIONS, GUARDED_ACTIONS, Rule } from './rule-schema';

describe('VIBE_MOD_SYSTEM_PROMPT', () => {
  it('lists every fact path from the schema', () => {
    for (const f of FactPaths) expect(VIBE_MOD_SYSTEM_PROMPT).toContain(f);
  });

  it('lists every safe and guarded action verb', () => {
    for (const a of [...SAFE_ACTIONS, ...GUARDED_ACTIONS]) expect(VIBE_MOD_SYSTEM_PROMPT).toContain(a);
  });

  it('does not invite the model to invent facts', () => {
    expect(VIBE_MOD_SYSTEM_PROMPT).toMatch(/NEVER invent a fact/i);
  });

  it('documents the clarification escape hatch', () => {
    expect(VIBE_MOD_SYSTEM_PROMPT).toContain('needsClarification');
  });

  it('stays small enough to be cheap (< ~1200 words)', () => {
    expect(VIBE_MOD_SYSTEM_PROMPT.split(/\s+/).length).toBeLessThan(1200);
  });
});

describe('FEW_SHOT_EXAMPLES', () => {
  it('contains both rule examples and at least one clarification example', () => {
    const rules = FEW_SHOT_EXAMPLES.filter((e) => !('needsClarification' in e.assistant));
    const clarifications = FEW_SHOT_EXAMPLES.filter((e) => 'needsClarification' in e.assistant);
    expect(rules.length).toBeGreaterThanOrEqual(2);
    expect(clarifications.length).toBeGreaterThanOrEqual(1);
  });

  it('every rule example validates against the Rule schema', () => {
    for (const ex of FEW_SHOT_EXAMPLES) {
      if ('needsClarification' in ex.assistant) continue;
      const augmented = { ...ex.assistant, createdAt: 1, createdBy: 't2_seed', enabled: true, shadow: true };
      expect(() => Rule.parse(augmented), `example "${ex.user}" should validate`).not.toThrow();
    }
  });

  it('rule examples copy the moderator input verbatim into sourceNL', () => {
    for (const ex of FEW_SHOT_EXAMPLES) {
      if ('needsClarification' in ex.assistant) continue;
      expect(ex.assistant.sourceNL).toBe(ex.user);
    }
  });

  it('never emits a guarded verb in a few-shot rule example', () => {
    for (const ex of FEW_SHOT_EXAMPLES) {
      if ('needsClarification' in ex.assistant) continue;
      for (const act of ex.assistant.then) {
        expect(GUARDED_ACTIONS as readonly string[]).not.toContain(act.action);
      }
    }
  });

  it('clarification examples carry a question and suggested answers', () => {
    for (const ex of FEW_SHOT_EXAMPLES) {
      if (!('needsClarification' in ex.assistant)) continue;
      expect((ex.assistant.question ?? '').length).toBeGreaterThan(0);
      expect(Array.isArray(ex.assistant.suggestedAnswers)).toBe(true);
    }
  });
});
