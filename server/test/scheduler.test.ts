import { describe, expect, it } from 'vitest';
import { DAY_MS, newMemory, updateMemory } from '../src/engine/index.js';

describe('SM-2 scheduler (§5.2)', () => {
  it('new concept starts at reps 0, EF 2.5, interval 0', () => {
    const m = newMemory('kana-a');
    expect(m.repetitions).toBe(0);
    expect(m.easeFactor).toBe(2.5);
    expect(m.intervalDays).toBe(0);
    expect(m.dueAt).toBeNull();
    expect(m.lastReviewedAt).toBeNull();
  });

  it('worked example: successive q=5 reviews give 1, 6, round(6*EF) days', () => {
    // Canonical SM-2 progression from a fresh card with perfect recall.
    let m = newMemory('c');
    const now = 0;

    m = updateMemory(m, 5, true, now); // rep 0 -> interval 1, reps become 1
    expect(m.intervalDays).toBe(1);
    expect(m.repetitions).toBe(1);
    // EF: 2.5 + (0.1 - 0*(...)) = 2.6
    expect(m.easeFactor).toBeCloseTo(2.6, 10);
    expect(m.dueAt).toBe(now + 1 * DAY_MS);

    m = updateMemory(m, 5, true, now); // rep 1 -> interval 6, reps become 2
    expect(m.intervalDays).toBe(6);
    expect(m.repetitions).toBe(2);
    expect(m.easeFactor).toBeCloseTo(2.7, 10);

    m = updateMemory(m, 5, true, now); // rep 2 -> round(6 * 2.7) = 16
    expect(m.intervalDays).toBe(16);
    expect(m.repetitions).toBe(3);
    expect(m.easeFactor).toBeCloseTo(2.8, 10);
  });

  it('q=4 keeps EF unchanged (0.1 - 1*(0.08+0.02) = 0)', () => {
    let m = newMemory('c');
    m = updateMemory(m, 4, true, 0);
    expect(m.easeFactor).toBeCloseTo(2.5, 10);
  });

  it('q=3 lowers EF by 0.14 and still advances interval', () => {
    let m = newMemory('c');
    m = updateMemory(m, 3, true, 0);
    // 0.1 - 2*(0.08 + 2*0.02) = 0.1 - 2*0.12 = -0.14
    expect(m.easeFactor).toBeCloseTo(2.36, 10);
    expect(m.intervalDays).toBe(1);
    expect(m.repetitions).toBe(1);
  });

  it('failure (q<3) resets reps to 0 and interval to 1', () => {
    let m = newMemory('c');
    m = updateMemory(m, 5, true, 0);
    m = updateMemory(m, 5, true, 0); // reps 2, interval 6
    m = updateMemory(m, 1, false, 0); // fail
    expect(m.repetitions).toBe(0);
    expect(m.intervalDays).toBe(1);
  });

  it('EF never drops below 1.3', () => {
    let m = newMemory('c');
    for (let i = 0; i < 20; i++) m = updateMemory(m, 0, false, 0);
    expect(m.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('tracks totals and sets lastReviewedAt/dueAt from now', () => {
    let m = newMemory('c');
    const now = 1_000_000;
    m = updateMemory(m, 5, true, now);
    m = updateMemory(m, 1, false, now);
    expect(m.totalReviews).toBe(2);
    expect(m.totalCorrect).toBe(1);
    expect(m.lastReviewedAt).toBe(now);
    expect(m.dueAt).toBe(now + m.intervalDays * DAY_MS);
  });

  it('does not mutate the input', () => {
    const m = newMemory('c');
    const copy = { ...m };
    updateMemory(m, 5, true, 0);
    expect(m).toEqual(copy);
  });
});
