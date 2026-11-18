import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ContentFile } from '@fyp/shared';

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(here, '../../content');

const files = [
  'hiragana-vowels.json',
  'hiragana-k.json',
  'hiragana-s.json',
  'hiragana-t.json',
  'hiragana-n.json',
  'hiragana-h.json',
  'hiragana-m.json',
  'hiragana-y.json',
  'hiragana-r.json',
  'hiragana-w.json',
  'n5-numbers.json',
  'n5-greetings.json',
  'n5-family.json',
  'n5-food.json',
  'n5-time.json',
];

describe('authored content (§10)', () => {
  for (const file of files) {
    it(`${file} validates against the content schema`, () => {
      const raw = JSON.parse(readFileSync(resolve(contentDir, file), 'utf8'));
      const parsed = ContentFile.parse(raw);
      expect(parsed.skills.length).toBeGreaterThan(0);
      expect(parsed.questions.length).toBeGreaterThan(0);
    });

    it(`${file}: every question's answer is one of its options`, () => {
      const raw = JSON.parse(readFileSync(resolve(contentDir, file), 'utf8'));
      const parsed = ContentFile.parse(raw);
      for (const q of parsed.questions) {
        expect(q.options).toContain(q.answer);
      }
    });

    it(`${file}: every question references a declared skill`, () => {
      const raw = JSON.parse(readFileSync(resolve(contentDir, file), 'utf8'));
      const parsed = ContentFile.parse(raw);
      const ids = new Set(parsed.skills.map((s) => s.id));
      for (const q of parsed.questions) expect(ids.has(q.skillId)).toBe(true);
    });
  }
});

describe('content bank integrity across all files (§10)', () => {
  function loadAll() {
    const skills: { id: string; prerequisites: string[]; topic: string }[] = [];
    const questions: { id: string; conceptId: string; skillId: string; options: string[]; answer: string }[] = [];
    for (const file of files) {
      const parsed = ContentFile.parse(JSON.parse(readFileSync(resolve(contentDir, file), 'utf8')));
      for (const s of parsed.skills) skills.push({ id: s.id, prerequisites: s.prerequisites, topic: s.topic });
      for (const q of parsed.questions)
        questions.push({ id: q.id, conceptId: q.conceptId, skillId: q.skillId, options: q.options, answer: q.answer });
    }
    return { skills, questions };
  }

  it('skill ids are unique', () => {
    const { skills } = loadAll();
    const ids = skills.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('question ids are unique', () => {
    const { questions } = loadAll();
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every prerequisite resolves to a declared skill (FR-32)', () => {
    const { skills } = loadAll();
    const ids = new Set(skills.map((s) => s.id));
    for (const s of skills) for (const p of s.prerequisites) expect(ids.has(p), `${s.id} -> ${p}`).toBe(true);
  });

  it('every answer is one of the options, across the whole bank', () => {
    const { questions } = loadAll();
    for (const q of questions) expect(q.options, q.id).toContain(q.answer);
  });

  it('every option set has exactly 4 distinct options', () => {
    const { questions } = loadAll();
    for (const q of questions) expect(new Set(q.options).size, q.id).toBe(4);
  });

  it('covers 46 hiragana concepts and about 50 vocabulary concepts (§10)', () => {
    const { skills, questions } = loadAll();
    const topicBySkill = new Map(skills.map((s) => [s.id, s.topic]));
    const hiraganaConcepts = new Set<string>();
    const vocabConcepts = new Set<string>();
    for (const q of questions) {
      if (topicBySkill.get(q.skillId) === 'hiragana') hiraganaConcepts.add(q.conceptId);
      else vocabConcepts.add(q.conceptId);
    }
    expect(hiraganaConcepts.size).toBe(46);
    expect(vocabConcepts.size).toBeGreaterThanOrEqual(50);
  });
});
