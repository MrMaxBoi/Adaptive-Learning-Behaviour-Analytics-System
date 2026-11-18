import { describe, expect, it } from 'vitest';
import { determineStage } from '../src/engine/index.js';
import { DAY, memory, skill, snapshot } from './helpers.js';

describe('determineStage (§5.5)', () => {
  const now = 10 * DAY;

  it('Cold Start: fewer than 10 total attempts', () => {
    expect(determineStage(snapshot({ totalAttempts: 9 }), now, 10)).toBe(
      'cold_start',
    );
  });

  it('Adaptive Review: due concepts >= 40% of session size', () => {
    const memories = [
      memory('c1', { dueAt: now - DAY }),
      memory('c2', { dueAt: now - DAY }),
      memory('c3', { dueAt: now - DAY }),
      memory('c4', { dueAt: now - DAY }),
    ];
    const s = snapshot({ totalAttempts: 50, memories });
    expect(determineStage(s, now, 10)).toBe('adaptive_review'); // 4 >= 4
  });

  it('not Adaptive Review when below the 40% threshold', () => {
    const memories = [
      memory('c1', { dueAt: now - DAY }),
      memory('c2', { dueAt: now - DAY }),
      memory('c3', { dueAt: now - DAY }),
    ];
    const s = snapshot({
      totalAttempts: 50,
      memories,
      skills: [skill('s1', { status: 'weak', attempts: 5, pMastery: 0.3 })],
    });
    expect(determineStage(s, now, 10)).toBe('core_practice'); // 3 < 4
  });

  it('Core Practice: an available skill is weak', () => {
    const s = snapshot({
      totalAttempts: 20,
      skills: [skill('s1', { status: 'weak', attempts: 5, pMastery: 0.3 })],
    });
    expect(determineStage(s, now, 10)).toBe('core_practice');
  });

  it('Advanced Expansion: every available skill mastered', () => {
    const s = snapshot({
      totalAttempts: 20,
      skills: [
        skill('s1', { status: 'mastered', attempts: 10, pMastery: 0.99 }),
        skill('s2', { status: 'mastered', attempts: 10, pMastery: 0.97 }),
      ],
    });
    expect(determineStage(s, now, 10)).toBe('advanced_expansion');
  });

  it('Foundation Building: still developing, none weak', () => {
    const s = snapshot({
      totalAttempts: 20,
      skills: [skill('s1', { status: 'developing', attempts: 5, pMastery: 0.6 })],
    });
    expect(determineStage(s, now, 10)).toBe('foundation_building');
  });

  it('a skill whose prereq is unmastered is not "available" for Advanced Expansion', () => {
    const s = snapshot({
      totalAttempts: 20,
      skills: [
        skill('s1', { status: 'mastered', attempts: 10, pMastery: 0.99 }),
        skill('s2', {
          status: 'developing',
          attempts: 5,
          pMastery: 0.6,
          prerequisites: ['s1'],
        }),
      ],
    });
    // s2 is available (prereq mastered) and developing -> not all mastered.
    expect(determineStage(s, now, 10)).toBe('foundation_building');
  });
});
