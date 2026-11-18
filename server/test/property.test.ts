import { describe, expect, it } from 'vitest';
import { DEFAULT_BKT } from '@fyp/shared';
import {
  buildAdaptiveSession,
  mulberry32,
  retention,
  updateMastery,
  updateMemory,
  newMemory,
} from '../src/engine/index.js';
import { question, skill, snapshot } from './helpers.js';

/** §11 property tests. */
describe('properties (§11)', () => {
  const rng = mulberry32(2024);
  const rand = (min: number, max: number) => min + rng() * (max - min);

  it('retention is always in [0,1]', () => {
    for (let i = 0; i < 2000; i++) {
      const interval = rand(0, 60);
      const last = 0;
      const now = rand(-10, 365) * 24 * 60 * 60 * 1000;
      const r = retention(interval, last, now);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });

  it('mastery is always in [0,1] across random answer sequences', () => {
    for (let i = 0; i < 500; i++) {
      let pL = DEFAULT_BKT.pInit;
      for (let j = 0; j < 30; j++) {
        pL = updateMastery(pL, rng() < 0.5, DEFAULT_BKT);
        expect(pL).toBeGreaterThanOrEqual(0);
        expect(pL).toBeLessThanOrEqual(1);
      }
    }
  });

  it('SM-2 interval and EF stay sane over long histories', () => {
    let m = newMemory('c');
    for (let i = 0; i < 100; i++) {
      const q = Math.floor(rand(0, 6));
      m = updateMemory(m, q, q >= 3, 0);
      expect(m.easeFactor).toBeGreaterThanOrEqual(1.3);
      expect(m.intervalDays).toBeGreaterThanOrEqual(0);
      expect(m.repetitions).toBeGreaterThanOrEqual(0);
    }
  });

  it('adaptive session never exceeds N for random banks and seeds', () => {
    for (let i = 0; i < 100; i++) {
      const n = Math.floor(rand(1, 20));
      const size = Math.floor(rand(0, 40));
      const bank = Array.from({ length: size }, (_, k) =>
        question('s1', `c${k % 7}`, { _id: `q${k}` }),
      );
      const s = snapshot({
        totalAttempts: Math.floor(rand(0, 60)),
        skills: [skill('s1', { level: 1, status: 'developing', attempts: 5, pMastery: 0.6 })],
      });
      const plan = buildAdaptiveSession(
        s,
        bank,
        new Date(0),
        n,
        Math.floor(rand(1, 1e6)),
      );
      expect(plan.length).toBeLessThanOrEqual(n);
    }
  });
});
