import { describe, expect, it } from 'vitest';
import { bearing, deriveMotion, distanceNm, formatLat, formatLon, meanAngle, trackDistanceNm } from './nav';

describe('nav', () => {
  it('one minute of latitude is one nautical mile', () => {
    expect(distanceNm({ lat: 54, lon: 10 }, { lat: 54 + 1 / 60, lon: 10 })).toBeCloseTo(1, 2);
  });

  it('computes bearings', () => {
    expect(bearing({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(0, 5);
    expect(bearing({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(90, 5);
    expect(bearing({ lat: 0, lon: 0 }, { lat: -1, lon: 0 })).toBeCloseTo(180, 5);
    expect(bearing({ lat: 0, lon: 0 }, { lat: 0, lon: -1 })).toBeCloseTo(270, 5);
  });

  it('derives speed and course from two fixes', () => {
    // 1 nm north in 10 minutes = 6 kn
    const m = deriveMotion({ lat: 54, lon: 10, ts: 0 }, { lat: 54 + 1 / 60, lon: 10, ts: 600_000 });
    expect(m.sog).toBeCloseTo(6, 1);
    expect(m.cog).toBeCloseTo(0, 1);
  });

  it('ignores course when not moving', () => {
    expect(deriveMotion({ lat: 54, lon: 10, ts: 0 }, { lat: 54, lon: 10, ts: 5000 }).cog).toBeNull();
  });

  it('averages angles across north', () => {
    expect(meanAngle([350, 10])).toBeCloseTo(0, 5);
    expect(meanAngle([80, 100])).toBeCloseTo(90, 5);
  });

  it('skips gaps in track distance', () => {
    const pts = [
      { lat: 54, lon: 10 },
      { lat: 54 + 1 / 60, lon: 10 },
      { lat: 55, lon: 10, gap: true },
      { lat: 55 + 1 / 60, lon: 10 },
    ];
    expect(trackDistanceNm(pts)).toBeCloseTo(2, 2);
  });

  it('formats degrees and minutes', () => {
    expect(formatLat(54.5)).toBe('54°30.000′N');
    expect(formatLon(-3.25)).toBe('003°15.000′W');
  });
});
