import { describe, expect, it } from 'vitest';
import { renumber } from './routes';

describe('renumber', () => {
  it('renames default waypoint names to their position only', () => {
    const pts = [
      { lat: 0, lon: 0, name: 'WP 1' },
      { lat: 0, lon: 0, name: 'WP 3' },
      { lat: 0, lon: 0, name: 'Bucht' },
      { lat: 0, lon: 0, name: 'WP 2' },
    ];
    expect(renumber(pts).map((p) => p.name)).toEqual(['WP 1', 'WP 2', 'Bucht', 'WP 4']);
  });
});
