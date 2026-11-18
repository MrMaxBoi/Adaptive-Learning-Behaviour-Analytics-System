import type {
  CreateSessionResponse,
  FinishSessionResponse,
  Question,
  StrategyName,
  SubmitAnswerResponse,
} from '@fyp/shared';
import { DEFAULT_BKT } from '@fyp/shared';
import {
  adaptiveStrategy,
  determineStage,
  gradeAnswer,
  masteryStatus,
  newMemory,
  staticStrategy,
  updateMastery,
  updateMemory,
} from '../engine/index.js';
import type { Env } from '../config.js';
import {
  attempts as attemptsRepo,
  buildSnapshot,
  coverage as coverageRepo,
  exposures as exposuresRepo,
  memories as memoriesRepo,
  questions as questionsRepo,
  questionToPublic,
  sessions as sessionsRepo,
  skills as skillsRepo,
} from '../repositories/index.js';

/**
 * Application service for the practice flow (§3.4). It loads state through the
 * repositories, calls the pure engine, and persists results. The engine does
 * no I/O; this layer owns every Date <-> number and DB round-trip.
 */

export class NotFoundError extends Error {
  code = 'not_found';
}
export class ForbiddenError extends Error {
  code = 'forbidden';
}

/**
 * POST /practice/sessions (FR-40..43). Build and persist a planned session.
 * `seed` defaults to the current time so plans vary; pass a fixed seed for
 * reproducible tests (NFR-09).
 */
export async function createSession(
  userId: string,
  strategy: StrategyName,
  env: Env,
  now: Date = new Date(),
  seed: number = now.getTime() & 0xffffffff,
): Promise<CreateSessionResponse> {
  const [snapshot, bankDocs] = await Promise.all([
    buildSnapshot(userId),
    questionsRepo.all(),
  ]);
  const bank = bankDocs as unknown as Question[];

  const strat = strategy === 'static' ? staticStrategy : adaptiveStrategy;
  const plan = strat.buildSession(snapshot, bank, now, env.SESSION_SIZE, seed);

  // Stage is recorded on the session (§4.4). The adaptive strategy computes it
  // internally; recompute it here for the stored record (cheap, pure).
  const stage = determineStage(snapshot, now.getTime(), env.SESSION_SIZE);

  const session = await sessionsRepo.create({
    userId,
    strategy,
    stage,
    plan,
    startedAt: now,
    endedAt: null,
    summary: { answered: 0, correct: 0, avgResponseMs: 0 },
  });

  // Record exposure for every planned question (FR-13).
  await Promise.all(
    plan.map((p) => exposuresRepo.recordShown(userId, p.questionId, now)),
  );

  const byId = new Map(bank.map((q) => [q._id, q]));
  const questions = plan
    .map((p) => {
      const q = byId.get(p.questionId);
      return q ? questionToPublic(q, p.reason) : null;
    })
    .filter((q): q is NonNullable<typeof q> => q !== null);

  return {
    sessionId: String(session._id),
    strategy,
    questions: questions as CreateSessionResponse['questions'],
  };
}

/**
 * POST /practice/sessions/:id/answers (FR-10..30). The one-answer flow of
 * §3.4: validate, grade, write an Attempt, update Memory (SM-2) and skill
 * mastery (BKT), persist both, return correctness + explanation.
 */
export async function submitAnswer(
  userId: string,
  sessionId: string,
  questionId: string,
  selectedOption: string,
  responseTimeMs: number,
  env: Env,
  now: Date = new Date(),
): Promise<SubmitAnswerResponse> {
  const [q, session] = await Promise.all([
    questionsRepo.byId(questionId),
    sessionsRepo.byId(sessionId),
  ]);
  if (!session) throw new NotFoundError('session not found');
  if (String(session.userId) !== userId) throw new ForbiddenError('not your session');
  if (!q) throw new NotFoundError('question not found');

  const correct = selectedOption === q.answer;
  const grading = { fastMs: env.GRADING_FAST_MS, slowMs: env.GRADING_SLOW_MS };
  const quality = gradeAnswer(correct, responseTimeMs, grading);

  // --- Memory (SM-2, §5.2) ---
  const existing = await memoriesRepo.byConcept(userId, q.conceptId);
  const prior = existing
    ? {
        conceptId: q.conceptId,
        repetitions: existing.repetitions,
        easeFactor: existing.easeFactor,
        intervalDays: existing.intervalDays,
        lastReviewedAt: existing.lastReviewedAt ? existing.lastReviewedAt.getTime() : null,
        dueAt: existing.dueAt ? existing.dueAt.getTime() : null,
        totalReviews: existing.totalReviews,
        totalCorrect: existing.totalCorrect,
      }
    : newMemory(q.conceptId);
  const nextMemory = updateMemory(prior, quality, correct, now.getTime());
  await memoriesRepo.upsert(userId, q.conceptId, nextMemory);

  // --- Mastery (BKT, §5.4) ---
  const skill = await skillsRepo.byId(q.skillId);
  const bkt = skill?.bkt ?? DEFAULT_BKT;
  const cov = await coverageRepo.bySkill(userId, q.skillId);
  const priorPL = cov ? cov.pMastery : bkt.pInit;
  const nextPL = updateMastery(priorPL, correct, bkt);
  const attemptsN = (cov?.attempts ?? 0) + 1;
  const correctN = (cov?.correct ?? 0) + (correct ? 1 : 0);
  const status = masteryStatus(nextPL, attemptsN);
  const history = [...(cov?.history ?? []), { at: now, pMastery: nextPL }].slice(-100);
  await coverageRepo.upsert(userId, q.skillId, {
    pMastery: nextPL,
    status,
    attempts: attemptsN,
    correct: correctN,
    firstSeenAt: cov?.firstSeenAt ?? now,
    masteredAt:
      status === 'mastered' && !cov?.masteredAt ? now : (cov?.masteredAt ?? null),
    history,
  });

  // --- Attempt (FR-10): reason comes from this session's stored plan ---
  const planItem = (session.plan ?? []).find((p) => p.questionId === questionId);
  await attemptsRepo.create({
    userId,
    sessionId,
    questionId,
    skillId: q.skillId,
    conceptId: q.conceptId,
    selected: selectedOption,
    correct,
    responseTimeMs,
    quality,
    reason: planItem?.reason ?? 'new_content',
    answeredAt: now,
  });

  return { correct, correctAnswer: q.answer, explanation: q.explanation };
}

/** POST /practice/sessions/:id/finish (FR-12). Compute and store the summary. */
export async function finishSession(
  userId: string,
  sessionId: string,
  now: Date = new Date(),
): Promise<FinishSessionResponse> {
  const session = await sessionsRepo.byId(sessionId);
  if (!session) throw new NotFoundError('session not found');
  if (String(session.userId) !== userId) throw new ForbiddenError('not your session');

  const all = await attemptsRepo.listForUser(userId);
  const forSession = all.filter((a) => String(a.sessionId) === sessionId);
  const answered = forSession.length;
  const correct = forSession.filter((a) => a.correct).length;
  const avgResponseMs =
    answered === 0
      ? 0
      : Math.round(
          forSession.reduce((s, a) => s + a.responseTimeMs, 0) / answered,
        );

  const summary = { answered, correct, avgResponseMs };
  await sessionsRepo.finish(sessionId, summary, now);
  return summary;
}
