import {
  DEFAULT_SESSION_SIZE,
  type LearnerSnapshot,
  type PlannedItem,
  type Question,
  type SelectionStrategy,
} from '@fyp/shared';
import { skillById } from '../snapshot-util.js';

/**
 * §5.7 Static (baseline) strategy. Models a conventional fixed-sequence course.
 * - Questions ordered once by skill level, then question id.
 * - Each session takes the next N in that order; wraps at the end.
 * - No review scheduling, mastery gating or prerequisite checks.
 * - Reason is always `new_content` (there is no adaptive reason to record).
 *
 * The position in the fixed order is derived from how many attempts the learner
 * has made (totalAttempts), so successive sessions advance deterministically
 * without the engine holding state.
 */
export function buildStaticSession(
  snapshot: LearnerSnapshot,
  bank: Question[],
  _now: Date,
  n: number = DEFAULT_SESSION_SIZE,
  _seed = 1,
): PlannedItem[] {
  if (bank.length === 0) return [];

  const skills = skillById(snapshot);
  const ordered = bank.slice().sort((a, b) => {
    const la = skills.get(a.skillId)?.level ?? 0;
    const lb = skills.get(b.skillId)?.level ?? 0;
    if (la !== lb) return la - lb;
    return a._id < b._id ? -1 : a._id > b._id ? 1 : 0;
  });

  const start = snapshot.totalAttempts % ordered.length;
  const items: PlannedItem[] = [];
  for (let i = 0; i < Math.min(n, ordered.length); i++) {
    const q = ordered[(start + i) % ordered.length]!;
    items.push({ questionId: q._id, reason: 'new_content' });
  }
  return items;
}

export const staticStrategy: SelectionStrategy = {
  name: 'static',
  buildSession: buildStaticSession,
};
