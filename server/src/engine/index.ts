/** Engine core (SPEC.md §5): pure functions, no I/O, `now` always passed in. */
export { gradeAnswer } from './grading.js';
export { newMemory, updateMemory, DAY_MS } from './scheduler.js';
export {
  retention,
  projectRetention,
  retentionBand,
  type RetentionBand,
} from './retention.js';
export { updateMastery, masteryStatus, isSkillAvailable } from './mastery.js';
export { determineStage } from './stage.js';
export { mulberry32, seededShuffle } from './rng.js';
export {
  memoryByConcept,
  skillById,
  availableSkillIds,
  dueConceptIds,
} from './snapshot-util.js';
export {
  buildAdaptiveSession,
  adaptiveStrategy,
  poolQuotas,
} from './strategies/adaptive.js';
export { buildStaticSession, staticStrategy } from './strategies/static.js';
export {
  buildPools,
  POOL_SHARES,
  FILL_ORDER,
  REASON_BY_POOL,
  type PoolName,
} from './strategies/pools.js';
