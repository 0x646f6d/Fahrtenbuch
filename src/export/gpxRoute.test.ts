import { describe, expect, it } from 'vitest';
import type { Route } from '../db/db';
import { parseGpxRoutes, routeToGpx } from './gpx';

const route: Route = {
  id: 1,
  name: 'Cres <Süd>',
  createdAt: 0,
  updatedAt: Date.UTC(2026, 5, 1),
  points: [
    { lat: 44.9, lon: 14.4, name: 'Ausfahrt' },
    { lat: 44.8, lon: 14.5, name: 'Bucht & Anker' },
  ],
};

describe('gpx routes', () => {
  it('writes and reads a route', () => {
    const xml = routeToGpx(route);
    expect(xml).toContain('<rte><name>Cres &lt;Süd&gt;</name>');
    expect(xml).not.toContain('<trk>');
    const parsed = parseGpxRoutes(xml);
    expect(parsed).toEqual([{ name: 'Cres <Süd>', points: route.points }]);
  });

  it('falls back to waypoints and default names', () => {
    const xml = `<?xml version="1.0"?><gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">
      <wpt lat="45" lon="14"><name>A</name></wpt><wpt lat="45.1" lon="14.1"/></gpx>`;
    expect(parseGpxRoutes(xml, 'Datei')).toEqual([
      { name: 'Datei', points: [{ lat: 45, lon: 14, name: 'A' }, { lat: 45.1, lon: 14.1, name: 'WP 2' }] },
    ]);
  });

  it('rejects other files', () => {
    expect(() => parseGpxRoutes('{"a":1}')).toThrow();
    expect(() => parseGpxRoutes('<kml></kml>')).toThrow();
  });
});
