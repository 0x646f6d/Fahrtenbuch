import {
  db,
  type EntryUsage,
  type LogEntry,
  type Place,
  type Route,
  type Setting,
  type TrackPoint,
  type Trip,
} from '../db/db';

export interface Backup {
  app: 'fahrtenbuch';
  /** 1 = without routes/places, 2 = with routes/places */
  version: 1 | 2;
  exportedAt: string;
  trips: Trip[];
  trackPoints: TrackPoint[];
  logEntries: LogEntry[];
  entryUsage: EntryUsage[];
  settings: Setting[];
  routes?: Route[];
  places?: Place[];
}

export async function createBackup(): Promise<Backup> {
  const [trips, trackPoints, logEntries, entryUsage, settings, routes, places] = await Promise.all([
    db.trips.toArray(),
    db.trackPoints.toArray(),
    db.logEntries.toArray(),
    db.entryUsage.toArray(),
    db.settings.toArray(),
    db.routes.toArray(),
    db.places.toArray(),
  ]);
  return {
    app: 'fahrtenbuch',
    version: 2,
    exportedAt: new Date().toISOString(),
    trips,
    trackPoints,
    logEntries,
    entryUsage,
    settings,
    routes,
    places,
  };
}

/** Replace all data with the content of a backup. */
export async function restoreBackup(json: string): Promise<void> {
  const data = JSON.parse(json) as Partial<Backup>;
  if (data.app !== 'fahrtenbuch' || !Array.isArray(data.trips)) throw new Error('Keine gültige Fahrtenbuch-Sicherung');
  const tables = [db.trips, db.trackPoints, db.logEntries, db.entryUsage, db.settings, db.routes, db.places];
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()));
    await db.trips.bulkAdd(data.trips ?? []);
    await db.trackPoints.bulkAdd(data.trackPoints ?? []);
    await db.logEntries.bulkAdd(data.logEntries ?? []);
    await db.entryUsage.bulkAdd(data.entryUsage ?? []);
    await db.settings.bulkAdd(data.settings ?? []);
    await db.routes.bulkAdd(data.routes ?? []);
    await db.places.bulkAdd(data.places ?? []);
  });
}
