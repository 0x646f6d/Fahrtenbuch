import { useLiveQuery } from 'dexie-react-hooks';
import L from 'leaflet';
import {
  ArrowLeft,
  ArrowLeftRight,
  LocateFixed,
  MapPinned,
  Navigation,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { useNavigate, useParams } from 'react-router-dom';
import { showToast } from '../components/toast';
import { BoatMarker } from '../components/TrackLayers';
import { db, type RoutePoint } from '../db/db';
import { exportRouteGpx } from '../export/exportTrip';
import { formatCourse, formatPosition } from '../gps/nav';
import { MapLayers } from '../map/MapLayers';
import { activateRoute } from '../route/active';
import { waypointIcon } from '../route/RouteLayers';
import { routeDistanceNm, routeLegs } from '../route/routeNav';
import { deleteRoute, nextWaypointName, savePlace, updateRoute } from '../route/routes';
import { useLive } from '../store/liveStore';

function FitOnce({ points }: { points: RoutePoint[] }) {
  const map = useMap();
  const done = useRef(false);
  const fix = useLive((s) => s.fix);
  useEffect(() => {
    if (done.current) return;
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lon])), { padding: [30, 30], maxZoom: 14 });
      done.current = true;
    } else if (points.length === 1) {
      map.setView([points[0].lat, points[0].lon], 13);
      done.current = true;
    } else if (fix) {
      map.setView([fix.lat, fix.lon], 12);
      done.current = true;
    }
  }, [points, fix, map]);
  return null;
}

function AddOnClick({ onAdd }: { onAdd: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (e) => onAdd(e.latlng.lat, e.latlng.lng) });
  return null;
}

function DraggableWaypoint({ point, index, onMove }: { point: RoutePoint; index: number; onMove: (i: number, ll: L.LatLng) => void }) {
  const icon = useMemo(() => waypointIcon(String(index + 1)), [index]);
  return (
    <Marker
      position={[point.lat, point.lon]}
      icon={icon}
      draggable
      eventHandlers={{ dragend: (e) => onMove(index, (e.target as L.Marker).getLatLng()) }}
    >
      <Tooltip direction="top" offset={[0, -14]}>{point.name}</Tooltip>
    </Marker>
  );
}

