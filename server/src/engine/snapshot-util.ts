import type { LearnerSnapshot, MemoryState, SkillState } from '@fyp/shared';
import { isSkillAvailable } from './mastery.js';

/** Index memories by conceptId for O(1) lookup. */
export function memoryByConcept(
  snapshot: LearnerSnapshot,
): Map<string, MemoryState> {
  const m = new Map<string, MemoryState>();
  for (const mem of snapshot.memories) m.set(mem.conceptId, mem);
  return m;
}

/** Index skills by id. */
export function skillById(snapshot: LearnerSnapshot): Map<string, SkillState> {
  const m = new Map<string, SkillState>();
  for (const s of snapshot.skills) m.set(s.skillId, s);
  return m;
}

/**
 * Skill ids that are available (§5.4): no prerequisites, or all prerequisites
 * mastered. Prerequisite status is read from the snapshot's own skill states.
 */
export function availableSkillIds(snapshot: LearnerSnapshot): Set<string> {
  const byId = skillById(snapshot);
  const statusOf = (id: string) => byId.get(id)?.status ?? 'not_started';
  const out = new Set<string>();
  for (const s of snapshot.skills) {
    if (isSkillAvailable(s.prerequisites, statusOf)) out.add(s.skillId);
  }
  return out;
}

/** Concept ids due for review (dueAt <= now). */
export function dueConceptIds(snapshot: LearnerSnapshot, nowMs: number): string[] {
  return snapshot.memories
    .filter((m) => m.dueAt !== null && m.dueAt <= nowMs)
    .map((m) => m.conceptId);
}
