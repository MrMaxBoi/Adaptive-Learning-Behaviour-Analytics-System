import {
  DEFAULT_BKT,
  type LearnerSnapshot,
  type MemoryState,
  type Question,
  type SkillState,
  type SkillStatus,
} from '@fyp/shared';

export const DAY = 24 * 60 * 60 * 1000;

export function skill(
  skillId: string,
  opts: Partial<SkillState> = {},
): SkillState {
  return {
    skillId,
    level: opts.level ?? 1,
    prerequisites: opts.prerequisites ?? [],
    bkt: opts.bkt ?? DEFAULT_BKT,
    pMastery: opts.pMastery ?? null,
    status: opts.status ?? 'not_started',
    attempts: opts.attempts ?? 0,
  };
}

export function memory(
  conceptId: string,
  opts: Partial<MemoryState> = {},
): MemoryState {
  return {
    conceptId,
    repetitions: opts.repetitions ?? 1,
    easeFactor: opts.easeFactor ?? 2.5,
    intervalDays: opts.intervalDays ?? 1,
    lastReviewedAt: opts.lastReviewedAt ?? 0,
    dueAt: opts.dueAt ?? DAY,
    totalReviews: opts.totalReviews ?? 1,
    totalCorrect: opts.totalCorrect ?? 1,
  };
}

export function snapshot(opts: Partial<LearnerSnapshot> = {}): LearnerSnapshot {
  return {
    userId: opts.userId ?? 'u1',
    totalAttempts: opts.totalAttempts ?? 0,
    memories: opts.memories ?? [],
    skills: opts.skills ?? [],
    recentlyShownQuestionIds: opts.recentlyShownQuestionIds ?? [],
    lastShownByConcept: opts.lastShownByConcept,
  };
}

let qn = 0;
export function question(
  skillId: string,
  conceptId: string,
  opts: Partial<Question> = {},
): Question {
  qn += 1;
  return {
    _id: opts._id ?? `q${qn}`,
    skillId,
    conceptId,
    type: 'mcq',
    prompt: opts.prompt ?? 'p',
    options: opts.options ?? ['a', 'b', 'c', 'd'],
    answer: opts.answer ?? 'a',
    explanation: opts.explanation ?? 'e',
    difficulty: opts.difficulty ?? 1,
  };
}

export function statusFor(pL: number): SkillStatus {
  if (pL < 0.5) return 'weak';
  if (pL >= 0.95) return 'mastered';
  return 'developing';
}
