import {
  DEFAULT_SESSION_SIZE,
  type LearnerSnapshot,
  type PlannedItem,
  type Question,
  type SelectionStrategy,
} from '@fyp/shared';
import { seededShuffle } from '../rng.js';
import { determineStage } from '../stage.js';
import {
  buildPools,
  FILL_ORDER,
  POOL_SHARES,
  REASON_BY_POOL,
  type PoolName,
} from './pools.js';

const MAX_PER_CONCEPT = 3; // §5.6 rule 4

/**
 * Compute per-pool quotas from shares (§5.6 step 1) with the decision-#7
 * leftover policy: round(N * share) per pool, then if the total != N adjust
 * the largest-share pool so the quotas sum to N before fill-forward.
 */
export function poolQuotas(
  shares: Record<PoolName, number>,
  n: number,
): Record<PoolName, number> {
  const quotas: Record<PoolName, number> = {
    review: Math.round(n * shares.review),
    weak: Math.round(n * shares.weak),
    new: Math.round(n * shares.new),
    reinforcement: Math.round(n * shares.reinforcement),
  };
  const total =
    quotas.review + quotas.weak + quotas.new + quotas.reinforcement;
  const diff = n - total;
  if (diff !== 0) {
    // Adjust the pool with the largest share (ties: FILL_ORDER precedence).
    let target: PoolName = 'review';
    let best = -Infinity;
    for (const p of FILL_ORDER) {
      if (shares[p] > best) {
        best = shares[p];
        target = p;
      }
    }
    quotas[target] = Math.max(0, quotas[target] + diff);
  }
  return quotas;
}

/**
 * §5.6 Adaptive strategy. Pure.
 * Steps: stage -> pools -> quotas -> take per pool (with exposure filter and
 * per-concept cap) -> fill short pools forward -> seeded shuffle -> reasons.
 */
export function buildAdaptiveSession(
  snapshot: LearnerSnapshot,
  bank: Question[],
  now: Date,
  n: number = DEFAULT_SESSION_SIZE,
  seed = 1,
): PlannedItem[] {
  const nowMs = now.getTime();
  const stage = determineStage(snapshot, nowMs, n);
  const shares = POOL_SHARES[stage];
  const pools = buildPools(snapshot, bank, nowMs, stage);
  const quotas = poolQuotas(shares, n);

  const recent = new Set(snapshot.recentlyShownQuestionIds);
  const chosenIds = new Set<string>();
  const conceptCount = new Map<string, number>();
  const selected: Array<{ q: Question; pool: PoolName }> = [];

  const canTake = (q: Question): boolean => {
    if (chosenIds.has(q._id)) return false;
    if ((conceptCount.get(q.conceptId) ?? 0) >= MAX_PER_CONCEPT) return false;
    return true;
  };

  // Phase A: take up to each pool's quota, honouring the exposure filter
  // (§5.6 rule 3) and the per-concept cap (rule 4).
  const takeFromPool = (
    pool: PoolName,
    limit: number,
    allowRecent: boolean,
  ): number => {
    let taken = 0;
    for (const q of pools[pool]) {
      if (taken >= limit) break;
      if (!canTake(q)) continue;
      if (!allowRecent && recent.has(q._id)) continue;
      selected.push({ q, pool });
      chosenIds.add(q._id);
      conceptCount.set(q.conceptId, (conceptCount.get(q.conceptId) ?? 0) + 1);
      taken++;
    }
    return taken;
  };

  const shortfall: Record<PoolName, number> = {
    review: 0,
    weak: 0,
    new: 0,
    reinforcement: 0,
  };
  for (const pool of FILL_ORDER) {
    const got = takeFromPool(pool, quotas[pool], false);
    shortfall[pool] = quotas[pool] - got;
  }

  // Phase B: fill remaining slots forward (§5.6 step 2) in FILL_ORDER, still
  // excluding recently-shown questions.
  let remaining = n - selected.length;
  if (remaining > 0) {
    for (const pool of FILL_ORDER) {
      if (remaining <= 0) break;
      remaining -= takeFromPool(pool, remaining, false);
    }
  }

  // Phase C: last resort — relax the exposure filter (rule 3: "unless no
  // alternative exists") to reach N.
  remaining = n - selected.length;
  if (remaining > 0) {
    for (const pool of FILL_ORDER) {
      if (remaining <= 0) break;
      remaining -= takeFromPool(pool, remaining, true);
    }
  }
  void shortfall;

  // §5.6 step 5: shuffle so order doesn't reveal the pool. Shuffle keeps each
  // item's reason (step 6).
  const items: PlannedItem[] = selected.map(({ q, pool }) => ({
    questionId: q._id,
    reason: REASON_BY_POOL[pool],
  }));
  return seededShuffle(items, seed);
}

export const adaptiveStrategy: SelectionStrategy = {
  name: 'adaptive',
  buildSession: buildAdaptiveSession,
};
