import { z } from 'zod';
import {
  BktParams,
  Question,
  SelectionReason,
  SkillStatus,
  Stage,
  StrategyName,
} from './domain.js';

/**
 * Engine-facing types. The engine (SPEC.md §5) is pure: it receives a
 * read-only snapshot of a learner's state plus `now`, and returns new state
 * or a session plan. It performs no I/O and never reads the clock.
 */

/** §5.1 grading thresholds (configuration, reported in the report). */
export const GradingConfig = z.object({
  fastMs: z.number().positive(),
  slowMs: z.number().positive(),
});
export type GradingConfig = z.infer<typeof GradingConfig>;

export const DEFAULT_GRADING: GradingConfig = { fastMs: 4000, slowMs: 12000 };

/** §5.4 default BKT parameters (per-skill overridable). */
export const DEFAULT_BKT: BktParams = {
  pInit: 0.2,
  pTransit: 0.15,
  pSlip: 0.1,
  pGuess: 0.25,
};

/** Retention display bands (§5.3). */
export const RETENTION_STRONG = 0.8;
export const RETENTION_FADING = 0.5;

/** Mastery status thresholds (§5.4). */
export const MASTERY_WEAK_BELOW = 0.5;
export const MASTERY_MASTERED_AT = 0.95;

/** Default session size (§5.6). */
export const DEFAULT_SESSION_SIZE = 10;

/**
 * Per-concept memory state the engine needs (projection of §4.6 `memories`),
 * expressed with time as epoch-ms numbers so the engine stays clock-free and
 * easy to test. Services map Date <-> number at the boundary.
 */
export const MemoryState = z.object({
  conceptId: z.string(),
  repetitions: z.number().int().nonnegative(),
  easeFactor: z.number(),
  intervalDays: z.number().nonnegative(),
  /** epoch ms; null when never reviewed. */
  lastReviewedAt: z.number().nullable(),
  /** epoch ms; null when never scheduled. */
  dueAt: z.number().nullable(),
  totalReviews: z.number().int().nonnegative(),
  totalCorrect: z.number().int().nonnegative(),
});
export type MemoryState = z.infer<typeof MemoryState>;

/** Per-skill mastery state the engine needs (projection of §4.7). */
export const SkillState = z.object({
  skillId: z.string(),
  level: z.number().int(),
  prerequisites: z.array(z.string()),
  bkt: BktParams,
  /** null means no coverage record yet -> not_started. */
  pMastery: z.number().min(0).max(1).nullable(),
  status: SkillStatus,
  attempts: z.number().int().nonnegative(),
});
export type SkillState = z.infer<typeof SkillState>;

/**
 * Everything a strategy / stage computation needs about one learner at one
 * moment (decision #10). Built by a service from the §4 collections.
 */
export const LearnerSnapshot = z.object({
  userId: z.string(),
  totalAttempts: z.number().int().nonnegative(),
  memories: z.array(MemoryState),
  skills: z.array(SkillState),
  /** questions shown in the last 2 sessions (§5.6 rule 3). */
  recentlyShownQuestionIds: z.array(z.string()),
  /** per-concept last-shown epoch ms, for reinforcement ordering (§5.6). */
  lastShownByConcept: z.record(z.string(), z.number()).optional(),
});
export type LearnerSnapshot = z.infer<typeof LearnerSnapshot>;

/** One planned item in a session (§5.6.6). */
export const PlannedItem = z.object({
  questionId: z.string(),
  reason: SelectionReason,
});
export type PlannedItem = z.infer<typeof PlannedItem>;

/** The shared strategy interface (§5.7). */
export interface SelectionStrategy {
  name: StrategyName;
  buildSession(
    input: LearnerSnapshot,
    bank: Question[],
    now: Date,
    n: number,
    seed: number,
  ): PlannedItem[];
}

export { Stage };
