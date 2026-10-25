import { deriveMotion, meanAngle, MS_TO_KN, type Fix } from './nav';

const HISTORY_MS = 15_000;
const MIN_SPAN_MS = 3_000;
const STATIONARY_KN = 0.5;

/**
 * Keeps a short history of fixes and produces smoothed SOG/COG, preferring the
 * values reported by the device if present.
 */
export class MotionEstimator {
  private history: Fix[] = [];
  private cogs: number[] = [];

  update(
    fix: Fix,
    deviceSpeedMs: number | null,
    deviceHeading: number | null,
  ): { sog: number | null; cog: number | null } {
    this.history.push(fix);
    this.history = this.history.filter((f) => fix.ts - f.ts <= HISTORY_MS);

    let sog: number | null = deviceSpeedMs != null && !Number.isNaN(deviceSpeedMs) ? deviceSpeedMs * MS_TO_KN : null;
    let cog: number | null = deviceHeading != null && !Number.isNaN(deviceHeading) ? deviceHeading : null;

    if (sog == null || cog == null) {
      // oldest fix at least MIN_SPAN_MS ago
      const ref = [...this.history].reverse().find((f) => fix.ts - f.ts >= MIN_SPAN_MS);
      if (ref) {
        const derived = deriveMotion(ref, fix);
        sog ??= derived.sog;
        cog ??= derived.cog;
      }
    }

    if (sog != null && sog < STATIONARY_KN) {
      // while stationary keep the last known course
      cog = this.cogs.length ? meanAngle(this.cogs) : null;
    } else if (cog != null) {
      this.cogs.push(cog);
      if (this.cogs.length > 3) this.cogs.shift();
      cog = meanAngle(this.cogs);
    }
    return { sog, cog };
  }

  reset(): void {
    this.history = [];
    this.cogs = [];
  }
}
