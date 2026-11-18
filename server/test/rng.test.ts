import { describe, expect, it } from 'vitest';
import { mulberry32, seededShuffle } from '../src/engine/index.js';

describe('seeded RNG (§5.6.5, NFR-09)', () => {
  it('same seed -> identical stream', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 5; i++) expect(a()).toBe(b());
  });

  it('different seeds -> different streams', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('values stay in [0,1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('shuffle is deterministic for a seed and preserves membership', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const s1 = seededShuffle(items, 99);
    const s2 = seededShuffle(items, 99);
    expect(s1).toEqual(s2);
    expect([...s1].sort((a, b) => a - b)).toEqual(items);
  });

  it('does not mutate the input array', () => {
    const items = [1, 2, 3];
    seededShuffle(items, 1);
    expect(items).toEqual([1, 2, 3]);
  });
});
