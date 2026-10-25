import { Check } from 'lucide-react';
import { saveSetting, useSettings } from '../db/settings';
import { isLayerOn, OVERLAYS, toggleLayer } from './layers';

export function LayerToggles() {
  const { mapLayers } = useSettings();
  return (
    <ul className="layer-list">
      {OVERLAYS.map((o) => {
        const on = isLayerOn(mapLayers, o);
        return (
          <li key={o.id}>
            <button
              className={`layer-toggle ${on ? 'on' : ''}`}
              role="switch"
              aria-checked={on}
              onClick={() => void saveSetting('mapLayers', toggleLayer(mapLayers, o.id))}
            >
              <o.icon size={26} />
              <span className="layer-text">
                <strong>{o.label}</strong>
                <span>{o.description}</span>
              </span>
              <span className="layer-check">{on && <Check size={22} strokeWidth={3} />}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
