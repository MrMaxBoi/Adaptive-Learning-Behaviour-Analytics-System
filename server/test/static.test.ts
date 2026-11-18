import { describe, expect, it } from 'vitest';
import { buildStaticSession } from '../src/engine/index.js';
import { question, skill, snapshot } from './helpers.js';

describe('buildStaticSession (§5.7)', () => {
  const now = new Date(0);
  const bank = [
    question('s2', 'c-b', { _id: 'q-b' }),
    question('s1', 'c-a2', { _id: 'q-a2' }),
    question('s1', 'c-a1', { _id: 'q-a1' }),
  ];
  const skills = [skill('s1', { level: 1 }), skill('s2', { level: 2 })];

  it('orders by skill level then question id', () => {
    const s = snapshot({ totalAttempts: 0, skills });
    const plan = buildStaticSession(s, bank, now, 3, 1);
    expect(plan.map((p) => p.questionId)).toEqual(['q-a1', 'q-a2', 'q-b']);
  });

  it('advances by totalAttempts and wraps around', () => {
    const s = snapshot({ totalAttempts: 2, skills });
    const plan = buildStaticSession(s, bank, now, 3, 1);
    // start = 2 % 3 = 2 -> q-b, then wrap to q-a1, q-a2
    expect(plan.map((p) => p.questionId)).toEqual(['q-b', 'q-a1', 'q-a2']);
  });

  it('is ignorant of memory/mastery state (same plan regardless)', () => {
    const base = snapshot({ totalAttempts: 0, skills });
    const withMastery = snapshot({
      totalAttempts: 0,
      skills: [
        skill('s1', { level: 1, status: 'mastered', pMastery: 0.99 }),
        skill('s2', { level: 2, status: 'weak', pMastery: 0.2 }),
      ],
    });
    expect(buildStaticSession(base, bank, now, 3, 1)).toEqual(
      buildStaticSession(withMastery, bank, now, 3, 1),
    );
  });

  it('never exceeds N and labels items new_content', () => {
    const s = snapshot({ totalAttempts: 0, skills });
    const plan = buildStaticSession(s, bank, now, 2, 1);
    expect(plan).toHaveLength(2);
    expect(plan.every((p) => p.reason === 'new_content')).toBe(true);
  });

  it('empty bank -> empty plan', () => {
    expect(buildStaticSession(snapshot(), [], now, 10, 1)).toEqual([]);
  });
});
