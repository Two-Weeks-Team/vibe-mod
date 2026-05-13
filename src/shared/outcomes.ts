// src/shared/outcomes.ts
// Single source of truth for action outcome literals.
// Previously the type lived inline in src/server/executor.ts as a string
// union, and the literals appeared as magic strings throughout. Centralising
// gives us: a TS type, a runtime-checkable Zod enum, and a typed array we can
// iterate in tests + audit aggregators.

import { z } from 'zod';

export const OUTCOMES = ['applied', 'shadow', 'rate_limited', 'guarded_skip', 'error'] as const;

/** What happened when an action was attempted. */
export type Outcome = (typeof OUTCOMES)[number];

/** Zod schema for runtime validation (e.g. parsing audit entries from Redis). */
export const OutcomeSchema = z.enum(OUTCOMES);
