import type { LogEntry, TrackPoint, Trip } from '../db/db';
import { describeData, entryLabel } from '../entries/entryTypes';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function tripToGpx(trip: Trip, points: TrackPoint[], entries: LogEntry[]): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Fahrtenbuch" xmlns="http://www.topografix.com/GPX/1/1">',
    `  <metadata><name>${esc(trip.name)}</name><time>${new Date(trip.startedAt).toISOString()}</time></metadata>`,
  ];
  for (const e of entries) {
    if (e.lat == null || e.lon == null) continue;
    const desc = [describeData(e.type, e.data), e.note].filter(Boolean).join(' – ');
    lines.push(
      `  <wpt lat="${e.lat.toFixed(7)}" lon="${e.lon.toFixed(7)}"><time>${new Date(e.ts).toISOString()}</time>` +
        `<name>${esc(entryLabel(e.type))}</name>${desc ? `<desc>${esc(desc)}</desc>` : ''}</wpt>`,
    );
  }
  lines.push(`  <trk><name>${esc(trip.name)}</name>`);
  let open = false;
  for (const p of points) {
    if (!open || p.gap) {
      if (open) lines.push('    </trkseg>');
      lines.push('    <trkseg>');
      open = true;
    }
    lines.push(
      `      <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}"><time>${new Date(p.ts).toISOString()}</time></trkpt>`,
    );
  }
  if (open) lines.push('    </trkseg>');
  lines.push('  </trk>', '</gpx>', '');
  return lines.join('\n');
}
