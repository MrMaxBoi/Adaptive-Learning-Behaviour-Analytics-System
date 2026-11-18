import type {
  LearnerSnapshot,
  Question,
  SelectionReason,
  Stage,
} from '@fyp/shared';
import { retention } from '../retention.js';
import {
  availableSkillIds,
  memoryByConcept,
  skillById,
} from '../snapshot-util.js';

export type PoolName = 'review' | 'weak' | 'new' | 'reinforcement';

/** Order used when a pool runs short (§5.6 step 2). */
export const FILL_ORDER: PoolName[] = ['review', 'weak', 'reinforcement', 'new'];

export const REASON_BY_POOL: Record<PoolName, SelectionReason> = {
  review: 'due_review',
  weak: 'weak_skill',
  new: 'new_content',
  reinforcement: 'reinforcement',
};

/** §5.6 pool proportions by stage. */
export const POOL_SHARES: Record<Stage, Record<PoolName, number>> = {
  cold_start: { review: 0, weak: 0, new: 1.0, reinforcement: 0 },
  foundation_building: { review: 0.2, weak: 0.1, new: 0.4, reinforcement: 0.3 },
  core_practice: { review: 0.2, weak: 0.5, new: 0.1, reinforcement: 0.2 },
  adaptive_review: { review: 0.6, weak: 0.2, new: 0, reinforcement: 0.2 },
  advanced_expansion: { review: 0.3, weak: 0, new: 0.5, reinforcement: 0.2 },
};

/**
 * Build the four candidate pools as ordered lists of questions (§5.6).
 * Ordering within each pool is fixed and deterministic; the final shuffle
 * (§5.6 step 5) happens later, after selection.
 */
export function buildPools(
  snapshot: LearnerSnapshot,
  bank: Question[],
  nowMs: number,
  stage: Stage,
): Record<PoolName, Question[]> {
  const memByConcept = memoryByConcept(snapshot);
  const skills = skillById(snapshot);
  const available = availableSkillIds(snapshot);
  const lastShown = snapshot.lastShownByConcept ?? {};

  const bySkill = (q: Question) => skills.get(q.skillId);
  const isAvailable = (q: Question) => available.has(q.skillId);

  // review: concepts with dueAt <= now, lowest retention first.
  const dueConcepts = snapshot.memories
    .filter((m) => m.dueAt !== null && m.dueAt <= nowMs)
    .map((m) => ({
      conceptId: m.conceptId,
      r: retention(m.intervalDays, m.lastReviewedAt, nowMs),
    }))
    .sort((a, b) => a.r - b.r);
  const dueOrder = new Map(dueConcepts.map((c, i) => [c.conceptId, i]));
  const review = bank
    .filter((q) => dueOrder.has(q.conceptId))
    .sort(
      (a, b) => dueOrder.get(a.conceptId)! - dueOrder.get(b.conceptId)!,
    );

  // weak: questions from weak skills, lowest pMastery first.
  const weak = bank
    .filter((q) => bySkill(q)?.status === 'weak')
    .sort(
      (a, b) =>
        (bySkill(a)?.pMastery ?? 1) - (bySkill(b)?.pMastery ?? 1),
    );

  // new: concepts never seen, from available skills, ordered by skill level.
  const newQ = bank
    .filter(
      (q) =>
        isAvailable(q) &&
        !memByConcept.has(q.conceptId) &&
        bySkill(q)?.status !== undefined,
    )
    .sort((a, b) => (bySkill(a)?.level ?? 0) - (bySkill(b)?.level ?? 0));

  // reinforcement: questions from developing skills, least recently shown.
  const reinforcement = bank
    .filter((q) => bySkill(q)?.status === 'developing')
    .sort(
      (a, b) =>
        (lastShown[a.conceptId] ?? 0) - (lastShown[b.conceptId] ?? 0),
    );

  return { review, weak, new: newQ, reinforcement };
}
