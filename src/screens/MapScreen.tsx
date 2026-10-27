import { Crosshair, Layers, Signpost, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, useMap, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { BoatMarker, EntryMarkers, TrackLine } from '../components/TrackLayers';
import { LayerToggles } from '../map/LayerToggles';
import { MapLayers } from '../map/MapLayers';
import { useTrack, useTripEntries } from '../db/hooks';
import { saveSetting, useSettings } from '../db/settings';
import { formatPosition } from '../gps/nav';
import { goTo } from '../route/active';
import { ActiveRouteLayer } from '../route/RouteLayers';
import { useLive } from '../store/liveStore';

function Follow({ follow, onUserMove }: { follow: boolean; onUserMove: () => void }) {
  const map = useMap();
  const fix = useLive((s) => s.fix);
  const centered = useRef(false);
  useMapEvents({ dragstart: onUserMove });
  useEffect(() => {
    if (!fix) return;
    if (!centered.current) {
      // first fix after opening the map: jump there at a useful zoom
      centered.current = true;
      if (map.getZoom() < 12) map.setView([fix.lat, fix.lon], 14);
      return;
    }
    if (follow) map.panTo([fix.lat, fix.lon], { animate: true });
  }, [follow, fix, map]);
  return null;
}

/** Long press (contextmenu) on the map: navigate straight to that point. */
function DirectTo() {
  useMapEvents({
    contextmenu: (e) => {
      const { lat, lng } = e.latlng;
      const name = formatPosition(lat, lng);
      if (confirm(`Direkt zu ${name} navigieren?`)) goTo({ lat, lon: lng, name: 'Ziel' });
    },
  });
  return null;
}

export function MapScreen() {
  const navigate = useNavigate();
  const fix = useLive((s) => s.fix);
  const activeTripId = useLive((s) => s.activeTripId);
  const settings = useSettings();
  const [follow, setFollow] = useState(settings.followBoat);
  const track = useTrack(activeTripId);
  const entries = useTripEntries(activeTripId);
  const [layersOpen, setLayersOpen] = useState(false);

  const setFollowing = (v: boolean) => {
    setFollow(v);
    void saveSetting('followBoat', v);
  };

  const center: [number, number] = fix ? [fix.lat, fix.lon] : [47.5, 13.5];

  return (
    <div className="map-screen">
      <MapContainer center={center} zoom={fix ? 14 : 6} className="map" zoomControl={false}>
        <MapLayers />
        <TrackLine points={track} />
        <EntryMarkers entries={entries} />
        <ActiveRouteLayer />
        <DirectTo />
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
        <button className="fab" onClick={() => setLayersOpen(true)} aria-label="Kartenebenen" title="Kartenebenen">
          <Layers size={28} />
        </button>
        <button className="fab" onClick={() => navigate('/routen')} aria-label="Routen" title="Routen planen">
          <Signpost size={28} />
        </button>
      </div>
      {layersOpen && (
        <div className="sheet-backdrop" onClick={() => setLayersOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Kartenebenen">
            <div className="sheet-header">
              <h2>Kartenebenen</h2>
              <button className="icon-button" onClick={() => setLayersOpen(false)} aria-label="Schließen">
                <X size={28} />
              </button>
            </div>
            <LayerToggles />
          </div>
        </div>
      )}
    </div>
  );
}
