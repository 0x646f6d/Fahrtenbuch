import { create } from 'zustand';
import { showToast } from '../components/toast';
import type { Route, RoutePoint } from '../db/db';
import { loadSettings, saveSetting, type ActiveRoute } from '../db/settings';
import { addEntry } from '../entries/entries';
import type { LatLon } from '../gps/nav';
import { useLive } from '../store/liveStore';
import { hasArrived, navInfo } from './routeNav';

interface RouteNavState {
  active: ActiveRoute | null;
  arrivalRadiusNm: number;
}

export const useRouteNav = create<RouteNavState>(() => ({ active: null, arrivalRadiusNm: 0.1 }));

function set(active: ActiveRoute | null): void {
  useRouteNav.setState({ active });
  void saveSetting('activeRoute', active);
}

function currentPos(): LatLon | null {
  const fix = useLive.getState().fix;
  return fix ? { lat: fix.lat, lon: fix.lon } : null;
}

function legStart(points: RoutePoint[], target: number): LatLon | null {
  if (target > 0) return { lat: points[target - 1].lat, lon: points[target - 1].lon };
  return currentPos();
}

/** Restore navigation after app start or a restored backup. */
export async function initRoute(): Promise<void> {
  const s = await loadSettings();
  const a = s.activeRoute;
  useRouteNav.setState({
    active: a && a.points.length > 0 ? { ...a, target: Math.min(a.target, a.points.length - 1) } : null,
    arrivalRadiusNm: s.arrivalRadiusNm,
  });
}

export function setArrivalRadius(nm: number): void {
  useRouteNav.setState({ arrivalRadiusNm: nm });
  void saveSetting('arrivalRadiusNm', nm);
}

export function activateRoute(route: Route, target = 0): void {
  if (route.points.length === 0) return;
  set({ routeId: route.id ?? null, name: route.name, points: route.points, target, from: legStart(route.points, target) });
}

/** Navigate straight to a single point from the current position. */
export function goTo(point: RoutePoint): void {
  set({ routeId: null, name: point.name, points: [point], target: 0, from: currentPos() });
}

export function setTarget(target: number): void {
  const a = useRouteNav.getState().active;
  if (!a || target < 0 || target >= a.points.length) return;
  set({ ...a, target, from: legStart(a.points, target) });
}

export function stopRoute(): void {
  set(null);
}

/** Keep the snapshot in sync when the navigated route is edited or deleted. */
export function syncRoute(route: Route | undefined, routeId: number): void {
  const a = useRouteNav.getState().active;
  if (!a || a.routeId !== routeId) return;
  if (!route || route.points.length === 0) {
    set(null);
    return;
  }
  const target = Math.min(a.target, route.points.length - 1);
  const from = target > 0 ? legStart(route.points, target) : a.from;
  set({ ...a, name: route.name, points: route.points, target, from });
}

/** Called for every GPS fix: detects arrival at the target waypoint and advances. */
export function onRouteFix(fix: { lat: number; lon: number; sog: number | null; cog: number | null; ts: number }): void {
  const { active: a, arrivalRadiusNm } = useRouteNav.getState();
  if (!a) return;
  const info = navInfo({ points: a.points, target: a.target, from: a.from, pos: fix, sog: fix.sog, cog: fix.cog, now: fix.ts });
  if (!hasArrived(info, arrivalRadiusNm)) return;
  const wp = a.points[a.target];
  const last = a.target === a.points.length - 1;
  if (last) set(null);
  else set({ ...a, target: a.target + 1, from: { lat: wp.lat, lon: wp.lon } });
  showToast(last ? `Ziel erreicht: ${wp.name}` : `Wegpunkt erreicht: ${wp.name} – weiter zu ${a.points[a.target + 1].name}`);
  addEntry('waypoint', { name: wp.name }, undefined, false).catch((e) => console.error('waypoint entry failed', e));
}
