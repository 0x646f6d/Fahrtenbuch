import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, LocateFixed, Navigation, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { showToast } from '../components/toast';
import { db, type Place } from '../db/db';
import { fmtDateTime } from '../export/format';
import { parseGpxRoutes } from '../export/gpx';
import { distanceNm, formatPosition } from '../gps/nav';
import { goTo, stopRoute, useRouteNav } from '../route/active';
import { routeDistanceNm } from '../route/routeNav';
import { createRoute, savePlace } from '../route/routes';
import { useLive } from '../store/liveStore';

export function RoutesScreen() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const active = useRouteNav((s) => s.active);
  const fix = useLive((s) => s.fix);
  const routes = useLiveQuery(() => db.routes.orderBy('updatedAt').reverse().toArray(), [], []);
  const places = useLiveQuery(() => db.places.orderBy('name').toArray(), [], []);

  const newRoute = async () => {
    const id = await createRoute(`Route ${routes.length + 1}`);
    navigate(`/routen/${id}`);
  };

  const onImport = async (file: File) => {
    try {
      const parsed = parseGpxRoutes(await file.text(), file.name.replace(/\.gpx$/i, ''));
      if (parsed.length === 0) throw new Error('Keine Route oder Wegpunkte in der Datei');
      let lastId = 0;
      for (const r of parsed) lastId = await createRoute(r.name, r.points);
      showToast(parsed.length === 1 ? `Route „${parsed[0].name}“ importiert` : `${parsed.length} Routen importiert`);
      if (parsed.length === 1) navigate(`/routen/${lastId}`);
    } catch (e) {
      showToast(`Import fehlgeschlagen: ${(e as Error).message}`);
    }
  };

  const rememberHere = async () => {
    if (!fix) {
      showToast('Keine GPS-Position');
      return;
    }
    const name = prompt('Name des Ortes (z. B. Bucht, Hafen)');
    if (!name) return;
    await savePlace({ lat: fix.lat, lon: fix.lon, name });
    showToast(`„${name}“ gemerkt`);
  };

  const renamePlace = async (p: Place) => {
    const name = prompt('Name des Ortes', p.name);
    if (name) await db.places.update(p.id!, { name });
  };

  const removePlace = async (p: Place) => {
    if (confirm(`Ort „${p.name}“ löschen?`)) await db.places.delete(p.id!);
  };

  const goToPlace = (p: Place) => {
    goTo({ lat: p.lat, lon: p.lon, name: p.name });
    navigate('/');
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Routen</h1>
      </div>

      {active && (
        <div className="active-route">
          <Navigation size={24} />
          <span className="trip-main">
            <strong>{active.name}</strong>
            <span>Navigation aktiv · Wegpunkt {active.target + 1} von {active.points.length}</span>
          </span>
          <button className="secondary" onClick={stopRoute}>Beenden</button>
        </div>
      )}

      <div className="export-grid">
        <button onClick={newRoute}><Plus size={28} />Neue Route</button>
        <button onClick={() => fileRef.current?.click()}><Upload size={28} />GPX importieren</button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".gpx,application/gpx+xml,application/xml,text/xml"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void onImport(f);
        }}
      />

      <h2>Gespeicherte Routen</h2>
      {routes.length === 0 && <p className="hint">Noch keine Routen. Lege eine neue an und tippe auf der Karte Wegpunkte.</p>}
      <ul className="trip-list">
        {routes.map((r) => (
          <li key={r.id}>
            <Link to={`/routen/${r.id}`} className={`trip-row ${active?.routeId === r.id ? 'active' : ''}`}>
              <span className="trip-main">
                <strong>{r.name}</strong>
                <span>
                  {r.points.length} Wegpunkte · geändert {fmtDateTime(r.updatedAt)}
                </span>
              </span>
              <span className="trip-stats">
                <strong>{routeDistanceNm(r.points).toFixed(1)} sm</strong>
              </span>
              <ChevronRight />
            </Link>
          </li>
        ))}
      </ul>

      <h2>Orte</h2>
      <p className="hint">Buchten, Häfen und Ankerplätze – „Ziel“ navigiert direkt von der aktuellen Position dorthin.</p>
      <ul className="trip-list">
        {places.map((p) => (
          <li key={p.id} className="trip-row">
            <span className="trip-main">
              <strong>{p.name}</strong>
              <span className="mono">
                {formatPosition(p.lat, p.lon)}
                {fix && ` · ${distanceNm(fix, p).toFixed(1)} sm`}
              </span>
            </span>
            <button className="icon-button" onClick={() => renamePlace(p)} aria-label="Umbenennen"><Pencil size={22} /></button>
            <button className="icon-button danger" onClick={() => removePlace(p)} aria-label="Löschen"><Trash2 size={22} /></button>
            <button className="primary" onClick={() => goToPlace(p)}><Navigation size={20} />Ziel</button>
          </li>
        ))}
      </ul>
      <button className="secondary big-button" onClick={rememberHere}>
        <LocateFixed size={24} /> Aktuelle Position merken
      </button>
      <p className="hint">
        Tipp: Lange auf die Karte drücken, um direkt zu einem Punkt zu navigieren. Kurslinien werden nicht auf Land,
        Untiefen oder Hindernisse geprüft – die sichere Linie liegt in der Verantwortung der Schiffsführung.
      </p>
    </div>
  );
}
