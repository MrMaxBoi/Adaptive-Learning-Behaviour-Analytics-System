import { describe, expect, it } from 'vitest';
import {
  buildAdaptiveSession,
  poolQuotas,
} from '../src/engine/index.js';
import { POOL_SHARES } from '../src/engine/index.js';
import { DAY, memory, question, skill, snapshot } from './helpers.js';

describe('poolQuotas (decision #7)', () => {
  it('Foundation shares of 10 sum to N exactly', () => {
    const q = poolQuotas(POOL_SHARES.foundation_building, 10);
    expect(q.review + q.weak + q.new + q.reinforcement).toBe(10);
    expect(q).toEqual({ review: 2, weak: 1, new: 4, reinforcement: 3 });
  });

  it('adjusts the largest-share pool when rounding drifts off N', () => {
    // N=7, foundation: round(1.4,0.7,2.8,2.1) = 1,1,3,2 = 7 already.
    // Use N=3 adaptive_review: round(1.8,0.6,0,0.6)=2,1,0,1=4 -> trim review.
    const q = poolQuotas(POOL_SHARES.adaptive_review, 3);
    expect(q.review + q.weak + q.new + q.reinforcement).toBe(3);
  });

  it('every stage/size combo sums to N', () => {
    for (const stage of Object.keys(POOL_SHARES) as Array<
      keyof typeof POOL_SHARES
    >) {
      for (const n of [1, 3, 5, 7, 10, 13, 20]) {
        const q = poolQuotas(POOL_SHARES[stage], n);
        expect(q.review + q.weak + q.new + q.reinforcement).toBe(n);
      }
    }
  });
});

describe('buildAdaptiveSession (§5.6)', () => {
  const now = new Date(10 * DAY);

  it('Cold Start takes only new content, lowest level first', () => {
    const bank = [
      question('s2', 'c-b', { _id: 'qb' }),
      question('s1', 'c-a', { _id: 'qa' }),
    ];
    const s = snapshot({
      totalAttempts: 0,
      skills: [
        skill('s1', { level: 1, status: 'not_started' }),
        skill('s2', { level: 2, status: 'not_started' }),
      ],
    });
    const plan = buildAdaptiveSession(s, bank, now, 2, 1);
    expect(plan).toHaveLength(2);
    expect(plan.every((p) => p.reason === 'new_content')).toBe(true);
  });

  it('never exceeds N', () => {
    const bank = Array.from({ length: 50 }, (_, i) =>
      question('s1', `c${i}`, { _id: `q${i}` }),
    );
    const s = snapshot({
      totalAttempts: 0,
      skills: [skill('s1', { level: 1 })],
    });
    expect(buildAdaptiveSession(s, bank, now, 10, 1)).toHaveLength(10);
  });

  it('records due_review for due concepts in Adaptive Review', () => {
    const bank = [
      question('s1', 'c1', { _id: 'q1' }),
      question('s1', 'c2', { _id: 'q2' }),
      question('s1', 'c3', { _id: 'q3' }),
      question('s1', 'c4', { _id: 'q4' }),
    ];
    const memories = ['c1', 'c2', 'c3', 'c4'].map((c) =>
      memory(c, { dueAt: now.getTime() - DAY, intervalDays: 2 }),
    );
    const s = snapshot({
      totalAttempts: 50,
      memories,
      skills: [skill('s1', { status: 'developing', attempts: 8, pMastery: 0.6 })],
    });
    const plan = buildAdaptiveSession(s, bank, now, 4, 1);
    expect(plan.some((p) => p.reason === 'due_review')).toBe(true);
  });

  it('is deterministic for a given seed', () => {
    const bank = Array.from({ length: 20 }, (_, i) =>
      question('s1', `c${i}`, { _id: `q${i}` }),
    );
    const s = snapshot({ totalAttempts: 0, skills: [skill('s1')] });
    const a = buildAdaptiveSession(s, bank, now, 10, 123);
    const b = buildAdaptiveSession(s, bank, now, 10, 123);
    expect(a).toEqual(b);
  });

  it('no more than 3 questions for the same concept', () => {
    const bank = Array.from({ length: 10 }, (_, i) =>
      question('s1', 'same-concept', { _id: `q${i}` }),
    );
    const s = snapshot({ totalAttempts: 0, skills: [skill('s1')] });
    const plan = buildAdaptiveSession(s, bank, now, 10, 1);
    expect(plan.length).toBeLessThanOrEqual(3);
  });

  it('skips questions shown in the last 2 sessions when alternatives exist', () => {
    const bank = Array.from({ length: 6 }, (_, i) =>
      question('s1', `c${i}`, { _id: `q${i}` }),
    );
    const s = snapshot({
      totalAttempts: 0,
      skills: [skill('s1')],
      recentlyShownQuestionIds: ['q0', 'q1'],
    });
    const plan = buildAdaptiveSession(s, bank, now, 3, 1);
    const ids = plan.map((p) => p.questionId);
    expect(ids).not.toContain('q0');
    expect(ids).not.toContain('q1');
  });

  it('relaxes the exposure filter when no alternative exists', () => {
    const bank = [question('s1', 'c0', { _id: 'q0' })];
    const s = snapshot({
      totalAttempts: 0,
      skills: [skill('s1')],
      recentlyShownQuestionIds: ['q0'],
    });
    const plan = buildAdaptiveSession(s, bank, now, 1, 1);
    expect(plan.map((p) => p.questionId)).toEqual(['q0']);
  });
});
