import type { LogEntry, Route, RoutePoint, TrackPoint, Trip } from '../db/db';
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

export function routeToGpx(route: Route): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Fahrtenbuch" xmlns="http://www.topografix.com/GPX/1/1">',
    `  <metadata><name>${esc(route.name)}</name><time>${new Date(route.updatedAt).toISOString()}</time></metadata>`,
    `  <rte><name>${esc(route.name)}</name>`,
  ];
  for (const p of route.points) {
    lines.push(`    <rtept lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}"><name>${esc(p.name)}</name></rtept>`);
  }
  lines.push('  </rte>', '</gpx>', '');
  return lines.join('\n');
}

export interface ParsedRoute {
  name: string;
  points: RoutePoint[];
}

function readPoints(els: Element[], prefix: string): RoutePoint[] {
  const out: RoutePoint[] = [];
  for (const el of els) {
    const lat = Number(el.getAttribute('lat'));
    const lon = Number(el.getAttribute('lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !el.hasAttribute('lat') || !el.hasAttribute('lon')) continue;
    const name = childText(el, 'name') || `${prefix} ${out.length + 1}`;
    out.push({ lat, lon, name });
  }
  return out;
}

function childText(el: Element, tag: string): string {
  for (const c of Array.from(el.children)) if (c.localName === tag) return c.textContent?.trim() ?? '';
  return '';
}

/**
 * Read routes from a GPX file: every <rte> becomes a route. Files with only
 * waypoints (<wpt>) give one route through all of them.
 */
export function parseGpxRoutes(xml: string, fallbackName = 'Importierte Route'): ParsedRoute[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length || doc.documentElement.localName !== 'gpx') {
    throw new Error('Keine gültige GPX-Datei');
  }
  const all = Array.from(doc.documentElement.getElementsByTagName('*'));
  const routes: ParsedRoute[] = [];
  for (const rte of all.filter((e) => e.localName === 'rte')) {
    const points = readPoints(Array.from(rte.children).filter((e) => e.localName === 'rtept'), 'WP');
    if (points.length) routes.push({ name: childText(rte, 'name') || fallbackName, points });
  }
  if (routes.length === 0) {
    const points = readPoints(all.filter((e) => e.localName === 'wpt'), 'WP');
    if (points.length) routes.push({ name: fallbackName, points });
  }
  return routes;
}
