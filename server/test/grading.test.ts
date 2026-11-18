import { describe, expect, it } from 'vitest';
import { gradeAnswer } from '../src/engine/index.js';

describe('gradeAnswer (§5.1)', () => {
  it('incorrect -> 1 regardless of time', () => {
    expect(gradeAnswer(false, 100)).toBe(1);
    expect(gradeAnswer(false, 20000)).toBe(1);
  });

  it('correct and slow (> slowMs) -> 3', () => {
    expect(gradeAnswer(true, 12001)).toBe(3);
  });

  it('correct and medium (fastMs < t <= slowMs) -> 4', () => {
    expect(gradeAnswer(true, 12000)).toBe(4); // boundary: == slowMs
    expect(gradeAnswer(true, 4001)).toBe(4);
  });

  it('correct and fast (<= fastMs) -> 5', () => {
    expect(gradeAnswer(true, 4000)).toBe(5); // boundary: == fastMs
    expect(gradeAnswer(true, 10)).toBe(5);
  });

  it('respects custom thresholds', () => {
    expect(gradeAnswer(true, 2500, { fastMs: 2000, slowMs: 5000 })).toBe(4);
  });
});
