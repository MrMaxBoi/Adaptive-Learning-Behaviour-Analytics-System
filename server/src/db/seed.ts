import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContentFile, DEFAULT_BKT, type BktParams } from '@fyp/shared';
import { loadEnv } from '../config.js';
import { connectDb, disconnectDb } from './connection.js';
import { QuestionModel, SkillModel } from './models/index.js';

/**
 * Seed script (§10): read every authored `content/*.json`, validate it with
 * the Zod ContentFile schema, fill defaults (type, difficulty, BKT), and upsert
 * skills + questions. Idempotent — re-running overwrites by _id.
 *
 * Run with: `npm run seed --workspace server`
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(__dirname, '../../../content');

export async function loadContentFiles(dir: string): Promise<{
  skills: Array<{ _id: string; name: string; topic: string; level: number; prerequisites: string[]; bkt: BktParams }>;
  questions: Array<Record<string, unknown>>;
}> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  const skills: any[] = [];
  const questions: any[] = [];

  for (const file of files) {
    const raw = await readFile(join(dir, file), 'utf8');
    const parsed = ContentFile.parse(JSON.parse(raw));
    for (const s of parsed.skills) {
      skills.push({
        _id: s.id,
        name: s.name,
        topic: s.topic,
        level: s.level,
        prerequisites: s.prerequisites,
        bkt: { ...DEFAULT_BKT, ...(s.bkt ?? {}) },
      });
    }
    for (const q of parsed.questions) {
      questions.push({
        _id: q.id,
        skillId: q.skillId,
        conceptId: q.conceptId,
        type: q.type,
        prompt: q.prompt,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
      });
    }
  }
  return { skills, questions };
}

async function main(): Promise<void> {
  const env = loadEnv();
  await connectDb(env.MONGODB_URI);

  const { skills, questions } = await loadContentFiles(CONTENT_DIR);

  for (const s of skills) {
    await SkillModel.findByIdAndUpdate(s._id, s, { upsert: true, new: true });
  }
  for (const q of questions) {
    await QuestionModel.findByIdAndUpdate(q._id, q, { upsert: true, new: true });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${skills.length} skills and ${questions.length} questions.`);
  await disconnectDb();
}

// Only run when invoked directly, not when imported by a test.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
