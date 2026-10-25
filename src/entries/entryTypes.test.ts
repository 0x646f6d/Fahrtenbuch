import { describe, expect, it } from 'vitest';
import { describeData, ENTRY_TYPE_MAP, ENTRY_TYPES, sortByUsage } from './entryTypes';

describe('entry types', () => {
  it('have unique ids', () => {
    expect(new Set(ENTRY_TYPES.map((t) => t.id)).size).toBe(ENTRY_TYPES.length);
  });

  it('keeps default order without usage', () => {
    expect(sortByUsage(ENTRY_TYPES, []).map((t) => t.id)).toEqual(ENTRY_TYPES.map((t) => t.id));
  });

  it('moves frequently used entries forward', () => {
    const now = Date.now();
    const sorted = sortByUsage(ENTRY_TYPES, [
      { type: 'reef', count: 5, lastUsed: now },
      { type: 'tack', count: 2, lastUsed: now },
    ], now);
    expect(sorted[0].id).toBe('reef');
    expect(sorted[1].id).toBe('tack');
  });

  it('lets old usage decay', () => {
    const now = Date.now();
    const sorted = sortByUsage(ENTRY_TYPES, [
      { type: 'reef', count: 10, lastUsed: now - 120 * 86_400_000 },
      { type: 'water', count: 2, lastUsed: now },
    ], now);
    expect(sorted[0].id).toBe('water');
  });

  it('prefills the current course', () => {
    const fix = { lat: 54, lon: 10, ts: 0, accuracy: 5, sog: 4, cog: 359.7 };
    expect(ENTRY_TYPE_MAP.get('course')!.prefill!(fix)).toEqual({ course: 0 });
  });

  it('describes data', () => {
    expect(describeData('course', { course: 5, destination: 'Fehmarn' })).toBe('Kurs 005°, Ziel / Wegpunkt: Fehmarn');
  });
});