export function RouteEditScreen() {
  const navigate = useNavigate();
  const id = Number(useParams().id);
  const route = useLiveQuery(() => db.routes.get(id), [id]);
  const places = useLiveQuery(() => db.places.orderBy('name').toArray(), [], []);
  const fix = useLive((s) => s.fix);
  const [insertOpen, setInsertOpen] = useState(false);

  if (route === undefined) return <div className="page"><p>Lade…</p></div>;
  const points = route.points;
  const legs = routeLegs(points);

  const setPoints = (next: RoutePoint[]) => updateRoute(id, { points: next });
  const add = (p: Omit<RoutePoint, 'name'> & { name?: string }) =>
    setPoints([...points, { lat: p.lat, lon: p.lon, name: p.name || nextWaypointName(points) }]);
  const insertAt = (i: number, p: RoutePoint) => setPoints([...points.slice(0, i), p, ...points.slice(i)]);
  const move = (i: number, ll: L.LatLng) => setPoints(points.map((p, j) => (j === i ? { ...p, lat: ll.lat, lon: ll.lng } : p)));
  const remove = (i: number) => setPoints(points.filter((_, j) => j !== i));

  const renameWp = (i: number) => {
    const name = prompt('Name des Wegpunkts', points[i].name);
    if (name) void setPoints(points.map((p, j) => (j === i ? { ...p, name } : p)));
  };

  const rememberWp = async (i: number) => {
    const name = prompt('Als Ort merken unter', points[i].name);
    if (!name) return;
    await savePlace({ ...points[i], name });
    showToast(`„${name}“ gemerkt`);
  };

  const rename = async () => {
    const name = prompt('Name der Route', route.name);
    if (name) await updateRoute(id, { name });
  };

  const removeRoute = async () => {
    if (!confirm(`Route „${route.name}“ löschen?`)) return;
    await deleteRoute(id);
    showToast('Route gelöscht');
    navigate('/routen');
  };

  const start = (target = 0) => {
    activateRoute(route, target);
    showToast(`Navigation: ${route.name}`);
    navigate('/');
  };

  const exportGpx = async () => {
    try {
      if ((await exportRouteGpx(route)) === 'downloaded') showToast('Datei heruntergeladen');
    } catch (e) {
      showToast(`Export fehlgeschlagen: ${(e as Error).message}`);
    }
  };

  const center: [number, number] = points[0] ? [points[0].lat, points[0].lon] : fix ? [fix.lat, fix.lon] : [47.5, 13.5];

  return (
    <div className="page route-edit">
      <div className="page-header">
        <button className="icon-button" onClick={() => navigate('/routen')} aria-label="Zurück"><ArrowLeft size={28} /></button>
        <h1>{route.name}</h1>
        <button className="icon-button" onClick={rename} aria-label="Umbenennen"><Pencil size={24} /></button>
        <button className="icon-button danger" onClick={removeRoute} aria-label="Löschen"><Trash2 size={24} /></button>
      </div>

      <MapContainer className="route-map" center={center} zoom={points.length || fix ? 12 : 6}>
        <MapLayers />
        <AddOnClick onAdd={(lat, lon) => void add({ lat, lon })} />
        <FitOnce points={points} />
        <Polyline positions={points.map((p) => [p.lat, p.lon] as [number, number])} pathOptions={{ color: '#7b2cbf', weight: 3 }} />
        {legs.map((l, i) => (
          <CircleMarker
            key={`mid${i}`}
            center={[(l.from.lat + l.to.lat) / 2, (l.from.lon + l.to.lon) / 2]}
            radius={8}
            pathOptions={{ color: '#7b2cbf', fillColor: '#fff', fillOpacity: 0.9, weight: 2 }}
            bubblingMouseEvents={false}
            eventHandlers={{
              click: () => {
                void insertAt(i + 1, {
                  lat: (l.from.lat + l.to.lat) / 2,
                  lon: (l.from.lon + l.to.lon) / 2,
                  name: nextWaypointName(points),
                });
              },
            }}
          >
            <Tooltip>Wegpunkt einfügen</Tooltip>
          </CircleMarker>
        ))}
        {points.map((p, i) => (
          <DraggableWaypoint key={`${i}-${p.lat}-${p.lon}`} point={p} index={i} onMove={move} />
        ))}
        {fix && <BoatMarker lat={fix.lat} lon={fix.lon} cog={fix.cog} />}
      </MapContainer>
      <p className="hint">
        Auf die Karte tippen fügt einen Wegpunkt am Ende an, Punkte lassen sich verschieben, ○ auf einer Linie fügt dazwischen
        ein. Keine Prüfung auf Land oder Untiefen!
      </p>

      <div className="route-summary">
        <strong>{points.length} Wegpunkte</strong>
        <strong>{routeDistanceNm(points).toFixed(1)} sm</strong>
      </div>

      <div className="export-grid">
        <button disabled={points.length === 0} onClick={() => start()}><Navigation size={28} />Navigation starten</button>
        <button onClick={() => setInsertOpen(true)}><Plus size={28} />Ort / Position anfügen</button>
        <button disabled={points.length < 2} onClick={() => setPoints([...points].reverse())}>
          <ArrowLeftRight size={28} />Umkehren
        </button>
        <button disabled={points.length === 0} onClick={exportGpx}><MapPinned size={28} />GPX</button>
      </div>

      <ol className="wp-list">
        {points.map((p, i) => (
          <li key={i} className="trip-row">
            <span className="wp-num">{i + 1}</span>
            <button className="trip-main wp-name" onClick={() => renameWp(i)}>
              <strong>{p.name}</strong>
              <span className="mono">{formatPosition(p.lat, p.lon)}</span>
              {i > 0 && (
                <span>
                  Kurs {formatCourse(legs[i - 1].course)} · {legs[i - 1].distanceNm.toFixed(1)} sm
                </span>
              )}
            </button>
            <button className="icon-button" onClick={() => start(i)} aria-label="Ab hier navigieren" title="Ab hier navigieren">
              <Navigation size={22} />
            </button>
            <button className="icon-button" onClick={() => rememberWp(i)} aria-label="Als Ort merken" title="Als Ort merken">
              <Star size={22} />
            </button>
            <button className="icon-button danger" onClick={() => remove(i)} aria-label="Wegpunkt löschen">
              <Trash2 size={22} />
            </button>
          </li>
        ))}
      </ol>

      {insertOpen && (
        <div className="sheet-backdrop fixed" onClick={() => setInsertOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Wegpunkt anfügen">
            <div className="sheet-header">
              <h2>Wegpunkt anfügen</h2>
              <button className="icon-button" onClick={() => setInsertOpen(false)} aria-label="Schließen"><X size={28} /></button>
            </div>
            <ul className="layer-list">
              <li>
                <button
                  className="layer-toggle"
                  disabled={!fix}
                  onClick={() => {
                    if (fix) void add({ lat: fix.lat, lon: fix.lon, name: 'Position' });
                    setInsertOpen(false);
                  }}
                >
                  <LocateFixed size={26} />
                  <span className="layer-text">
                    <strong>Aktuelle Position</strong>
                    <span>{fix ? formatPosition(fix.lat, fix.lon) : 'keine GPS-Position'}</span>
                  </span>
                </button>
              </li>
              {places.map((pl) => (
                <li key={pl.id}>
                  <button
                    className="layer-toggle"
                    onClick={() => {
                      void add({ lat: pl.lat, lon: pl.lon, name: pl.name });
                      setInsertOpen(false);
                    }}
                  >
                    <Star size={26} />
                    <span className="layer-text">
                      <strong>{pl.name}</strong>
                      <span className="mono">{formatPosition(pl.lat, pl.lon)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {places.length === 0 && <p className="hint">Noch keine Orte gemerkt (Stern bei einem Wegpunkt oder in der Routenliste).</p>}
          </div>
        </div>
      )}
    </div>
  );
}
