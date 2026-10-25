import { db, getActiveTrip, type TrackPoint } from '../db/db';
import { loadSettings } from '../db/settings';
import { useLive } from '../store/liveStore';
import { MotionEstimator } from './motion';
import { decide, MAX_ACCURACY_M, type RecFix } from './recorder';
import { setWakeLock } from './wakeLock';

let watchId: number | null = null;
let lastLogged: RecFix | null = null;
let intervalSec = 5;
let writing = Promise.resolve();
const motion = new MotionEstimator();

export function setLogInterval(sec: number): void {
  intervalSec = sec;
}

function onPosition(pos: GeolocationPosition): void {
  const { latitude: lat, longitude: lon, accuracy, speed, heading } = pos.coords;
  const ts = pos.timestamp || Date.now();
  const { sog, cog } = motion.update({ lat, lon, ts }, speed, heading);
  const live = useLive.getState();
  live.setFix({ lat, lon, ts, accuracy, sog, cog });

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
  const trip = await getActiveTrip();
  if (trip?.id != null) {
    const last = await db.trackPoints
      .where('[tripId+ts]')
      .between([trip.id, -Infinity], [trip.id, Infinity])
      .last();
    lastLogged = last ? { lat: last.lat, lon: last.lon, ts: last.ts, accuracy: last.accuracy } : null;
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
  // log the current position right away
  const fix = useLive.getState().fix;
  if (fix && fix.accuracy <= MAX_ACCURACY_M) {
    lastLogged = { lat: fix.lat, lon: fix.lon, ts: fix.ts, accuracy: fix.accuracy };
    await db.trackPoints.add({ tripId: id, ...fix });
  }
  return id;
}

export async function endTrip(): Promise<void> {
  const { activeTripId, tripDistanceNm } = useLive.getState();
  if (activeTripId == null) return;
  await writing;
  await db.trips.update(activeTripId, { endedAt: Date.now(), distanceNm: tripDistanceNm });
  lastLogged = null;
  useLive.getState().setTrip(null, null, 0);
  setWakeLock(false);
}

/** Called after all data was wiped. */
export function resetTracking(): void {
  lastLogged = null;
  useLive.getState().setTrip(null, null, 0);
  setWakeLock(false);
}
