import { describe, expect, it } from 'vitest';
import type { LogEntry, TrackPoint, Trip } from '../db/db';
import { entriesToCsv } from './csv';
import { tripToGpx } from './gpx';

const trip: Trip = { id: 1, name: 'Test & "Törn"', startedAt: Date.UTC(2026, 5, 1, 8), distanceNm: 3 };
const entries: LogEntry[] = [
  { id: 1, tripId: 1, ts: Date.UTC(2026, 5, 1, 9), type: 'course', lat: 54.1, lon: 10.2, sog: 5.25, cog: 45, data: { course: 45 }, note: 'Böen; stark' },
];
const points: TrackPoint[] = [
  { tripId: 1, ts: Date.UTC(2026, 5, 1, 8), lat: 54, lon: 10, sog: 5, cog: 45, accuracy: 5 },
  { tripId: 1, ts: Date.UTC(2026, 5, 1, 8, 0, 5), lat: 54.001, lon: 10.001, sog: 5, cog: 45, accuracy: 5 },
  { tripId: 1, ts: Date.UTC(2026, 5, 1, 9), lat: 54.1, lon: 10.2, sog: 5, cog: 45, accuracy: 5, gap: true },
];

describe('csv', () => {
  it('writes header and escaped rows', () => {
    const csv = entriesToCsv(entries, [trip]);
    const lines = csv.replace('﻿', '').trim().split('\r\n');
    expect(lines[0].split(';')[3]).toBe('Ereignis');
    expect(lines[1]).toContain('Neuer Kurs');
    expect(lines[1]).toContain('5,3');
    expect(lines[1]).toContain('"Böen; stark"');
    expect(lines[1]).toContain('"Test & ""Törn"""');
  });
});

describe('gpx', () => {
  it('splits segments at gaps and escapes names', () => {
    const gpx = tripToGpx(trip, points, entries);
    expect(gpx.match(/<trkseg>/g)).toHaveLength(2);
    expect(gpx.match(/<trkpt /g)).toHaveLength(3);
    expect(gpx).toContain('<wpt lat="54.1000000" lon="10.2000000">');
    expect(gpx).toContain('Test &amp; &quot;Törn&quot;');
  });
});
