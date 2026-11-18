import { describe, expect, it } from 'vitest';
import {
  projectRetention,
  retention,
  retentionBand,
} from '../src/engine/index.js';

const DAY = 24 * 60 * 60 * 1000;

describe('retention (§5.3)', () => {
  it('never reviewed -> 0', () => {
    expect(retention(5, null, 1000)).toBe(0);
  });

  it('at review time (t=0) retention is 1', () => {
    expect(retention(6, 0, 0)).toBe(1);
  });

  it('at the scheduled interval retention is 0.5 (the review point)', () => {
    const interval = 6;
    const now = interval * DAY;
    expect(retention(interval, 0, now)).toBeCloseTo(0.5, 10);
  });

  it('half-life floor of 0.5 days for interval 0', () => {
    // t = 0.5 day, h = 0.5 -> 2^-1 = 0.5
    expect(retention(0, 0, 0.5 * DAY)).toBeCloseTo(0.5, 10);
  });

  it('decays monotonically', () => {
    const r1 = retention(6, 0, 1 * DAY);
    const r2 = retention(6, 0, 3 * DAY);
    const r3 = retention(6, 0, 6 * DAY);
    expect(r1).toBeGreaterThan(r2);
    expect(r2).toBeGreaterThan(r3);
  });

  it('clamps to [0,1] for negative elapsed time (clock skew)', () => {
    expect(retention(6, 0, -5 * DAY)).toBe(1);
  });

  it('bands: >=0.8 strong, 0.5-0.8 fading, <0.5 at_risk', () => {
    expect(retentionBand(0.9)).toBe('strong');
    expect(retentionBand(0.8)).toBe('strong');
    expect(retentionBand(0.6)).toBe('fading');
    expect(retentionBand(0.5)).toBe('fading');
    expect(retentionBand(0.49)).toBe('at_risk');
  });

  it('projection returns 14 descending points by default', () => {
    const p = projectRetention(6, 0, 0);
    expect(p).toHaveLength(14);
    expect(p[0]!.day).toBe(1);
    expect(p[13]!.day).toBe(14);
    expect(p[0]!.retention).toBeGreaterThan(p[13]!.retention);
  });
});
