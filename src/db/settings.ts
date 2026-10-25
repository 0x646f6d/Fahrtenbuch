import { useLiveQuery } from 'dexie-react-hooks';
import type { LayerState } from '../map/layers';
import { db } from './db';

export interface Settings {
  boatName: string;
  logIntervalSec: number;
  theme: 'day' | 'night';
  followBoat: boolean;
  mapLayers: LayerState;
}

export const DEFAULT_SETTINGS: Settings = {
  boatName: '',
  logIntervalSec: 5,
  theme: 'day',
  followBoat: true,
  mapLayers: {},
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
