import { z } from 'zod';
import { Role, SelectionReason, SkillStatus, StrategyName } from './domain.js';

/**
 * API request/response contracts, derived from SPEC.md §9. Shared so the
 * client and server validate identical shapes. The uniform error envelope is
 * `{ error: { code, message } }` (§9).
 */

export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

/** GET /me and profile update (FR-03). */
export const MeResponse = z.object({
  _id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  role: Role,
  classCode: z.string().nullable(),
  dailyGoal: z.number().int().positive().nullable(),
});
export type MeResponse = z.infer<typeof MeResponse>;

export const UpdateProfileRequest = z.object({
  displayName: z.string().min(1).max(80).optional(),
  dailyGoal: z.number().int().positive().max(500).optional(),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequest>;

/** POST /practice/sessions (FR-40..43). */
export const CreateSessionRequest = z.object({
  strategy: StrategyName.optional(), // defaults to 'adaptive'
});
export type CreateSessionRequest = z.infer<typeof CreateSessionRequest>;

/** A question as delivered to the client: no answer/explanation leaked up front. */
export const PublicQuestion = z.object({
  _id: z.string(),
  skillId: z.string(),
  conceptId: z.string(),
  type: z.literal('mcq'),
  prompt: z.string(),
  options: z.array(z.string()).length(4),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  reason: SelectionReason,
});
export type PublicQuestion = z.infer<typeof PublicQuestion>;

export const CreateSessionResponse = z.object({
  sessionId: z.string(),
  strategy: StrategyName,
  questions: z.array(PublicQuestion),
});
export type CreateSessionResponse = z.infer<typeof CreateSessionResponse>;

/** POST /practice/sessions/:id/answers (FR-10..30). */
export const SubmitAnswerRequest = z.object({
  questionId: z.string(),
  selectedOption: z.string(),
  responseTimeMs: z.number().nonnegative(),
});
export type SubmitAnswerRequest = z.infer<typeof SubmitAnswerRequest>;

export const SubmitAnswerResponse = z.object({
  correct: z.boolean(),
  correctAnswer: z.string(),
  explanation: z.string(),
});
export type SubmitAnswerResponse = z.infer<typeof SubmitAnswerResponse>;

/** POST /practice/sessions/:id/finish (FR-12). */
export const FinishSessionResponse = z.object({
  answered: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  avgResponseMs: z.number().nonnegative(),
});
export type FinishSessionResponse = z.infer<typeof FinishSessionResponse>;

/* ------------------------------------------------------------------ *
 * Dashboard contracts (SPEC.md §7, FR-50..52).
 *
 * Every metric carries a chart-ready `data` payload AND a plain-language
 * `sentence` (FR-51, NFR-07): learner-facing text never exposes raw
 * probabilities, ease factors, or stage names. The server's insight service
 * produces the sentences; the client only renders them.
 * ------------------------------------------------------------------ */

/** A single point on a time series (ISO date + value). */
export const SeriesPoint = z.object({
  date: z.string(), // YYYY-MM-DD
  value: z.number(),
});
export type SeriesPoint = z.infer<typeof SeriesPoint>;

/** Topic-mastery bar: one per skill, coloured by status (FR-50). */
export const MasteryBar = z.object({
  skillId: z.string(),
  skillName: z.string(),
  status: SkillStatus,
  /** 0..100 for the bar height; derived from pMastery server-side. */
  percent: z.number().min(0).max(100),
});
export type MasteryBar = z.infer<typeof MasteryBar>;

/** Weak concept row, lowest retention first (FR-50). */
export const WeakConcept = z.object({
  conceptId: z.string(),
  label: z.string(),
  band: z.enum(['strong', 'fading', 'at_risk']),
});
export type WeakConcept = z.infer<typeof WeakConcept>;

/** A dashboard metric: a chart payload plus its plain-language sentence. */
export const Metric = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ sentence: z.string(), data });

/** GET /dashboard/summary — the 7 proposal metrics (FR-50, FR-51). */
export const DashboardSummaryResponse = z.object({
  overallAccuracy: Metric(
    z.object({ percent: z.number().min(0).max(100), trend: z.array(SeriesPoint) }),
  ),
  topicMastery: Metric(z.array(MasteryBar)),
  retentionTrend: Metric(z.array(SeriesPoint)),
  weakConcepts: Metric(z.array(WeakConcept)),
  responseTime: Metric(z.array(SeriesPoint)),
  revisionProgress: Metric(
    z.object({
      dueToday: z.number().int().nonnegative(),
      doneToday: z.number().int().nonnegative(),
      overdue: z.number().int().nonnegative(),
    }),
  ),
  learningHistory: Metric(
    z.array(
      z.object({
        sessionId: z.string(),
        startedAt: z.string(),
        strategy: StrategyName,
        answered: z.number().int().nonnegative(),
        accuracy: z.number().min(0).max(100),
      }),
    ),
  ),
});
export type DashboardSummaryResponse = z.infer<typeof DashboardSummaryResponse>;

/** GET /dashboard/next-up — "what to review next" with reasons (FR-52). */
export const NextUpItem = z.object({
  conceptId: z.string(),
  label: z.string(),
  reason: SelectionReason,
  /** Plain-language reason shown to the learner (NFR-07). */
  reasonText: z.string(),
});
export type NextUpItem = z.infer<typeof NextUpItem>;

export const NextUpResponse = z.object({
  sentence: z.string(),
  items: z.array(NextUpItem),
});
export type NextUpResponse = z.infer<typeof NextUpResponse>;
