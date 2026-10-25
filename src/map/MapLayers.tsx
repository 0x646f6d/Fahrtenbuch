import { TileLayer, WMSTileLayer } from 'react-leaflet';
import { useSettings } from '../db/settings';
import { Graticule } from './Graticule';
import { isLayerOn, OVERLAYS } from './layers';

/** OSM base map plus the OpenSeaMap overlays enabled in the settings. */
export function MapLayers() {
  const { mapLayers } = useSettings();
  return (
    <>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      {OVERLAYS.filter((o) => isLayerOn(mapLayers, o)).map((o) => {
        switch (o.kind) {
          case 'xyz':
            return (
              <TileLayer
                key={o.id}
                url={o.url}
                attribution={o.attribution}
                maxZoom={19}
                maxNativeZoom={o.maxNativeZoom}
                opacity={o.opacity ?? 1}
              />
            );
          case 'wms':
            return (
              <WMSTileLayer
                key={o.id}
                url={o.url}
                params={{ layers: o.layers, format: 'image/png', transparent: true, version: '1.1.1' }}
                attribution={o.attribution}
                opacity={o.opacity ?? 1}
                maxZoom={19}
              />
            );
          case 'grid':
            return <Graticule key={o.id} />;
        }
      })}
    </>
  );
}
