import {
  type BktParams,
  MASTERY_MASTERED_AT,
  MASTERY_WEAK_BELOW,
  type SkillStatus,
} from '@fyp/shared';

/**
 * §5.4 Bayesian Knowledge Tracing (Corbett & Anderson, 1994). Pure.
 * Returns the post-transition mastery P(skill known) after observing one
 * answer (decision #4): condition on the observation, then apply learning.
 */
export function updateMastery(
  pL: number,
  correct: boolean,
  params: BktParams,
): number {
  const { pTransit, pSlip, pGuess } = params;

  const post = correct
    ? (pL * (1 - pSlip)) / (pL * (1 - pSlip) + (1 - pL) * pGuess)
    : (pL * pSlip) / (pL * pSlip + (1 - pL) * (1 - pGuess));

  return post + (1 - post) * pTransit;
}

/**
 * §5.4 status thresholds. `attempts === 0` => not_started regardless of pL,
 * so an untouched skill is never reported as weak.
 */
export function masteryStatus(pL: number, attempts: number): SkillStatus {
  if (attempts === 0) return 'not_started';
  if (pL < MASTERY_WEAK_BELOW) return 'weak';
  if (pL >= MASTERY_MASTERED_AT) return 'mastered';
  return 'developing';
}

/**
 * §5.4 availability: a skill is available when it has no prerequisites or all
 * of them are mastered. `statusOf` returns the status of a prerequisite skill
 * id (not_started if unknown).
 */
export function isSkillAvailable(
  prerequisites: readonly string[],
  statusOf: (skillId: string) => SkillStatus,
): boolean {
  return prerequisites.every((id) => statusOf(id) === 'mastered');
}
