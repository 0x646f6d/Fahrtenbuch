import { describe, expect, it } from 'vitest';
import { formatXte, hasArrived, legOffset, navInfo, routeDistanceNm, routeLegs } from './routeNav';

// one minute of latitude = 1 sm
const A = { lat: 45, lon: 14 };
const B = { lat: 45 + 10 / 60, lon: 14 }; // 10 sm north of A
const C = { lat: 45 + 10 / 60, lon: 14 + 5 / 60 / Math.cos((45.1667 * Math.PI) / 180) }; // ~5 sm east of B

describe('routeNav', () => {
  it('computes legs and total distance', () => {
    const legs = routeLegs([A, B, C]);
    expect(legs).toHaveLength(2);
    expect(legs[0].course).toBeCloseTo(0, 1);
    expect(legs[0].distanceNm).toBeCloseTo(10, 1);
    expect(legs[1].course).toBeCloseTo(90, 0);
    expect(routeDistanceNm([A, B, C])).toBeCloseTo(15, 1);
    expect(routeDistanceNm([A])).toBe(0);
  });

  it('gives cross-track error with side and along-track fraction', () => {
    const eastOfTrack = { lat: 45 + 5 / 60, lon: 14 + 1 / 60 / Math.cos((45.08 * Math.PI) / 180) };
    const right = legOffset(A, B, eastOfTrack);
    expect(right.xteNm).toBeCloseTo(1, 2);
    expect(right.along).toBeCloseTo(0.5, 2);
    const westOfTrack = { lat: 45 + 5 / 60, lon: 14 - 0.5 / 60 / Math.cos((45.08 * Math.PI) / 180) };
    expect(legOffset(A, B, westOfTrack).xteNm).toBeCloseTo(-0.5, 2);
  });

  it('computes BTW, DTW, VMG, ETA and remaining distance', () => {
    const now = 1_000_000;
    const info = navInfo({ points: [B, C], target: 0, from: A, pos: A, sog: 5, cog: 0, now });
    expect(info.btw).toBeCloseTo(0, 1);
    expect(info.dtw).toBeCloseTo(10, 1);
    expect(info.vmg).toBeCloseTo(5, 3);
    expect((info.etaTarget! - now) / 3_600_000).toBeCloseTo(2, 2);
    expect(info.remainingNm).toBeCloseTo(15, 1);
    expect((info.etaFinal! - now) / 3_600_000).toBeCloseTo(3, 2);
  });

  it('has no ETA when moving away from the waypoint', () => {
    const info = navInfo({ points: [B], target: 0, from: null, pos: A, sog: 5, cog: 180, now: 0 });
    expect(info.vmg).toBeLessThan(0);
    expect(info.etaTarget).toBeNull();
    expect(info.xte).toBeNull();
  });

  it('detects arrival inside the circle or when passed abeam nearby', () => {
    expect(hasArrived({ dtw: 0.05, along: 0.99 }, 0.1)).toBe(true);
    expect(hasArrived({ dtw: 0.3, along: 1.02 }, 0.1)).toBe(true);
    expect(hasArrived({ dtw: 0.3, along: 0.9 }, 0.1)).toBe(false);
    expect(hasArrived({ dtw: 2, along: 1.5 }, 0.1)).toBe(false);
    expect(hasArrived({ dtw: 0.3, along: null }, 0.1)).toBe(false);
  });

  it('formats XTE', () => {
    expect(formatXte(0.123)).toBe('0.12 sm R');
    expect(formatXte(-0.5)).toBe('0.50 sm L');
    expect(formatXte(null)).toBe('–');
  });
});
