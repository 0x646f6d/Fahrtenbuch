import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { gridLabel, gridStep } from './layers';

/** Latitude/longitude grid with labels at the map edges, redrawn on pan/zoom. */
export function Graticule() {
  const map = useMap();

  useEffect(() => {
    const group = L.layerGroup().addTo(map);
    const lineStyle: L.PolylineOptions = { color: '#0b2545', weight: 1, opacity: 0.45, interactive: false };

    const label = (text: string, at: L.LatLng, cls: string) =>
      L.marker(at, {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({ className: `grid-label ${cls}`, html: text, iconSize: undefined }),
      });

    const draw = () => {
      group.clearLayers();
      const b = map.getBounds();
      const south = Math.max(b.getSouth(), -85);
      const north = Math.min(b.getNorth(), 85);
      const west = b.getWest();
      const east = b.getEast();
      const size = map.getSize();
      // labels need more room horizontally, so use the tighter of both axes
      const step = gridStep(Math.min(size.y / (north - south), size.x / (east - west)));
      const eps = step / 1000;

      for (let lat = Math.ceil(south / step) * step; lat <= north + eps; lat += step) {
        group.addLayer(L.polyline([[lat, west], [lat, east]], lineStyle));
        group.addLayer(label(gridLabel(lat, 'lat', step), L.latLng(lat, west), 'lat'));
      }
      for (let lon = Math.ceil(west / step) * step; lon <= east + eps; lon += step) {
        group.addLayer(L.polyline([[south, lon], [north, lon]], lineStyle));
        const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
        group.addLayer(label(gridLabel(wrapped, 'lon', step), L.latLng(north, lon), 'lon'));
      }
    };

    draw();
    map.on('moveend', draw);
    return () => {
      map.off('moveend', draw);
      group.remove();
    };
  }, [map]);

  return null;
}
