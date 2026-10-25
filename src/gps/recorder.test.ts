import { describe, expect, it } from 'vitest';
import { decide } from './recorder';

const base = { lat: 54, lon: 10, ts: 0, accuracy: 5 };

describe('recorder', () => {
  it('logs the first fix', () => {
    expect(decide(null, base, 5)).toEqual({ log: true, gap: false, distanceNm: 0 });
  });

  it('rejects inaccurate fixes', () => {
    expect(decide(null, { ...base, accuracy: 120 }, 5)).toMatchObject({ log: false, reason: 'accuracy' });
  });

  it('respects the interval', () => {
    expect(decide(base, { ...base, ts: 2000 }, 5)).toMatchObject({ log: false, reason: 'interval' });
    expect(decide(base, { ...base, lat: 54.0001, ts: 5000 }, 5)).toMatchObject({ log: true, gap: false });
  });

  it('rejects implausible jumps', () => {
    expect(decide(base, { ...base, lat: 54.1, ts: 5000 }, 5)).toMatchObject({ log: false, reason: 'jump' });
  });

  it('flags gaps and counts no distance', () => {
    expect(decide(base, { ...base, lat: 54.1, ts: 10 * 60_000 }, 5)).toEqual({ log: true, gap: true, distanceNm: 0 });
  });
});
