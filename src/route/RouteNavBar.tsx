import { ChevronLeft, ChevronRight, Navigation, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fmtTime } from '../export/format';
import { formatCourse } from '../gps/nav';
import { useLive } from '../store/liveStore';
import { setTarget, stopRoute, useRouteNav } from './active';
import { formatXte, navInfo } from './routeNav';

/** Strip below the status bar while a route is being navigated. */
export function RouteNavBar() {
  const active = useRouteNav((s) => s.active);
  const fix = useLive((s) => s.fix);
  const navigate = useNavigate();
  if (!active) return null;
  const wp = active.points[active.target];
  const info = fix
    ? navInfo({ points: active.points, target: active.target, from: active.from, pos: fix, sog: fix.sog, cog: fix.cog, now: fix.ts })
    : null;
  const count = active.points.length;

  const stop = () => {
    if (confirm('Navigation beenden?')) stopRoute();
  };

  return (
    <div className="routebar">
      {count > 1 && (
        <button
          className="routebar-btn hide-narrow"
          onClick={() => setTarget(active.target - 1)}
          disabled={active.target === 0}
          aria-label="Vorheriger Wegpunkt"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      <button className="routebar-target" onClick={() => navigate('/')}>
        <Navigation size={18} className="hide-narrow" />
        <span className="routebar-name">
          <strong>{wp.name}</strong>
          <small>{count > 1 ? `Wegpunkt ${active.target + 1}/${count}` : 'Ziel'}</small>
        </span>
      </button>
      <div className="routebar-stat">
        <span className="label">BTW</span>
        <span className="value">{info ? formatCourse(info.btw) : '–'}</span>
      </div>
      <div className="routebar-stat">
        <span className="label">DTW</span>
        <span className="value">{info ? `${info.dtw.toFixed(info.dtw < 10 ? 2 : 1)} sm` : '–'}</span>
      </div>
      <div className="routebar-stat hide-narrow">
        <span className="label">XTE</span>
        <span className="value">{formatXte(info?.xte ?? null)}</span>
      </div>
      <div className="routebar-stat">
        <span className="label">ETA</span>
        <span className="value">{info?.etaTarget ? fmtTime(info.etaTarget) : '–'}</span>
      </div>
      {count > 1 && (
        <button
          className="routebar-btn"
          onClick={() => setTarget(active.target + 1)}
          disabled={active.target === count - 1}
          aria-label="Nächster Wegpunkt"
        >
          <ChevronRight size={24} />
        </button>
      )}
      <button className="routebar-btn" onClick={stop} aria-label="Navigation beenden">
        <X size={24} />
      </button>
    </div>
  );
}
