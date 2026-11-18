import { describe, expect, it } from 'vitest';
import { DEFAULT_BKT } from '@fyp/shared';
import {
  isSkillAvailable,
  masteryStatus,
  updateMastery,
} from '../src/engine/index.js';

describe('BKT mastery (§5.4)', () => {
  it('worked example: correct answer from pInit raises mastery', () => {
    // pL=0.2, pSlip=0.1, pGuess=0.25, pTransit=0.15
    // post = 0.2*0.9 / (0.2*0.9 + 0.8*0.25) = 0.18 / 0.38 = 0.473684...
    // pL' = post + (1-post)*0.15 = 0.473684 + 0.526316*0.15 = 0.552632
    const pL = updateMastery(0.2, true, DEFAULT_BKT);
    expect(pL).toBeCloseTo(0.552632, 5);
  });

  it('worked example: incorrect answer from pInit lowers the posterior', () => {
    // post = 0.2*0.1 / (0.2*0.1 + 0.8*0.75) = 0.02 / 0.62 = 0.032258
    // pL' = 0.032258 + 0.967742*0.15 = 0.177419
    const pL = updateMastery(0.2, false, DEFAULT_BKT);
    expect(pL).toBeCloseTo(0.177419, 5);
  });

  it('repeated correct answers converge toward 1', () => {
    let pL = DEFAULT_BKT.pInit;
    for (let i = 0; i < 15; i++) pL = updateMastery(pL, true, DEFAULT_BKT);
    expect(pL).toBeGreaterThan(0.95);
    expect(pL).toBeLessThanOrEqual(1);
  });

  it('status thresholds (§5.4)', () => {
    expect(masteryStatus(0.9, 0)).toBe('not_started'); // no attempts wins
    expect(masteryStatus(0.3, 4)).toBe('weak');
    expect(masteryStatus(0.49, 4)).toBe('weak');
    expect(masteryStatus(0.5, 4)).toBe('developing');
    expect(masteryStatus(0.94, 4)).toBe('developing');
    expect(masteryStatus(0.95, 4)).toBe('mastered');
  });

  it('availability: no prereqs -> available', () => {
    expect(isSkillAvailable([], () => 'not_started')).toBe(true);
  });

  it('availability: all prereqs mastered -> available', () => {
    expect(isSkillAvailable(['a', 'b'], () => 'mastered')).toBe(true);
  });

  it('availability: any unmastered prereq -> unavailable', () => {
    const statusOf = (id: string) =>
      id === 'a' ? ('mastered' as const) : ('developing' as const);
    expect(isSkillAvailable(['a', 'b'], statusOf)).toBe(false);
  });
});
