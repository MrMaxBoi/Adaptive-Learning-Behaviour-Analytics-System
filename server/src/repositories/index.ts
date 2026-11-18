import type {
  LearnerSnapshot,
  MemoryState,
  Question,
  SkillState,
  SkillStatus,
} from '@fyp/shared';
import { masteryStatus } from '../engine/index.js';
import {
  AttemptModel,
  CoverageModel,
  ExposureModel,
  MemoryModel,
  QuestionModel,
  SessionModel,
  SkillModel,
  UserModel,
} from '../db/models/index.js';

/**
 * Data-access layer: the only code (besides seed) that touches Mongoose.
 * Services call these, never the models directly, and the engine never touches
 * the DB at all (NFR-08). The key method is `buildSnapshot`, which projects the
 * stored §4 records into the pure `LearnerSnapshot` the engine consumes (§5).
 */

export const users = {
  findByClerkId: (clerkUserId: string) => UserModel.findOne({ clerkUserId }).lean(),
  findById: (id: string) => UserModel.findById(id).lean(),
  create: (doc: Record<string, unknown>) => UserModel.create(doc),
  updateProfile: (id: string, patch: Record<string, unknown>) =>
    UserModel.findByIdAndUpdate(id, patch, { new: true }).lean(),
};

export const skills = {
  all: () => SkillModel.find().lean(),
  byId: (id: string) => SkillModel.findById(id).lean(),
};

export const questions = {
  all: () => QuestionModel.find().lean(),
  byId: (id: string) => QuestionModel.findById(id).lean(),
  byIds: (ids: string[]) => QuestionModel.find({ _id: { $in: ids } }).lean(),
};

export const sessions = {
  create: (doc: Record<string, unknown>) => SessionModel.create(doc),
  byId: (id: string) => SessionModel.findById(id).lean(),
  listForUser: (userId: string, limit = 50) =>
    SessionModel.find({ userId }).sort({ startedAt: -1 }).limit(limit).lean(),
  finish: (id: string, summary: unknown, endedAt: Date) =>
    SessionModel.findByIdAndUpdate(id, { summary, endedAt }, { new: true }).lean(),
};

export const attempts = {
  create: (doc: Record<string, unknown>) => AttemptModel.create(doc),
  countForUser: (userId: string) => AttemptModel.countDocuments({ userId }),
  listForUser: (userId: string) => AttemptModel.find({ userId }).sort({ answeredAt: 1 }).lean(),
};

export const memories = {
  forUser: (userId: string) => MemoryModel.find({ userId }).lean(),
  byConcept: (userId: string, conceptId: string) =>
    MemoryModel.findOne({ userId, conceptId }).lean(),
  upsert: (userId: string, conceptId: string, state: Partial<MemoryState>) =>
    MemoryModel.findOneAndUpdate(
      { userId, conceptId },
      { $set: toMemoryDoc(userId, conceptId, state) },
      { new: true, upsert: true },
    ).lean(),
};

export const coverage = {
  forUser: (userId: string) => CoverageModel.find({ userId }).lean(),
  bySkill: (userId: string, skillId: string) =>
    CoverageModel.findOne({ userId, skillId }).lean(),
  upsert: (userId: string, skillId: string, patch: Record<string, unknown>) =>
    CoverageModel.findOneAndUpdate(
      { userId, skillId },
      { $set: { userId, skillId, ...patch } },
      { new: true, upsert: true },
    ).lean(),
};

export const exposures = {
  forUser: (userId: string) => ExposureModel.find({ userId }).lean(),
  recordShown: (userId: string, questionId: string, at: Date) =>
    ExposureModel.findOneAndUpdate(
      { userId, questionId },
      { $inc: { timesShown: 1 }, $set: { lastShownAt: at } },
      { new: true, upsert: true },
    ).lean(),
};

/** Date <-> epoch-ms mapping at the DB boundary (engine uses numbers). */
function toMemoryDoc(
  userId: string,
  conceptId: string,
  state: Partial<MemoryState>,
): Record<string, unknown> {
  const doc: Record<string, unknown> = { userId, conceptId };
  if (state.repetitions !== undefined) doc.repetitions = state.repetitions;
  if (state.easeFactor !== undefined) doc.easeFactor = state.easeFactor;
  if (state.intervalDays !== undefined) doc.intervalDays = state.intervalDays;
  if (state.totalReviews !== undefined) doc.totalReviews = state.totalReviews;
  if (state.totalCorrect !== undefined) doc.totalCorrect = state.totalCorrect;
  if (state.lastReviewedAt !== undefined)
    doc.lastReviewedAt = state.lastReviewedAt === null ? null : new Date(state.lastReviewedAt);
  if (state.dueAt !== undefined)
    doc.dueAt = state.dueAt === null ? null : new Date(state.dueAt);
  return doc;
}

/**
 * Assemble the pure `LearnerSnapshot` (§5) from stored records. This is the
 * bridge between persistence and the clock-free engine: every Date becomes
 * epoch ms, and skill status is recomputed from the stored pMastery so the
 * snapshot is internally consistent.
 */
export async function buildSnapshot(userId: string): Promise<LearnerSnapshot> {
  const [skillDocs, memDocs, covDocs, totalAttempts, recentSessions, expDocs] =
    await Promise.all([
      skills.all(),
      memories.forUser(userId),
      coverage.forUser(userId),
      attempts.countForUser(userId),
      sessions.listForUser(userId, 2),
      exposures.forUser(userId),
    ]);

  const covBySkill = new Map(covDocs.map((c) => [c.skillId, c]));

  const skillStates: SkillState[] = skillDocs.map((s) => {
    const cov = covBySkill.get(s._id);
    const attemptsN = cov?.attempts ?? 0;
    const pMastery = cov ? cov.pMastery : null;
    const status: SkillStatus =
      cov && attemptsN > 0 ? masteryStatus(cov.pMastery, attemptsN) : 'not_started';
    return {
      skillId: s._id,
      level: s.level,
      prerequisites: s.prerequisites ?? [],
      bkt: s.bkt,
      pMastery,
      status,
      attempts: attemptsN,
    };
  });

  const memoryStates: MemoryState[] = memDocs.map((m) => ({
    conceptId: m.conceptId,
    repetitions: m.repetitions,
    easeFactor: m.easeFactor,
    intervalDays: m.intervalDays,
    lastReviewedAt: m.lastReviewedAt ? m.lastReviewedAt.getTime() : null,
    dueAt: m.dueAt ? m.dueAt.getTime() : null,
    totalReviews: m.totalReviews,
    totalCorrect: m.totalCorrect,
  }));

  const recentlyShownQuestionIds = recentSessions.flatMap((s) =>
    (s.plan ?? []).map((p) => p.questionId),
  );

  const lastShownByConcept: Record<string, number> = {};
  for (const e of expDocs) {
    // conceptId isn't on exposure; map via question is done in the service.
    lastShownByConcept[e.questionId] = e.lastShownAt.getTime();
  }

  return {
    userId,
    totalAttempts,
    memories: memoryStates,
    skills: skillStates,
    recentlyShownQuestionIds,
    lastShownByConcept,
  };
}

export function questionToPublic(q: Question, reason: string) {
  return {
    _id: q._id,
    skillId: q.skillId,
    conceptId: q.conceptId,
    type: q.type,
    prompt: q.prompt,
    options: q.options,
    difficulty: q.difficulty,
    reason,
  };
}
