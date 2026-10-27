import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../db/db';
import { fmtDateTime } from '../export/format';
import { formatDuration } from '../gps/nav';
import { useLive } from '../store/liveStore';

export function TripsScreen() {
  const activeTripId = useLive((s) => s.activeTripId);
  const liveDistance = useLive((s) => s.tripDistanceNm);
  const trips = useLiveQuery(() => db.trips.orderBy('startedAt').reverse().toArray(), [], []);
  const counts = useLiveQuery(async () => {
    const m = new Map<number, number>();
    await db.logEntries.each((e) => {
      if (e.tripId != null) m.set(e.tripId, (m.get(e.tripId) ?? 0) + 1);
    });
    return m;
  }, [], new Map<number, number>());

  return (
    <div className="page">
      <div className="page-header">
        <h1>Fahrten</h1>
      </div>
      {trips.length === 0 && <p className="empty">Noch keine Fahrten. Eine Fahrt beginnt automatisch, sobald sich das Boot bewegt, oder über „Fahrtbeginn“ / „Ablegen“ im Logbuch.</p>}
      <ul className="trip-list">
        {trips.map((t) => {
          const active = t.id === activeTripId;
          const dist = active ? liveDistance : t.distanceNm;
          return (
            <li key={t.id}>
              <Link to={`/fahrten/${t.id}`} className={`trip-row ${active ? 'active' : ''}`}>
                <span className="trip-main">
                  <strong>{t.name}</strong>
                  <span>
                    {fmtDateTime(t.startedAt)} · {formatDuration((t.endedAt ?? Date.now()) - t.startedAt)}
                    {active && ' · läuft'}
                  </span>
                </span>
                <span className="trip-stats">
                  <strong>{dist.toFixed(1)} sm</strong>
                  <span>{counts.get(t.id!) ?? 0} Einträge</span>
                </span>
                <ChevronRight />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
