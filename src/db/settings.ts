import { useLiveQuery } from 'dexie-react-hooks';
import type { LayerState } from '../map/layers';
import { db, type RoutePoint } from './db';

/** Route being navigated – a snapshot so a direct-to target needs no saved route. */
export interface ActiveRoute {
  /** saved route this was started from, null for a direct-to */
  routeId: number | null;
  name: string;
  points: RoutePoint[];
  /** index of the waypoint we are heading for */
  target: number;
  /** start of the current leg */
  from: { lat: number; lon: number } | null;
}

export interface Settings {
  boatName: string;
  logIntervalSec: number;
  theme: 'day' | 'night';
  followBoat: boolean;
  mapLayers: LayerState;
  activeRoute: ActiveRoute | null;
  /** arrival circle around waypoints */
  arrivalRadiusNm: number;
}

export const DEFAULT_SETTINGS: Settings = {
  boatName: '',
  logIntervalSec: 5,
  theme: 'day',
  followBoat: true,
  mapLayers: {},
  activeRoute: null,
  arrivalRadiusNm: 0.1,
};

export async function loadSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out as unknown as Settings;
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await db.settings.put({ key, value });
}

export function useSettings(): Settings {
  return useLiveQuery(loadSettings, [], DEFAULT_SETTINGS);
}
