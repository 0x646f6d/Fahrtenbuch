const EARTH_RADIUS_NM = 3440.065;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export interface LatLon {
  lat: number;
  lon: number;
}

/** Great-circle distance in nautical miles. */
export function distanceNm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b in degrees [0, 360). */
export function bearing(a: LatLon, b: LatLon): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lon - a.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return normalizeDeg(toDeg(Math.atan2(y, x)));
}

export function normalizeDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

export const MS_TO_KN = 1.943844;

export interface Fix extends LatLon {
  ts: number;
}

/**
 * Derive SOG (kn) and COG (°) from two fixes. Returns nulls if the fixes are
 * too close in time or space to give a meaningful value.
 */
export function deriveMotion(prev: Fix, cur: Fix): { sog: number | null; cog: number | null } {
  const dtH = (cur.ts - prev.ts) / 3_600_000;
  if (dtH <= 0) return { sog: null, cog: null };
  const d = distanceNm(prev, cur);
  const sog = d / dtH;
  // below ~3 m movement the bearing is mostly noise
  const cog = d > 0.0016 ? bearing(prev, cur) : null;
  return { sog, cog };
}

/** Circular mean of angles in degrees (for smoothing COG). */
export function meanAngle(degs: number[]): number | null {
  if (degs.length === 0) return null;
  let s = 0;
  let c = 0;
  for (const d of degs) {
    s += Math.sin(toRad(d));
    c += Math.cos(toRad(d));
  }
  if (Math.abs(s) < 1e-9 && Math.abs(c) < 1e-9) return null;
  return normalizeDeg(toDeg(Math.atan2(s, c)));
}

/** Total distance of a track, skipping gaps. */
export function trackDistanceNm(points: (LatLon & { gap?: boolean })[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].gap) continue;
    total += distanceNm(points[i - 1], points[i]);
  }
  return total;
}

function dm(value: number, pos: string, neg: string, degWidth: number): string {
  const hemi = value >= 0 ? pos : neg;
  const abs = Math.abs(value);
  let deg = Math.floor(abs);
  let min = (abs - deg) * 60;
  if (min >= 59.9995) {
    deg += 1;
    min = 0;
  }
  return `${String(deg).padStart(degWidth, '0')}°${min.toFixed(3).padStart(6, '0')}′${hemi}`;
}

export function formatLat(lat: number): string {
  return dm(lat, 'N', 'S', 2);
}

export function formatLon(lon: number): string {
  return dm(lon, 'E', 'W', 3);
}

export function formatPosition(lat: number | null, lon: number | null): string {
  if (lat == null || lon == null) return '–';
  return `${formatLat(lat)} ${formatLon(lon)}`;
}

export function formatCourse(cog: number | null | undefined): string {
  if (cog == null) return '–';
  return `${String(Math.round(cog) % 360).padStart(3, '0')}°`;
}

export function formatSpeed(sog: number | null | undefined): string {
  if (sog == null) return '–';
  return `${sog.toFixed(1)} kn`;
}

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${String(m).padStart(2, '0')} h`;
}
