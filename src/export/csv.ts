import type { LogEntry, TrackPoint, Trip } from '../db/db';
import { describeData, entryLabel } from '../entries/entryTypes';
import { formatPosition } from '../gps/nav';
import { fmtDate, fmtTime } from './format';

const SEP = ';';

function cell(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** German Excel friendly: semicolon separator, decimal comma. */
function num(v: number | null | undefined, digits: number): string {
  return v == null ? '' : v.toFixed(digits).replace('.', ',');
}

function toCsv(rows: unknown[][]): string {
  return '﻿' + rows.map((r) => r.map(cell).join(SEP)).join('\r\n') + '\r\n';
}

export function entriesToCsv(entries: LogEntry[], trips: Trip[]): string {
  const tripNames = new Map(trips.map((t) => [t.id, t.name]));
  const rows: unknown[][] = [
    ['Fahrt', 'Datum', 'Uhrzeit', 'Ereignis', 'Breite', 'Länge', 'Position', 'Kurs (°)', 'Fahrt (kn)', 'Details', 'Bemerkung'],
  ];
  for (const e of [...entries].sort((a, b) => a.ts - b.ts)) {
    rows.push([
      e.tripId != null ? (tripNames.get(e.tripId) ?? '') : '',
      fmtDate(e.ts),
      fmtTime(e.ts),
      entryLabel(e.type),
      num(e.lat, 6),
      num(e.lon, 6),
      formatPosition(e.lat, e.lon),
      e.cog != null ? Math.round(e.cog) % 360 : '',
      num(e.sog, 1),
      describeData(e.type, e.data),
      e.note ?? '',
    ]);
  }
  return toCsv(rows);
}

export function trackToCsv(points: TrackPoint[]): string {
  const rows: unknown[][] = [['Zeit (ISO)', 'Breite', 'Länge', 'Kurs (°)', 'Fahrt (kn)', 'Genauigkeit (m)', 'Lücke']];
  for (const p of points) {
    rows.push([
      new Date(p.ts).toISOString(),
      num(p.lat, 6),
      num(p.lon, 6),
      p.cog != null ? Math.round(p.cog) % 360 : '',
      num(p.sog, 1),
      Math.round(p.accuracy),
      p.gap ? 'ja' : '',
    ]);
  }
  return toCsv(rows);
}
