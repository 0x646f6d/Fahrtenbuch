import { describe, expect, it } from 'vitest';
import { gridLabel, gridStep, isLayerOn, OVERLAYS, toggleLayer } from './layers';

const byId = (id: string) => OVERLAYS.find((o) => o.id === id)!;

describe('map layers', () => {
  it('have unique ids', () => {
    expect(new Set(OVERLAYS.map((o) => o.id)).size).toBe(OVERLAYS.length);
  });

  it('shows only seamarks by default', () => {
    expect(OVERLAYS.filter((o) => isLayerOn({}, o)).map((o) => o.id)).toEqual(['seamarks']);
  });

  it('toggles layers', () => {
    const s = toggleLayer({}, 'seamarks');
    expect(isLayerOn(s, byId('seamarks'))).toBe(false);
    expect(isLayerOn(toggleLayer(s, 'seamarks'), byId('seamarks'))).toBe(true);
  });

  it('keeps depth point layers mutually exclusive', () => {
    let s = toggleLayer({}, 'depthPoints10');
    s = toggleLayer(s, 'depthPoints100');
    expect(isLayerOn(s, byId('depthPoints10'))).toBe(false);
    expect(isLayerOn(s, byId('depthPoints100'))).toBe(true);
  });

  it('picks a sensible grid step', () => {
    // ~390 px for 60° -> 6.5 px/° -> 30° spacing
    expect(gridStep(6.5)).toBe(30);
    // 390 px for 1° -> 10′ is 65 px (too tight), 30′ is 195 px
    expect(gridStep(390)).toBeCloseTo(30 / 60, 9);
    // 390 px for 0.1° -> 1′ = 65 px, 2′ = 130 px
    expect(gridStep(3900)).toBeCloseTo(2 / 60, 9);
  });

  it('labels grid lines', () => {
    expect(gridLabel(54, 'lat', 1)).toBe('54°N');
    expect(gridLabel(54.5, 'lat', 10 / 60)).toBe('54°30′N');
    expect(gridLabel(-3.25, 'lon', 5 / 60)).toBe('003°15′W');
    expect(gridLabel(10.005, 'lon', 0.1 / 60)).toBe('010°00.3′E');
  });
});
