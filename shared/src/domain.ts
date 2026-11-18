import { z } from 'zod';

/**
 * Domain schemas, derived strictly from SPEC.md §4 (the eight collections).
 * These are the canonical shapes shared by client and server. The engine
 * consumes a projection of these (see snapshot.ts).
 */

export const Role = z.enum(['learner', 'educator']);
export type Role = z.infer<typeof Role>;

export const SkillStatus = z.enum([
  'not_started',
  'weak',
  'developing',
  'mastered',
]);
export type SkillStatus = z.infer<typeof SkillStatus>;

export const SelectionReason = z.enum([
  'due_review',
  'weak_skill',
  'new_content',
  'reinforcement',
]);
export type SelectionReason = z.infer<typeof SelectionReason>;

export const StrategyName = z.enum(['adaptive', 'static']);
export type StrategyName = z.infer<typeof StrategyName>;

export const Stage = z.enum([
  'cold_start',
  'foundation_building',
  'core_practice',
  'adaptive_review',
  'advanced_expansion',
]);
export type Stage = z.infer<typeof Stage>;

/** §5.4 per-skill BKT parameters. */
export const BktParams = z.object({
  pInit: z.number().min(0).max(1),
  pTransit: z.number().min(0).max(1),
  pSlip: z.number().min(0).max(1),
  pGuess: z.number().min(0).max(1),
});
export type BktParams = z.infer<typeof BktParams>;

/** §4.2 `skills`. */
export const Skill = z.object({
  _id: z.string(),
  name: z.string(),
  topic: z.string(),
  level: z.number().int(),
  prerequisites: z.array(z.string()),
  bkt: BktParams,
});
export type Skill = z.infer<typeof Skill>;

/** §4.3 `questions`. */
export const Question = z.object({
  _id: z.string(),
  skillId: z.string(),
  conceptId: z.string(),
  type: z.literal('mcq'),
  prompt: z.string(),
  options: z.array(z.string()).length(4),
  answer: z.string(),
  explanation: z.string(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
export type Question = z.infer<typeof Question>;

/** §4.6 `memories` (Table 8). */
export const Memory = z.object({
  userId: z.string(),
  conceptId: z.string(),
  repetitions: z.number().int().nonnegative(),
  easeFactor: z.number(),
  intervalDays: z.number().nonnegative(),
  lastReviewedAt: z.coerce.date().nullable(),
  dueAt: z.coerce.date().nullable(),
  totalReviews: z.number().int().nonnegative(),
  totalCorrect: z.number().int().nonnegative(),
});
export type Memory = z.infer<typeof Memory>;

/** §4.7 `knowledgecoverage`. */
export const KnowledgeCoverage = z.object({
  userId: z.string(),
  skillId: z.string(),
  pMastery: z.number().min(0).max(1),
  status: SkillStatus,
  attempts: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  firstSeenAt: z.coerce.date().nullable(),
  masteredAt: z.coerce.date().nullable(),
  history: z.array(
    z.object({ at: z.coerce.date(), pMastery: z.number().min(0).max(1) }),
  ),
});
export type KnowledgeCoverage = z.infer<typeof KnowledgeCoverage>;

/** §4.5 `attempts` (subset used by the engine for grading). */
export const Attempt = z.object({
  userId: z.string(),
  sessionId: z.string(),
  questionId: z.string(),
  skillId: z.string(),
  conceptId: z.string(),
  selected: z.string(),
  correct: z.boolean(),
  responseTimeMs: z.number().nonnegative(),
  quality: z.number().int().min(0).max(5),
  reason: SelectionReason,
  answeredAt: z.coerce.date(),
});
export type Attempt = z.infer<typeof Attempt>;
