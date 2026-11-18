import { z } from 'zod';
import { BktParams } from './domain.js';

/**
 * Content file schema (§10). Authored JSON in `content/*.json`, validated on
 * seed. Kept separate from the DB `Skill`/`Question` shapes so authors write
 * the minimum and the seed script fills defaults.
 */

export const ContentSkill = z.object({
  id: z.string(),
  name: z.string(),
  topic: z.string(),
  level: z.number().int(),
  prerequisites: z.array(z.string()).default([]),
  /** optional per-skill BKT override (§5.4). */
  bkt: BktParams.partial().optional(),
});
export type ContentSkill = z.infer<typeof ContentSkill>;

export const ContentQuestion = z.object({
  id: z.string(),
  skillId: z.string(),
  conceptId: z.string(),
  type: z.literal('mcq').default('mcq'),
  prompt: z.string(),
  options: z.array(z.string()).length(4),
  answer: z.string(),
  explanation: z.string(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
});
export type ContentQuestion = z.infer<typeof ContentQuestion>;

export const ContentFile = z.object({
  skills: z.array(ContentSkill),
  questions: z.array(ContentQuestion),
});
export type ContentFile = z.infer<typeof ContentFile>;
