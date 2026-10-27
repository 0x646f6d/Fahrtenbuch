import { distanceNm } from './nav';

/** Fixes worse than this are ignored for trip detection. */
export const AUTO_MAX_ACCURACY_M = 30;
/** Leaving this circle (with some speed) counts as departure. */
export const START_RADIUS_NM = 0.05;
export const START_MIN_KN = 1;
/** Staying inside this circle counts as no movement. */
export const STOP_RADIUS_NM = 0.1;
export const STOP_AFTER_MS = 60 * 60_000;
/** After a manual end, auto-start waits until the boat has been still this long. */
export const REARM_AFTER_MS = 15 * 60_000;

export interface AutoFix {
  lat: number;
  lon: number;
  ts: number;
  accuracy: number;
  sog: number | null;
}

export interface AutoState {
  /** centre of the current "standing still" circle */
  anchor: { lat: number; lon: number } | null;
  /** last time the boat left a circle */
  lastMoveTs: number;
  /** auto-start allowed */
  armed: boolean;
}

export type AutoAction = { kind: 'none' } | { kind: 'start' } | { kind: 'end'; at: number };

export function initialAutoState(): AutoState {
  return { anchor: null, lastMoveTs: 0, armed: true };
}

/**
 * Detect trip start/end from GPS fixes (pure).
 * Start: boat left a 0.05 sm circle and makes ≥ 1 kn. End: boat stayed within 0.1 sm for an hour;
 * `at` is the time it stopped moving.
 */
export function autoStep(s: AutoState, fix: AutoFix, tripActive: boolean): { state: AutoState; action: AutoAction } {
  if (fix.accuracy > AUTO_MAX_ACCURACY_M) return { state: s, action: { kind: 'none' } };
  const here = { lat: fix.lat, lon: fix.lon };
  if (!s.anchor) return { state: { ...s, anchor: here, lastMoveTs: fix.ts }, action: { kind: 'none' } };
  const d = distanceNm(s.anchor, here);

  if (tripActive) {
    if (d > STOP_RADIUS_NM) return { state: { ...s, anchor: here, lastMoveTs: fix.ts }, action: { kind: 'none' } };
    if (fix.ts - s.lastMoveTs >= STOP_AFTER_MS) {
      return { state: { anchor: here, lastMoveTs: fix.ts, armed: true }, action: { kind: 'end', at: s.lastMoveTs } };
    }
    return { state: s, action: { kind: 'none' } };
  }

  if (d > START_RADIUS_NM) {
    const next = { ...s, anchor: here, lastMoveTs: fix.ts };
    if (s.armed && (fix.sog ?? 0) >= START_MIN_KN) return { state: next, action: { kind: 'start' } };
    return { state: next, action: { kind: 'none' } };
  }
  if (!s.armed && fix.ts - s.lastMoveTs >= REARM_AFTER_MS) return { state: { ...s, armed: true }, action: { kind: 'none' } };
  return { state: s, action: { kind: 'none' } };
}
