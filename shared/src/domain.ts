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

/**
 * §4.1 `users`.
 *
 * DEVIATION FROM SPEC §9 / NFR-04: identity is delegated to Clerk (Google
 * login) rather than email/password + bcrypt. The spec's `passwordHash` field
 * is therefore absent and replaced by `clerkUserId` (the external subject id).
 * NFR-05 (a learner reads only their own data; educator role gating) still
 * holds and is enforced server-side from the verified Clerk subject + role.
 */
export const User = z.object({
  _id: z.string(),
  clerkUserId: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  role: Role,
  classCode: z.string().nullable(),
  dailyGoal: z.number().int().positive().nullable(),
  createdAt: z.coerce.date(),
});
export type User = z.infer<typeof User>;

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

/** §4.4 `sessions`. */
export const SessionPlanItem = z.object({
  questionId: z.string(),
  reason: SelectionReason,
});
export type SessionPlanItem = z.infer<typeof SessionPlanItem>;

export const SessionSummary = z.object({
  answered: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  avgResponseMs: z.number().nonnegative(),
});
export type SessionSummary = z.infer<typeof SessionSummary>;

export const PracticeSession = z.object({
  _id: z.string(),
  userId: z.string(),
  strategy: StrategyName,
  stage: Stage,
  plan: z.array(SessionPlanItem),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().nullable(),
  summary: SessionSummary,
});
export type PracticeSession = z.infer<typeof PracticeSession>;

/** §4.8 `questionexposures`. */
export const QuestionExposure = z.object({
  userId: z.string(),
  questionId: z.string(),
  timesShown: z.number().int().nonnegative(),
  lastShownAt: z.coerce.date(),
});
export type QuestionExposure = z.infer<typeof QuestionExposure>;
