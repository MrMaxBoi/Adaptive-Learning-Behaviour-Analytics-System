import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  Attempt,
  KnowledgeCoverage,
  Memory,
  PracticeSession,
  Question,
  QuestionExposure,
  Skill,
  User,
} from '@fyp/shared';
import { schemas } from '../src/db/models/index.js';

/**
 * Zod <-> Mongoose parity (decision: Zod is the source of truth, Mongoose is
 * hand-written, and this test asserts the two agree on field names so they
 * cannot silently drift). We compare the top-level key sets after accounting
 * for the few fields each side legitimately owns:
 *   - Mongoose auto-manages `_id`; ObjectId `_id` is not a Zod field.
 *   - `User.passwordHash` does not exist (Clerk deviation); `clerkUserId` does.
 */

/** Top-level field names declared on a Mongoose schema. */
function mongooseFields(schema: { obj: Record<string, unknown> }): Set<string> {
  return new Set(Object.keys(schema.obj));
}

/** Top-level field names of a Zod object schema. */
function zodFields(schema: z.ZodObject<z.ZodRawShape>): Set<string> {
  return new Set(Object.keys(schema.shape));
}

interface Case {
  name: string;
  zod: z.ZodObject<z.ZodRawShape>;
  mongoose: { obj: Record<string, unknown> };
  /** Zod-only fields allowed to be absent from Mongoose (e.g. ObjectId _id). */
  zodOnly?: string[];
  /** Mongoose-only fields allowed to be absent from Zod. */
  mongooseOnly?: string[];
}

const cases: Case[] = [
  {
    name: 'users',
    zod: User as unknown as z.ZodObject<z.ZodRawShape>,
    mongoose: schemas.user,
    zodOnly: ['_id'], // ObjectId, auto-managed
  },
  {
    name: 'skills',
    zod: Skill as unknown as z.ZodObject<z.ZodRawShape>,
    mongoose: schemas.skill,
    zodOnly: ['_id'], // string _id declared via schema option, not in obj
  },
  {
    name: 'questions',
    zod: Question as unknown as z.ZodObject<z.ZodRawShape>,
    mongoose: schemas.question,
    zodOnly: ['_id'],
  },
  {
    name: 'sessions',
    zod: PracticeSession as unknown as z.ZodObject<z.ZodRawShape>,
    mongoose: schemas.session,
    zodOnly: ['_id'],
  },
  {
    name: 'attempts',
    zod: Attempt as unknown as z.ZodObject<z.ZodRawShape>,
    mongoose: schemas.attempt,
    zodOnly: ['_id'],
  },
  {
    name: 'memories',
    zod: Memory as unknown as z.ZodObject<z.ZodRawShape>,
    mongoose: schemas.memory,
  },
  {
    name: 'knowledgecoverage',
    zod: KnowledgeCoverage as unknown as z.ZodObject<z.ZodRawShape>,
    mongoose: schemas.coverage,
  },
  {
    name: 'questionexposures',
    zod: QuestionExposure as unknown as z.ZodObject<z.ZodRawShape>,
    mongoose: schemas.exposure,
  },
];

describe('Zod <-> Mongoose field parity', () => {
  for (const c of cases) {
    it(`${c.name}: field sets agree`, () => {
      const zf = zodFields(c.zod);
      const mf = mongooseFields(c.mongoose);
      for (const f of c.zodOnly ?? []) {
        zf.delete(f);
        mf.delete(f);
      }
      for (const f of c.mongooseOnly ?? []) mf.delete(f);

      // Every Zod field must exist in Mongoose and vice versa.
      const missingInMongoose = [...zf].filter((f) => !mf.has(f));
      const missingInZod = [...mf].filter((f) => !zf.has(f));

      expect(missingInMongoose, `${c.name}: in Zod but not Mongoose`).toEqual([]);
      expect(missingInZod, `${c.name}: in Mongoose but not Zod`).toEqual([]);
    });
  }

  it('users has clerkUserId and no passwordHash (Clerk deviation)', () => {
    const mf = mongooseFields(schemas.user);
    expect(mf.has('clerkUserId')).toBe(true);
    expect(mf.has('passwordHash')).toBe(false);
  });
});
