import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LogEntry, type TrackPoint } from './db';

const EMPTY_POINTS: TrackPoint[] = [];
const EMPTY_ENTRIES: LogEntry[] = [];

export function useTrack(tripId: number | null | undefined): TrackPoint[] {
  return useLiveQuery(
    () =>
      tripId == null
        ? EMPTY_POINTS
        : db.trackPoints.where('[tripId+ts]').between([tripId, -Infinity], [tripId, Infinity]).toArray(),
    [tripId],
    EMPTY_POINTS,
  );
}

export function useTripEntries(tripId: number | null | undefined): LogEntry[] {
  return useLiveQuery(
    () => (tripId == null ? EMPTY_ENTRIES : db.logEntries.where('tripId').equals(tripId).sortBy('ts')),
    [tripId],
    EMPTY_ENTRIES,
  );
}
