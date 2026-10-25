import { db, type Route, type Trip } from '../db/db';
import { loadSettings } from '../db/settings';
import { entriesToCsv, trackToCsv } from './csv';
import { routeToGpx, tripToGpx } from './gpx';
import { tripToPdf } from './pdf';
import { fileStamp, safeName, shareOrDownload } from './share';
import { createBackup } from './backup';

export type ExportFormat = 'pdf' | 'csv' | 'track-csv' | 'gpx';

async function tripData(trip: Trip) {
  const id = trip.id!;
  const [points, entries] = await Promise.all([
    db.trackPoints.where('[tripId+ts]').between([id, -Infinity], [id, Infinity]).toArray(),
    db.logEntries.where('tripId').equals(id).sortBy('ts'),
  ]);
  return { points, entries };
}

export async function exportTrip(trip: Trip, format: ExportFormat) {
  const { points, entries } = await tripData(trip);
  const base = `${safeName(trip.name)}_${fileStamp(trip.startedAt)}`;
  switch (format) {
    case 'pdf': {
      const { boatName } = await loadSettings();
      const blob = await tripToPdf(trip, entries, boatName);
      return shareOrDownload(blob, `${base}.pdf`, trip.name);
    }
    case 'csv':
      return shareOrDownload(new Blob([entriesToCsv(entries, [trip])], { type: 'text/csv' }), `${base}_logbuch.csv`, trip.name);
    case 'track-csv':
      return shareOrDownload(new Blob([trackToCsv(points)], { type: 'text/csv' }), `${base}_track.csv`, trip.name);
    case 'gpx':
      return shareOrDownload(new Blob([tripToGpx(trip, points, entries)], { type: 'application/gpx+xml' }), `${base}.gpx`, trip.name);
  }
}

export async function exportAllEntriesCsv() {
  const [entries, trips] = await Promise.all([db.logEntries.toArray(), db.trips.toArray()]);
  return shareOrDownload(new Blob([entriesToCsv(entries, trips)], { type: 'text/csv' }), `fahrtenbuch_${fileStamp()}.csv`, 'Fahrtenbuch');
}

export async function exportBackup() {
  const backup = await createBackup();
  return shareOrDownload(new Blob([JSON.stringify(backup)], { type: 'application/json' }), `fahrtenbuch_backup_${fileStamp()}.json`, 'Fahrtenbuch Sicherung');
}

export async function exportRouteGpx(route: Route) {
  const blob = new Blob([routeToGpx(route)], { type: 'application/gpx+xml' });
  return shareOrDownload(blob, `route_${safeName(route.name)}.gpx`, route.name);
}
