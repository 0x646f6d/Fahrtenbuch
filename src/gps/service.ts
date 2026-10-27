import { db, getActiveTrip, type TrackPoint } from '../db/db';
import { loadSettings } from '../db/settings';
import { onRouteFix } from '../route/active';
import { addEntry } from '../entries/entries';
import { useLive } from '../store/liveStore';
import { autoStep, initialAutoState, STOP_RADIUS_NM, type AutoState } from './autoTrip';
import { MotionEstimator } from './motion';
import { distanceNm, trackDistanceNm } from './nav';
import { decide, MAX_ACCURACY_M, type RecFix } from './recorder';
import { setWakeLock } from './wakeLock';

let watchId: number | null = null;
let lastLogged: RecFix | null = null;
let intervalSec = 5;
let writing = Promise.resolve();
const motion = new MotionEstimator();
let autoEnabled = true;
let auto: AutoState = initialAutoState();
let autoBusy = false;

export function setLogInterval(sec: number): void {
  intervalSec = sec;
}

export function setAutoTrip(on: boolean): void {
  autoEnabled = on;
  auto = initialAutoState();
}

/** Start/end trips automatically from movement (see autoTrip.ts). */
function onAutoFix(fix: { lat: number; lon: number; ts: number; accuracy: number; sog: number | null }): void {
  if (!autoEnabled || autoBusy) return;
  const active = useLive.getState().activeTripId != null;
  const { state, action } = autoStep(auto, fix, active);
  auto = state;
  if (action.kind === 'none') return;
  autoBusy = true;
  const job =
    action.kind === 'start'
      ? startTrip().then((id) => addEntry('tripStart', {}, 'automatisch erkannt', false).then(() => id))
      : endTripAt(action.at);
  job
    .then(() => {
      // endTrip disarms auto-start (for manual use); after an hour of standing still it may start again
      if (action.kind === 'end') auto = { ...auto, armed: true };
    })
    .catch((e) => console.error('auto trip failed', e))
    .finally(() => {
      autoBusy = false;
    });
}

/** End the active trip at the time the boat stopped moving and drop the idle track after it. */
async function endTripAt(at: number): Promise<void> {
  const tripId = useLive.getState().activeTripId;
  if (tripId == null) return;
  await writing;
  const fix = useLive.getState().fix;
  await db.trackPoints
    .where('[tripId+ts]')
    .between([tripId, at], [tripId, Infinity], false, true)
    .delete();
  const points = await db.trackPoints
    .where('[tripId+ts]')
    .between([tripId, -Infinity], [tripId, Infinity])
    .toArray();
  useLive.getState().setTrip(tripId, useLive.getState().tripStartedAt, trackDistanceNm(points));
  const last = points[points.length - 1];
  await addEntry('tripEnd', {}, 'automatisch erkannt (1 h ohne Bewegung)', false, {
    ts: at,
    lat: last?.lat ?? fix?.lat ?? null,
    lon: last?.lon ?? fix?.lon ?? null,
    sog: 0,
  });
  await endTrip(at);
}

function onPosition(pos: GeolocationPosition): void {
  const { latitude: lat, longitude: lon, accuracy, speed, heading } = pos.coords;
  const ts = pos.timestamp || Date.now();
  const { sog, cog } = motion.update({ lat, lon, ts }, speed, heading);
  const live = useLive.getState();
  live.setFix({ lat, lon, ts, accuracy, sog, cog });
  if (accuracy <= MAX_ACCURACY_M) onRouteFix({ lat, lon, ts, sog, cog });
  onAutoFix({ lat, lon, ts, accuracy, sog });

  const tripId = live.activeTripId;
  if (tripId == null) return;
  const fix: RecFix = { lat, lon, ts, accuracy };
  const d = decide(lastLogged, fix, intervalSec);
  if (!d.log) return;
  lastLogged = fix;
  const point: TrackPoint = { tripId, ts, lat, lon, sog, cog, accuracy, gap: d.gap || undefined };
  if (d.distanceNm > 0) live.addDistance(d.distanceNm);
  const distance = useLive.getState().tripDistanceNm;
  // serialize writes so points stay in order
  writing = writing
    .then(async () => {
      await db.trackPoints.add(point);
      await db.trips.update(tripId, { distanceNm: distance });
    })
    .catch((e) => console.error('track write failed', e));
}

