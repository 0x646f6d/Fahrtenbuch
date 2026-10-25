import { Crosshair, Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MapContainer, useMap, useMapEvents } from 'react-leaflet';
import { showToast } from '../components/toast';
import { BaseLayers, BoatMarker, EntryMarkers, TrackLine } from '../components/TrackLayers';
import { useTrack, useTripEntries } from '../db/hooks';
import { saveSetting, useSettings } from '../db/settings';
import { endTrip, startTrip } from '../gps/service';
import { useLive } from '../store/liveStore';

function Follow({ follow, onUserMove }: { follow: boolean; onUserMove: () => void }) {
  const map = useMap();
  const fix = useLive((s) => s.fix);
  useMapEvents({ dragstart: onUserMove });
  useEffect(() => {
    if (follow && fix) map.panTo([fix.lat, fix.lon], { animate: true });
  }, [follow, fix, map]);
  return null;
}

export function MapScreen() {
  const fix = useLive((s) => s.fix);
  const activeTripId = useLive((s) => s.activeTripId);
  const settings = useSettings();
  const [follow, setFollow] = useState(settings.followBoat);
  const track = useTrack(activeTripId);
  const entries = useTripEntries(activeTripId);
  const [busy, setBusy] = useState(false);

  const setFollowing = (v: boolean) => {
    setFollow(v);
    void saveSetting('followBoat', v);
  };

  const toggleTrip = async () => {
    setBusy(true);
    try {
      if (activeTripId == null) {
        await startTrip();
        showToast('Fahrt gestartet – Track wird aufgezeichnet');
      } else if (confirm('Fahrt beenden?')) {
        await endTrip();
        showToast('Fahrt beendet');
      }
    } finally {
      setBusy(false);
    }
  };

  const center: [number, number] = fix ? [fix.lat, fix.lon] : [47.5, 13.5];

  return (
    <div className="map-screen">
      <MapContainer center={center} zoom={fix ? 14 : 6} className="map" zoomControl={false}>
        <BaseLayers />
        <TrackLine points={track} />
        <EntryMarkers entries={entries} />
        {fix && <BoatMarker lat={fix.lat} lon={fix.lon} cog={fix.cog} />}
        <Follow follow={follow} onUserMove={() => setFollowing(false)} />
      </MapContainer>
      <div className="map-controls">
        <button
          className={`fab ${follow ? 'active' : ''}`}
          onClick={() => setFollowing(!follow)}
          aria-label="Karte folgt Boot"
          title="Karte folgt Boot"
        >
          <Crosshair size={28} />
        </button>
      </div>
      <button className={`trip-button ${activeTripId != null ? 'stop' : 'start'}`} onClick={toggleTrip} disabled={busy}>
        {activeTripId != null ? <Square size={24} /> : <Play size={24} />}
        {activeTripId != null ? 'Fahrt beenden' : 'Fahrt starten'}
      </button>
    </div>
  );
}
