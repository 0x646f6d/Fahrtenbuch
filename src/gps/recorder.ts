import { distanceNm } from './nav';

export const MAX_ACCURACY_M = 50;
export const MAX_PLAUSIBLE_KN = 60;

export interface RecFix {
  lat: number;
  lon: number;
  ts: number;
  accuracy: number;
}

export type RecordDecision =
  | { log: false; reason: 'accuracy' | 'interval' | 'jump' }
  | { log: true; gap: boolean; distanceNm: number };

/**
 * Decide whether a new fix should be written to the track.
 * A gap is flagged when the previous point is long ago (e.g. app was in the
 * background), in which case no distance is counted.
 */
export function decide(last: RecFix | null, fix: RecFix, intervalSec: number): RecordDecision {
  if (fix.accuracy > MAX_ACCURACY_M) return { log: false, reason: 'accuracy' };
  if (!last) return { log: true, gap: false, distanceNm: 0 };
  const dtMs = fix.ts - last.ts;
  if (dtMs < intervalSec * 1000 - 250) return { log: false, reason: 'interval' };
  const d = distanceNm(last, fix);
  const gapThresholdMs = Math.max(30_000, intervalSec * 6_000);
  if (dtMs > gapThresholdMs) return { log: true, gap: true, distanceNm: 0 };
  const kn = d / (dtMs / 3_600_000);
  if (kn > MAX_PLAUSIBLE_KN) return { log: false, reason: 'jump' };
  return { log: true, gap: false, distanceNm: d };
}