function onError(err: GeolocationPositionError): void {
  const live = useLive.getState();
  if (err.code === err.PERMISSION_DENIED) live.setStatus('denied');
  else if (err.code === err.POSITION_UNAVAILABLE) live.setStatus('unavailable');
  else if (!live.fix) live.setStatus('error');
}

export function startGps(): void {
  if (watchId != null) return;
  if (!('geolocation' in navigator)) {
    useLive.getState().setStatus('unavailable');
    return;
  }
  useLive.getState().setStatus('searching');
  watchId = navigator.geolocation.watchPosition(onPosition, onError, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 30_000,
  });
}

export function stopGps(): void {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  motion.reset();
  useLive.getState().setStatus('idle');
}

/** Restore settings and an unfinished trip after app start. */
export async function initTracking(): Promise<void> {
  const settings = await loadSettings();
  intervalSec = settings.logIntervalSec;
  autoEnabled = settings.autoTrip;
  auto = initialAutoState();
  const trip = await getActiveTrip();
  if (trip?.id != null) {
    const points = db.trackPoints.where('[tripId+ts]').between([trip.id, -Infinity], [trip.id, Infinity]);
    const last = await points.last();
    lastLogged = last ? { lat: last.lat, lon: last.lon, ts: last.ts, accuracy: last.accuracy } : null;
    if (last) {
      // when did the boat last leave the circle around its latest position?
      const moved = await points
        .clone()
        .reverse()
        .filter((p) => distanceNm(p, last) > STOP_RADIUS_NM)
        .first();
      auto = { anchor: { lat: last.lat, lon: last.lon }, lastMoveTs: moved?.ts ?? trip.startedAt, armed: true };
    }
    useLive.getState().setTrip(trip.id, trip.startedAt, trip.distanceNm);
    setWakeLock(true);
  }
  startGps();
}

export async function startTrip(name?: string): Promise<number> {
  const now = Date.now();
  const id = (await db.trips.add({
    name: name || `Fahrt ${new Date(now).toLocaleString('de-AT', { dateStyle: 'short', timeStyle: 'short' })}`,
    startedAt: now,
    distanceNm: 0,
  })) as number;
  lastLogged = null;
  useLive.getState().setTrip(id, now, 0);
  setWakeLock(true);
  startGps();
  const fix = useLive.getState().fix;
  // the no-movement timer starts now
  auto = { anchor: fix ? { lat: fix.lat, lon: fix.lon } : null, lastMoveTs: now, armed: true };
  // log the current position right away
  if (fix && fix.accuracy <= MAX_ACCURACY_M) {
    lastLogged = { lat: fix.lat, lon: fix.lon, ts: fix.ts, accuracy: fix.accuracy };
    await db.trackPoints.add({ tripId: id, ...fix });
  }
  return id;
}

export async function endTrip(at = Date.now()): Promise<void> {
  const { activeTripId, tripDistanceNm, fix } = useLive.getState();
  if (activeTripId == null) return;
  await writing;
  await db.trips.update(activeTripId, { endedAt: at, distanceNm: tripDistanceNm });
  lastLogged = null;
  useLive.getState().setTrip(null, null, 0);
  setWakeLock(false);
  // don't auto-start again right away (e.g. motoring into the berth after ending manually)
  auto = { anchor: fix ? { lat: fix.lat, lon: fix.lon } : null, lastMoveTs: Date.now(), armed: false };
}

/** Undo for ending a trip: continue it. */
export async function reopenTrip(id: number): Promise<void> {
  if (useLive.getState().activeTripId != null) return;
  const trip = await db.trips.get(id);
  if (!trip) return;
  await db.trips.update(id, { endedAt: undefined });
  const last = await db.trackPoints.where('[tripId+ts]').between([id, -Infinity], [id, Infinity]).last();
  lastLogged = last ? { lat: last.lat, lon: last.lon, ts: last.ts, accuracy: last.accuracy } : null;
  useLive.getState().setTrip(id, trip.startedAt, trip.distanceNm);
  setWakeLock(true);
  auto = { ...auto, lastMoveTs: Date.now(), armed: true };
}

/** Called after all data was wiped. */
export function resetTracking(): void {
  lastLogged = null;
  auto = initialAutoState();
  useLive.getState().setTrip(null, null, 0);
  setWakeLock(false);
}
