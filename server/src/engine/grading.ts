import { DEFAULT_GRADING, type GradingConfig } from '@fyp/shared';

/**
 * §5.1 Answer grading -> SM-2 quality (0-5).
 *
 * | incorrect                                   | 1 |
 * | correct, responseTime > slowMs              | 3 |
 * | correct, fastMs < responseTime <= slowMs    | 4 |
 * | correct, responseTime <= fastMs             | 5 |
 */
export function gradeAnswer(
  correct: boolean,
  responseTimeMs: number,
  config: GradingConfig = DEFAULT_GRADING,
): 0 | 1 | 2 | 3 | 4 | 5 {
  if (!correct) return 1;
  const { fastMs, slowMs } = config;
  if (responseTimeMs > slowMs) return 3;
  if (responseTimeMs > fastMs) return 4;
  return 5;
}
