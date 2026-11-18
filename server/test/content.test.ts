import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ContentFile } from '@fyp/shared';

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(here, '../../content');

const files = ['hiragana-vowels.json', 'n5-numbers.json'];

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
