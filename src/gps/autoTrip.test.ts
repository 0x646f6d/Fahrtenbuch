import { describe, expect, it } from 'vitest';
import { autoStep, initialAutoState, REARM_AFTER_MS, STOP_AFTER_MS, type AutoFix, type AutoState } from './autoTrip';

const MIN = 60_000;
// 0.01° latitude ≈ 0.6 sm
const at = (ts: number, dLat = 0, sog = 0, accuracy = 5): AutoFix => ({ lat: 47 + dLat, lon: 13, ts, accuracy, sog });

function run(fixes: AutoFix[], active: boolean, s: AutoState = initialAutoState()) {
  const actions = [];
  for (const f of fixes) {
    const r = autoStep(s, f, active);
    s = r.state;
    actions.push(r.action);
  }
  return { s, actions };
}

describe('autoStep', () => {
  it('ignores GPS noise in the harbour', () => {
    const fixes = Array.from({ length: 120 }, (_, i) => at(i * MIN, (i % 3) * 0.0003, 0.8));
    expect(run(fixes, false).actions.every((a) => a.kind === 'none')).toBe(true);
  });

  it('starts when the boat leaves the circle under way', () => {
    const { actions } = run([at(0), at(MIN, 0.0005, 2), at(2 * MIN, 0.001, 3)], false);
    expect(actions.map((a) => a.kind)).toEqual(['none', 'none', 'start']);
  });

  it('needs speed to start and ignores bad fixes', () => {
    expect(run([at(0), at(MIN, 0.01, 0.2)], false).actions[1].kind).toBe('none');
    expect(run([at(0), at(MIN, 0.01, 3, 80)], false).actions[1].kind).toBe('none');
  });

  it('ends after an hour without movement, dated back to the stop', () => {
    const s: AutoState = { anchor: null, lastMoveTs: 0, armed: true };
    const fixes = [at(0, 0, 4), at(10 * MIN, 0.05, 4), ...Array.from({ length: 61 }, (_, i) => at((11 + i) * MIN, 0.0502))];
    const { actions } = run(fixes, true, s);
    const end = actions.findIndex((a) => a.kind === 'end');
    expect(fixes[end].ts - 10 * MIN).toBeGreaterThanOrEqual(STOP_AFTER_MS);
    expect(actions[end]).toEqual({ kind: 'end', at: 10 * MIN });
  });

  it('keeps the trip while moving slowly', () => {
    const fixes = Array.from({ length: 180 }, (_, i) => at(i * MIN, i * 0.0003, 1));
    expect(run(fixes, true).actions.some((a) => a.kind === 'end')).toBe(false);
  });

  it('after a manual end only re-arms once the boat stood still', () => {
    const disarmed: AutoState = { anchor: { lat: 47, lon: 13 }, lastMoveTs: 0, armed: false };
    expect(run([at(MIN, 0.01, 3)], false, disarmed).actions[0].kind).toBe('none');
    const { s } = run([at(REARM_AFTER_MS, 0.0001)], false, disarmed);
    expect(s.armed).toBe(true);
    expect(run([at(REARM_AFTER_MS + MIN, 0.01, 3)], false, s).actions[0].kind).toBe('start');
  });
});
