import { RETENTION_FADING, RETENTION_STRONG } from '@fyp/shared';
import { DAY_MS } from './scheduler.js';

export type RetentionBand = 'strong' | 'fading' | 'at_risk';

/**
 * §5.3 Retention estimate, half-life form (Settles & Meeder, 2016).
 *   h = max(intervalDays, 0.5)   half-life in days
 *   t = days since lastReviewedAt
 *   retention = 2 ^ (-t / h)
 * Always in [0, 1]. A concept never reviewed has retention 0.
 */
export function retention(
  intervalDays: number,
  lastReviewedAtMs: number | null,
  nowMs: number,
): number {
  if (lastReviewedAtMs === null) return 0;
  const h = Math.max(intervalDays, 0.5);
  const t = (nowMs - lastReviewedAtMs) / DAY_MS;
  const r = Math.pow(2, -t / h);
  // Clamp against tiny negative t (clock skew) and fp drift.
  if (r > 1) return 1;
  if (r < 0) return 0;
  return r;
}

/**
 * FR-23 projection: retention at t + d days for d = 1..days.
 * Returns [{ day, retention }], day counted from `nowMs`.
 */
export function projectRetention(
  intervalDays: number,
  lastReviewedAtMs: number | null,
  nowMs: number,
  days = 14,
): Array<{ day: number; retention: number }> {
  const out: Array<{ day: number; retention: number }> = [];
  for (let d = 1; d <= days; d++) {
    out.push({
      day: d,
      retention: retention(intervalDays, lastReviewedAtMs, nowMs + d * DAY_MS),
    });
  }
  return out;
}

/** Display bands (§5.3): >= 0.8 strong, 0.5-0.8 fading, < 0.5 at risk. */
export function retentionBand(r: number): RetentionBand {
  if (r >= RETENTION_STRONG) return 'strong';
  if (r >= RETENTION_FADING) return 'fading';
  return 'at_risk';
}
