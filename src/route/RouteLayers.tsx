import L from 'leaflet';
import { useMemo } from 'react';
import { CircleMarker, Marker, Polyline } from 'react-leaflet';
import type { RoutePoint } from '../db/db';
import { useLive } from '../store/liveStore';
import { useRouteNav } from './active';

const ROUTE_COLOR = '#7b2cbf';

export function waypointIcon(label: string, state: 'normal' | 'target' | 'done' = 'normal'): L.DivIcon {
  return L.divIcon({
    className: `wp-icon ${state}`,
    html: `<span>${label}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

/** The route being navigated plus a line from the boat to the target waypoint. */
export function ActiveRouteLayer() {
  const active = useRouteNav((s) => s.active);
  const fix = useLive((s) => s.fix);
  const positions = useMemo(
    () => (active ? active.points.map((p) => [p.lat, p.lon] as [number, number]) : []),
    [active],
  );
  if (!active) return null;
  const target = active.points[active.target];
  return (
    <>
      <Polyline positions={positions} pathOptions={{ color: ROUTE_COLOR, weight: 3, dashArray: '8 8', opacity: 0.9 }} />
      {fix && (
        <Polyline
          positions={[[fix.lat, fix.lon], [target.lat, target.lon]]}
          pathOptions={{ color: ROUTE_COLOR, weight: 2, opacity: 0.6 }}
          interactive={false}
        />
      )}
      {active.points.map((p, i) => (
        <WaypointMarker
          key={i}
          point={p}
          label={String(i + 1)}
          state={i === active.target ? 'target' : i < active.target ? 'done' : 'normal'}
        />
      ))}
    </>
  );
}

function WaypointMarker({ point, label, state }: { point: RoutePoint; label: string; state: 'normal' | 'target' | 'done' }) {
  const icon = useMemo(() => waypointIcon(label, state), [label, state]);
  return <Marker position={[point.lat, point.lon]} icon={icon} interactive={false} />;
}

/** Static preview of a route (e.g. in lists or trip maps). */
export function RouteLine({ points }: { points: RoutePoint[] }) {
  return (
    <>
      <Polyline
        positions={points.map((p) => [p.lat, p.lon] as [number, number])}
        pathOptions={{ color: ROUTE_COLOR, weight: 3, dashArray: '8 8' }}
      />
      {points.map((p, i) => (
        <CircleMarker key={i} center={[p.lat, p.lon]} radius={5} pathOptions={{ color: ROUTE_COLOR, fillOpacity: 1 }} />
      ))}
    </>
  );
}
