import L from 'leaflet';
import { useMemo } from 'react';
import { CircleMarker, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import type { LogEntry, TrackPoint } from '../db/db';
import { entryLabel } from '../entries/entryTypes';
import { fmtTime } from '../export/format';

export function BaseLayers() {
  return (
    <>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <TileLayer
        url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openseamap.org">OpenSeaMap</a>'
        maxZoom={18}
      />
    </>
  );
}

export function toSegments(points: Pick<TrackPoint, 'lat' | 'lon' | 'gap'>[]): [number, number][][] {
  const segs: [number, number][][] = [];
  let cur: [number, number][] = [];
  for (const p of points) {
    if (p.gap && cur.length) {
      segs.push(cur);
      cur = [];
    }
    cur.push([p.lat, p.lon]);
  }
  if (cur.length) segs.push(cur);
  return segs;
}

export function TrackLine({ points }: { points: TrackPoint[] }) {
  const segments = useMemo(() => toSegments(points), [points]);
  return (
    <>
      {segments.map((seg, i) => (
        <Polyline key={i} positions={seg} pathOptions={{ color: '#e63946', weight: 4, opacity: 0.85 }} />
      ))}
    </>
  );
}

export function EntryMarkers({ entries }: { entries: LogEntry[] }) {
  return (
    <>
      {entries
        .filter((e) => e.lat != null && e.lon != null)
        .map((e) => (
          <CircleMarker
            key={e.id}
            center={[e.lat!, e.lon!]}
            radius={6}
            pathOptions={{ color: '#0b2545', fillColor: '#ffb703', fillOpacity: 1, weight: 2 }}
          >
            <Tooltip>
              {fmtTime(e.ts)} {entryLabel(e.type)}
            </Tooltip>
          </CircleMarker>
        ))}
    </>
  );
}

function boatIcon(cog: number | null): L.DivIcon {
  const rot = cog ?? 0;
  const shape =
    cog == null
      ? '<circle cx="20" cy="20" r="9" fill="#1d70b8" stroke="#fff" stroke-width="3"/>'
      : '<path d="M20 3 L31 35 L20 28 L9 35 Z" fill="#1d70b8" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>';
  return L.divIcon({
    className: 'boat-icon',
    html: `<svg width="40" height="40" viewBox="0 0 40 40" style="transform:rotate(${rot}deg)">${shape}</svg>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

export function BoatMarker({ lat, lon, cog }: { lat: number; lon: number; cog: number | null }) {
  const rounded = cog == null ? null : Math.round(cog / 2) * 2;
  const icon = useMemo(() => boatIcon(rounded), [rounded]);
  return <Marker position={[lat, lon]} icon={icon} interactive={false} />;
}
