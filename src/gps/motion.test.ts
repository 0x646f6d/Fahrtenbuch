import { describe, expect, it } from 'vitest';
import { MotionEstimator } from './motion';

describe('MotionEstimator', () => {
  it('prefers device values', () => {
    const m = new MotionEstimator();
    const r = m.update({ lat: 54, lon: 10, ts: 0 }, 2.572, 45);
    expect(r.sog).toBeCloseTo(5, 1);
    expect(r.cog).toBeCloseTo(45, 5);
  });

  it('derives course from history when device gives none', () => {
    const m = new MotionEstimator();
    m.update({ lat: 54, lon: 10, ts: 0 }, null, null);
    const r = m.update({ lat: 54, lon: 10.001, ts: 5000 }, null, null);
    expect(r.cog).toBeCloseTo(90, 0);
    expect(r.sog).toBeGreaterThan(5);
  });

  it('keeps last course when stationary', () => {
    const m = new MotionEstimator();
    m.update({ lat: 54, lon: 10, ts: 0 }, 3, 120);
    const r = m.update({ lat: 54, lon: 10, ts: 5000 }, 0, null);
    expect(r.cog).toBeCloseTo(120, 5);
  });
});
