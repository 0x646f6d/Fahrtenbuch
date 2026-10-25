import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { EntryList } from '../components/EntryList';
import { db } from '../db/db';
import { useLive } from '../store/liveStore';

type Filter = 'current' | 'all' | number;

export function LogbookScreen() {
  const activeTripId = useLive((s) => s.activeTripId);
  const trips = useLiveQuery(() => db.trips.orderBy('startedAt').reverse().toArray(), [], []);
  const [filter, setFilter] = useState<Filter>('current');

  const tripId = filter === 'current' ? (activeTripId ?? trips[0]?.id ?? null) : filter === 'all' ? null : filter;
  const entries = useLiveQuery(
    async () => {
      const list = filter === 'all' || tripId == null ? await db.logEntries.toArray() : await db.logEntries.where('tripId').equals(tripId).toArray();
      return list.sort((a, b) => b.ts - a.ts);
    },
    [filter, tripId],
    [],
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Logbuch</h1>
        <select
          className="trip-select"
          value={String(filter)}
          onChange={(e) => {
            const v = e.target.value;
            setFilter(v === 'current' || v === 'all' ? v : Number(v));
          }}
        >
          <option value="current">{activeTripId != null ? 'Aktuelle Fahrt' : 'Letzte Fahrt'}</option>
          <option value="all">Alle Einträge</option>
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <EntryList entries={entries} />
    </div>
  );
}
