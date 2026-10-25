import { db, type EntryUsage, type LogEntry, type Setting, type TrackPoint, type Trip } from '../db/db';

export interface Backup {
  app: 'fahrtenbuch';
  version: 1;
  exportedAt: string;
  trips: Trip[];
  trackPoints: TrackPoint[];
  logEntries: LogEntry[];
  entryUsage: EntryUsage[];
  settings: Setting[];
}

export async function createBackup(): Promise<Backup> {
  const [trips, trackPoints, logEntries, entryUsage, settings] = await Promise.all([
    db.trips.toArray(),
    db.trackPoints.toArray(),
    db.logEntries.toArray(),
    db.entryUsage.toArray(),
    db.settings.toArray(),
  ]);
  return { app: 'fahrtenbuch', version: 1, exportedAt: new Date().toISOString(), trips, trackPoints, logEntries, entryUsage, settings };
}

/** Replace all data with the content of a backup. */
export async function restoreBackup(json: string): Promise<void> {
  const data = JSON.parse(json) as Partial<Backup>;
  if (data.app !== 'fahrtenbuch' || !Array.isArray(data.trips)) throw new Error('Keine gültige Fahrtenbuch-Sicherung');
  await db.transaction('rw', [db.trips, db.trackPoints, db.logEntries, db.entryUsage, db.settings], async () => {
    await Promise.all([db.trips.clear(), db.trackPoints.clear(), db.logEntries.clear(), db.entryUsage.clear(), db.settings.clear()]);
    await db.trips.bulkAdd(data.trips ?? []);
    await db.trackPoints.bulkAdd(data.trackPoints ?? []);
    await db.logEntries.bulkAdd(data.logEntries ?? []);
    await db.entryUsage.bulkAdd(data.entryUsage ?? []);
    await db.settings.bulkAdd(data.settings ?? []);
  });
}
