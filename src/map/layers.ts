import type { LucideIcon } from 'lucide-react';
import { Anchor, Grid3x3, Layers, LineChart, Sailboat, Waves } from 'lucide-react';

const OSM_DEPTH_ATTRIBUTION = '&copy; <a href="https://depth.openseamap.org">OpenSeaMap</a> Contributors';

interface BaseOverlay {
  id: OverlayId;
  label: string;
  description: string;
  icon: LucideIcon;
  defaultOn: boolean;
  /** overlays sharing a group are mutually exclusive */
  group?: string;
}

export interface XyzOverlay extends BaseOverlay {
  kind: 'xyz';
  url: string;
  attribution: string;
  maxNativeZoom?: number;
  opacity?: number;
}

export interface WmsOverlay extends BaseOverlay {
  kind: 'wms';
  url: string;
  layers: string;
  attribution: string;
  opacity?: number;
  minZoom?: number;
}

export interface GridOverlay extends BaseOverlay {
  kind: 'grid';
}

export type Overlay = XyzOverlay | WmsOverlay | GridOverlay;

export type OverlayId = 'seamarks' | 'sport' | 'gebco' | 'contours' | 'depthPoints10' | 'depthPoints100' | 'grid';

/**
 * OpenSeaMap overlays, in drawing order (bottom to top).
 * Sources as used on map.openseamap.org.
 */
export const OVERLAYS: Overlay[] = [
  {
    id: 'gebco',
    kind: 'wms',
    label: 'Wassertiefe (GEBCO)',
    description: 'Flächige Tiefendarstellung, weltweit',
    icon: Waves,
    defaultOn: false,
    url: 'https://geoserver.openseamap.org/geoserver/gwc/service/wms',
    layers: 'gebco2021:gebco_2021',
    opacity: 0.8,
    attribution: 'GEBCO Compilation Group (2021)',
  },
  {
    id: 'contours',
    kind: 'wms',
    label: 'Tiefenlinien',
    description: 'Tiefenlinien aus Crowdsourcing-Daten',
    icon: LineChart,
    defaultOn: false,
    url: 'https://depth.openseamap.org/geoserver/openseamap/wms',
    layers: 'openseamap:contour2,openseamap:contour',
    attribution: OSM_DEPTH_ATTRIBUTION,
  },
  {
    id: 'depthPoints10',
    kind: 'wms',
    label: 'Tiefen-Messpunkte 10 m',
    description: 'Gemessene Tiefen bis 10 m (Flachwasser)',
    icon: Waves,
    defaultOn: false,
    group: 'depthPoints',
    url: 'https://depth.openseamap.org/geoserver/openseamap/wms',
    layers: 'openseamap:tracks_10m',
    attribution: OSM_DEPTH_ATTRIBUTION,
  },
  {
    id: 'depthPoints100',
    kind: 'wms',
    label: 'Tiefen-Messpunkte 100 m',
    description: 'Gemessene Tiefen bis 100 m',
    icon: Waves,
    defaultOn: false,
    group: 'depthPoints',
    url: 'https://depth.openseamap.org/geoserver/openseamap/wms',
    layers: 'openseamap:tracks_100m',
    attribution: OSM_DEPTH_ATTRIBUTION,
  },
  {
    id: 'seamarks',
    kind: 'xyz',
    label: 'Seezeichen',
    description: 'Tonnen, Leuchtfeuer, Häfen, Gefahrenstellen',
    icon: Anchor,
    defaultOn: true,
    url: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openseamap.org">OpenSeaMap</a>',
    maxNativeZoom: 18,
  },
  {
    id: 'sport',
    kind: 'xyz',
    label: 'Wassersport',
    description: 'Marinas, Slipanlagen, Kanu, Tauchen u. a.',
    icon: Sailboat,
    defaultOn: false,
    url: 'https://tiles.openseamap.org/sport/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openseamap.org">OpenSeaMap</a>',
    maxNativeZoom: 18,
  },
  {
    id: 'grid',
    kind: 'grid',
    label: 'Koordinatengitter',
    description: 'Breiten- und Längengrade mit Beschriftung',
    icon: Grid3x3,
    defaultOn: false,
  },
];

export const LAYERS_ICON = Layers;

export type LayerState = Partial<Record<OverlayId, boolean>>;

export function isLayerOn(state: LayerState | undefined, o: Overlay): boolean {
  return state?.[o.id] ?? o.defaultOn;
}

/** Toggle an overlay; switching one on switches off others of the same group. */
export function toggleLayer(state: LayerState | undefined, id: OverlayId): LayerState {
  const target = OVERLAYS.find((o) => o.id === id);
  if (!target) return { ...state };
  const on = !isLayerOn(state, target);
  const next: LayerState = { ...state, [id]: on };
  if (on && target.group) {
    for (const o of OVERLAYS) if (o.group === target.group && o.id !== id) next[o.id] = false;
  }
  return next;
}

const GRID_STEPS_DEG = [30, 10, 5, 2, 1, 30 / 60, 10 / 60, 5 / 60, 2 / 60, 1 / 60, 0.5 / 60, 0.2 / 60, 0.1 / 60];

/** Pick the finest graticule spacing (degrees) whose lines are at least `minPx` apart. */
export function gridStep(pxPerDeg: number, minPx = 90): number {
  let best = GRID_STEPS_DEG[0];
  for (const s of GRID_STEPS_DEG) if (s * pxPerDeg >= minPx) best = s;
  return best;
}

/** Label for a grid line, e.g. 54°30′N or 010°05′E. */
export function gridLabel(value: number, axis: 'lat' | 'lon', step: number): string {
  const hemi = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  const abs = Math.abs(value);
  let deg = Math.floor(abs + 1e-9);
  let min = (abs - deg) * 60;
  if (min > 59.99) {
    deg += 1;
    min = 0;
  }
  const degStr = String(deg).padStart(axis === 'lat' ? 2 : 3, '0');
  if (step >= 1) return `${degStr}°${hemi}`;
  const minStr = step * 60 < 1 ? min.toFixed(1).padStart(4, '0') : String(Math.round(min)).padStart(2, '0');
  return `${degStr}°${minStr}′${hemi}`;
}
