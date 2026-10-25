import { useEffect, useState } from 'react';
import { formatCourse, formatDuration, formatLat, formatLon } from '../gps/nav';
import { useLive, type GpsStatus } from '../store/liveStore';

const STATUS_TEXT: Record<GpsStatus, string> = {
  idle: 'GPS aus',
  searching: 'Suche GPS…',
  ok: 'GPS',
  denied: 'GPS verweigert',
  unavailable: 'kein GPS',
  error: 'GPS-Fehler',
};

function useNow(intervalMs: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function StatusBar() {
  const { fix, status, activeTripId, tripStartedAt, tripDistanceNm } = useLive();
  const now = useNow(1000);
  const stale = fix != null && now - fix.ts > 15_000;
  const gpsClass = status !== 'ok' ? 'bad' : stale || (fix && fix.accuracy > 25) ? 'warn' : 'good';

  return (
    <header className="statusbar">
      <div className="stat big">
        <span className="label caps">SOG</span>
        <span className="value">{fix?.sog != null ? fix.sog.toFixed(1) : '–'}<small> kn</small></span>
      </div>
      <div className="stat big">
        <span className="label caps">COG</span>
        <span className="value">{formatCourse(fix?.cog)}</span>
      </div>
      <div className="stat pos">
        <span className="value mono">{fix ? formatLat(fix.lat) : '–'}</span>
        <span className="value mono">{fix ? formatLon(fix.lon) : '–'}</span>
      </div>
      <div className="stat trip">
        {activeTripId != null && tripStartedAt != null ? (
          <>
            <span className="value">{tripDistanceNm.toFixed(1)}<small> sm</small></span>
            <span className="sub">{formatDuration(now - tripStartedAt)}</span>
          </>
        ) : (
          <span className="label">keine Fahrt</span>
        )}
      </div>
      <div className="stat gps">
        <span className={`gps-dot ${gpsClass}`} title={STATUS_TEXT[status]} />
        <span className="sub">
          {status === 'ok' && fix ? `±${Math.round(fix.accuracy)} m` : STATUS_TEXT[status]}
        </span>
        <span className="sub">{new Date(now).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </header>
  );
}
