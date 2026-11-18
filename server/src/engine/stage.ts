import {
  DEFAULT_SESSION_SIZE,
  type LearnerSnapshot,
  type Stage,
} from '@fyp/shared';
import { availableSkillIds, dueConceptIds, skillById } from './snapshot-util.js';

/**
 * §5.5 Learning stage (IR Table 7). Evaluated at session start, in order; the
 * first rule that matches wins. `n` is the session size (decision #5), used for
 * the Adaptive Review threshold (due >= 40% of session size).
 */
export function determineStage(
  snapshot: LearnerSnapshot,
  nowMs: number,
  n: number = DEFAULT_SESSION_SIZE,
): Stage {
  // 1. Cold Start: fewer than 10 attempts in total.
  if (snapshot.totalAttempts < 10) return 'cold_start';

  // 2. Adaptive Review: due concepts >= 40% of session size.
  const dueCount = dueConceptIds(snapshot, nowMs).length;
  if (dueCount >= 0.4 * n) return 'adaptive_review';

  const available = availableSkillIds(snapshot);
  const byId = skillById(snapshot);
  const availableStates = [...available].map((id) => byId.get(id)!);

  // 3. Core Practice: at least one available skill is weak.
  if (availableStates.some((s) => s.status === 'weak')) return 'core_practice';

  // 4. Advanced Expansion: every available skill is mastered.
  // Requires at least one available skill, else "every" is vacuously true.
  if (
    availableStates.length > 0 &&
    availableStates.every((s) => s.status === 'mastered')
  ) {
    return 'advanced_expansion';
  }

  // 5. Foundation Building: otherwise.
  return 'foundation_building';
}
