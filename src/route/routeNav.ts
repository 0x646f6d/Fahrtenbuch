import { bearing, distanceNm, normalizeDeg, type LatLon } from '../gps/nav';

export interface Leg {
  from: LatLon;
  to: LatLon;
  /** rwK in degrees */
  course: number;
  distanceNm: number;
}

export function routeLegs(points: LatLon[]): Leg[] {
  const legs: Leg[] = [];
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    legs.push({ from, to, course: bearing(from, to), distanceNm: distanceNm(from, to) });
  }
  return legs;
}

export function routeDistanceNm(points: LatLon[]): number {
  return routeLegs(points).reduce((s, l) => s + l.distanceNm, 0);
}

/** Flat projection around `a` in nautical miles (x east, y north) – good enough for coastal legs. */
function project(a: LatLon, p: LatLon): { x: number; y: number } {
  const cosLat = Math.cos((((a.lat + p.lat) / 2) * Math.PI) / 180);
  let dLon = p.lon - a.lon;
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;
  return { x: dLon * 60 * cosLat, y: (p.lat - a.lat) * 60 };
}

/**
 * Position relative to the leg a→b: cross-track error in sm (positive = right of the
 * course line, negative = left) and along-track fraction (0 = at a, 1 = abeam b).
 */
export function legOffset(a: LatLon, b: LatLon, p: LatLon): { xteNm: number; along: number } {
  const B = project(a, b);
  const P = project(a, p);
  const len2 = B.x * B.x + B.y * B.y;
  if (len2 < 1e-12) return { xteNm: 0, along: 1 };
  const cross = B.x * P.y - B.y * P.x;
  return { xteNm: -cross / Math.sqrt(len2), along: (B.x * P.x + B.y * P.y) / len2 };
}

export interface NavInput {
  points: LatLon[];
  /** index of the waypoint we are heading for */
  target: number;
  /** start of the current leg (previous waypoint or position at activation) */
  from: LatLon | null;
  pos: LatLon;
  sog: number | null;
  cog: number | null;
  now: number;
}

export interface NavInfo {
  /** bearing to waypoint */
  btw: number;
  /** distance to waypoint */
  dtw: number;
  /** cross-track error, + = right of track */
  xte: number | null;
  /** fraction of the current leg already covered (abeam of waypoint at >= 1) */
  along: number | null;
  /** velocity made good towards the waypoint */
  vmg: number | null;
  etaTarget: number | null;
  /** distance to the final waypoint via the remaining waypoints */
  remainingNm: number;
  etaFinal: number | null;
}

const MIN_SPEED_KN = 0.3;

export function navInfo({ points, target, from, pos, sog, cog, now }: NavInput): NavInfo {
  const wp = points[target];
  const btw = bearing(pos, wp);
  const dtw = distanceNm(pos, wp);
  const offset = from ? legOffset(from, wp, pos) : null;
  const vmg = sog != null && cog != null ? sog * Math.cos(((normalizeDeg(cog - btw)) * Math.PI) / 180) : null;
  const remainingNm = dtw + routeDistanceNm(points.slice(target));
  const etaTarget = vmg != null && vmg > MIN_SPEED_KN ? now + (dtw / vmg) * 3_600_000 : null;
  const etaFinal = sog != null && sog > MIN_SPEED_KN ? now + (remainingNm / sog) * 3_600_000 : null;
  return { btw, dtw, xte: offset?.xteNm ?? null, along: offset?.along ?? null, vmg, etaTarget, remainingNm, etaFinal };
}

/**
 * Waypoint counts as reached inside the arrival circle, or when it was passed
 * abeam (perpendicular through the waypoint crossed) within 5 × the radius.
 */
export function hasArrived(info: Pick<NavInfo, 'dtw' | 'along'>, radiusNm: number): boolean {
  if (info.dtw <= radiusNm) return true;
  return info.along != null && info.along >= 1 && info.dtw <= radiusNm * 5;
}

export function formatXte(xte: number | null): string {
  if (xte == null) return '–';
  const abs = Math.abs(xte);
  if (abs < 0.005) return '0.00 sm';
  return `${abs.toFixed(2)} sm ${xte > 0 ? 'R' : 'L'}`;
}
