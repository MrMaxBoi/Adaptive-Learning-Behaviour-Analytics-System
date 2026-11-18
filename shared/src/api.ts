import { z } from 'zod';
import { Role, SelectionReason, StrategyName } from './domain.js';

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
