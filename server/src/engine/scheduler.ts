import type { MemoryState } from '@fyp/shared';

const DAY_MS = 24 * 60 * 60 * 1000;
const INITIAL_EASE = 2.5;
const MIN_EASE = 1.3;

/** A fresh concept the learner has never reviewed (§5.2). */
export function newMemory(conceptId: string): MemoryState {
  return {
    conceptId,
    repetitions: 0,
    easeFactor: INITIAL_EASE,
    intervalDays: 0,
    lastReviewedAt: null,
    dueAt: null,
    totalReviews: 0,
    totalCorrect: 0,
  };
}

/**
 * §5.2 SM-2 (Wozniak, 1990). Pure: returns a new MemoryState, does not mutate.
 * `quality` is the §5.1 grade; `correct` updates the running totals.
 * `nowMs` is epoch ms, passed in so the engine never reads the clock.
 */
export function updateMemory(
  memory: MemoryState,
  quality: number,
  correct: boolean,
  nowMs: number,
): MemoryState {
  let { repetitions, intervalDays, easeFactor } = memory;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    repetitions += 1;
  }

  // EF update applies on every answer (§5.2).
  easeFactor = Math.max(
    MIN_EASE,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  return {
    conceptId: memory.conceptId,
    repetitions,
    intervalDays,
    easeFactor,
    lastReviewedAt: nowMs,
    dueAt: nowMs + intervalDays * DAY_MS,
    totalReviews: memory.totalReviews + 1,
    totalCorrect: memory.totalCorrect + (correct ? 1 : 0),
  };
}

export { DAY_MS };
