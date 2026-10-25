import { useLiveQuery } from 'dexie-react-hooks';
import L from 'leaflet';
import { ArrowLeft, FileDown, FileSpreadsheet, FileText, MapPinned, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import { useNavigate, useParams } from 'react-router-dom';
import { EntryList } from '../components/EntryList';
import { showToast } from '../components/toast';
import { BaseLayers, EntryMarkers, TrackLine } from '../components/TrackLayers';
import { db, deleteTrip, type TrackPoint } from '../db/db';
import { useTrack, useTripEntries } from '../db/hooks';
import { exportTrip, type ExportFormat } from '../export/exportTrip';
import { fmtDateTime } from '../export/format';
import { formatDuration } from '../gps/nav';
import { endTrip } from '../gps/service';
import { useLive } from '../store/liveStore';

function FitBounds({ points }: { points: TrackPoint[] }) {
  const map = useMap();
  const [fitted, setFitted] = useState(false);
  useEffect(() => {
    // fit once when points first arrive
    if (fitted || points.length === 0) return;
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lon])), { padding: [20, 20], maxZoom: 15 });
    setFitted(true);
  }, [fitted, points, map]);
  return null;
}

export function TripDetailScreen() {
  const navigate = useNavigate();
  const id = Number(useParams().id);
  const trip = useLiveQuery(() => db.trips.get(id), [id]);
  const points = useTrack(id);
  const entries = useTripEntries(id);
  const activeTripId = useLive((s) => s.activeTripId);
  const liveDistance = useLive((s) => s.tripDistanceNm);
  const [busy, setBusy] = useState(false);

  if (!trip) return <div className="page"><p>Lade…</p></div>;
  const active = trip.id === activeTripId;

  const doExport = async (f: ExportFormat) => {
    setBusy(true);
    try {
      const res = await exportTrip(active ? { ...trip, distanceNm: liveDistance } : trip, f);
      if (res === 'downloaded') showToast('Datei heruntergeladen');
    } catch (e) {
      showToast(`Export fehlgeschlagen: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const rename = async () => {
    const name = prompt('Name der Fahrt', trip.name);
    if (name) await db.trips.update(id, { name });
  };

  const remove = async () => {
    if (!confirm(`Fahrt „${trip.name}“ mit Track und allen Einträgen löschen?`)) return;
    if (active) await endTrip();
    await deleteTrip(id);
    showToast('Fahrt gelöscht');
    navigate('/fahrten');
  };

  return (
    <div className="page">
      <div className="page-header">
        <button className="icon-button" onClick={() => navigate(-1)} aria-label="Zurück"><ArrowLeft size={28} /></button>
        <h1>{trip.name}</h1>
        <button className="icon-button" onClick={rename} aria-label="Umbenennen"><Pencil size={24} /></button>
        <button className="icon-button danger" onClick={remove} aria-label="Löschen"><Trash2 size={24} /></button>
      </div>
      <div className="trip-summary">
        <div><span className="label">Beginn</span>{fmtDateTime(trip.startedAt)}</div>
        <div><span className="label">Ende</span>{trip.endedAt ? fmtDateTime(trip.endedAt) : 'läuft'}</div>
        <div><span className="label">Dauer</span>{formatDuration((trip.endedAt ?? Date.now()) - trip.startedAt)}</div>
        <div><span className="label">Distanz</span>{(active ? liveDistance : trip.distanceNm).toFixed(1)} sm</div>
      </div>
      {points.length > 0 && (
        <MapContainer className="trip-map" center={[points[0].lat, points[0].lon]} zoom={13}>
          <BaseLayers />
          <TrackLine points={points} />
          <EntryMarkers entries={entries} />
          <FitBounds points={points} />
        </MapContainer>
      )}
      <h2>Exportieren / Teilen</h2>
      <div className="export-grid">
        <button disabled={busy} onClick={() => doExport('pdf')}><FileText size={28} />PDF</button>
        <button disabled={busy} onClick={() => doExport('csv')}><FileSpreadsheet size={28} />CSV Logbuch</button>
        <button disabled={busy} onClick={() => doExport('gpx')}><MapPinned size={28} />GPX Track</button>
        <button disabled={busy} onClick={() => doExport('track-csv')}><FileDown size={28} />CSV Track</button>
      </div>
      <h2>Einträge</h2>
      <EntryList entries={[...entries].reverse()} />
    </div>
  );
}
