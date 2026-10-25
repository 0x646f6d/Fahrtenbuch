import Dexie, { type EntityTable, type Table } from 'dexie';

export interface Trip {
  id?: number;
  name: string;
  startedAt: number;
  endedAt?: number;
  distanceNm: number;
}

export interface TrackPoint {
  id?: number;
  tripId: number;
  ts: number;
  lat: number;
  lon: number;
  /** speed over ground in knots */
  sog: number | null;
  /** course over ground in degrees */
  cog: number | null;
  accuracy: number;
  /** true if this point starts a new segment (gap before it) */
  gap?: boolean;
}

export type EntryValue = string | number;

export interface LogEntry {
  id?: number;
  tripId: number | null;
  ts: number;
  type: string;
  lat: number | null;
  lon: number | null;
  sog: number | null;
  cog: number | null;
  data: Record<string, EntryValue>;
  note?: string;
}

export interface EntryUsage {
  type: string;
  count: number;
  lastUsed: number;
}

export interface RoutePoint {
  lat: number;
  lon: number;
  name: string;
}

export interface Route {
  id?: number;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** waypoints in order; the last one is the destination */
  points: RoutePoint[];
}

/** Saved spot (bay, harbour, anchorage) that can be reused in routes. */
export interface Place {
  id?: number;
  name: string;
  lat: number;
  lon: number;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

export const db = new Dexie('fahrtenbuch') as Dexie & {
  trips: EntityTable<Trip, 'id'>;
  trackPoints: EntityTable<TrackPoint, 'id'>;
  logEntries: EntityTable<LogEntry, 'id'>;
  entryUsage: EntityTable<EntryUsage, 'type'>;
  settings: EntityTable<Setting, 'key'>;
  routes: EntityTable<Route, 'id'>;
  places: EntityTable<Place, 'id'>;
};

db.version(1).stores({
  trips: '++id, startedAt, endedAt',
  trackPoints: '++id, tripId, [tripId+ts]',
  logEntries: '++id, tripId, ts, type',
  entryUsage: 'type',
  settings: 'key',
});

db.version(2).stores({
  routes: '++id, updatedAt',
  places: '++id, name',
});

export async function clearAllData(keepSettings = true): Promise<void> {
  const tables: Table[] = [db.trips, db.trackPoints, db.logEntries, db.entryUsage, db.routes, db.places];
  if (!keepSettings) tables.push(db.settings);
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()));
  });
}

export async function deleteTrip(tripId: number): Promise<void> {
  await db.transaction('rw', db.trips, db.trackPoints, db.logEntries, async () => {
    await db.trackPoints.where('tripId').equals(tripId).delete();
    await db.logEntries.where('tripId').equals(tripId).delete();
    await db.trips.delete(tripId);
  });
}

export async function getActiveTrip(): Promise<Trip | undefined> {
  const trips = await db.trips.orderBy('startedAt').reverse().toArray();
  return trips.find((t) => t.endedAt === undefined);
}

export async function recordUsage(type: string): Promise<void> {
  await db.transaction('rw', db.entryUsage, async () => {
    const existing = await db.entryUsage.get(type);
    await db.entryUsage.put({
      type,
      count: (existing?.count ?? 0) + 1,
      lastUsed: Date.now(),
    });
  });
}

export async function unrecordUsage(type: string): Promise<void> {
  const existing = await db.entryUsage.get(type);
  if (!existing) return;
  if (existing.count <= 1) await db.entryUsage.delete(type);
  else await db.entryUsage.put({ ...existing, count: existing.count - 1 });
}
