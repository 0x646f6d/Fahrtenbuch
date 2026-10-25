import { db, type Route, type RoutePoint } from '../db/db';
import { syncRoute } from './active';

export async function createRoute(name: string, points: RoutePoint[] = []): Promise<number> {
  const now = Date.now();
  return (await db.routes.add({ name, createdAt: now, updatedAt: now, points })) as number;
}

export async function updateRoute(id: number, changes: Partial<Pick<Route, 'name' | 'points'>>): Promise<void> {
  if (changes.points) changes = { ...changes, points: renumber(changes.points) };
  await db.routes.update(id, { ...changes, updatedAt: Date.now() });
  syncRoute(await db.routes.get(id), id);
}

export async function deleteRoute(id: number): Promise<void> {
  await db.routes.delete(id);
  syncRoute(undefined, id);
}

export async function savePlace(point: RoutePoint): Promise<number> {
  return (await db.places.add({ name: point.name, lat: point.lat, lon: point.lon, createdAt: Date.now() })) as number;
}

const DEFAULT_NAME = /^WP \d+$/;

/** Default name for a new waypoint; `renumber` fixes it after inserting. */
export function nextWaypointName(points: RoutePoint[]): string {
  return `WP ${points.length + 1}`;
}

/** Keep default names ("WP 3") in line with the position after inserting, deleting or reversing. */
export function renumber(points: RoutePoint[]): RoutePoint[] {
  return points.map((p, i) => (DEFAULT_NAME.test(p.name) && p.name !== `WP ${i + 1}` ? { ...p, name: `WP ${i + 1}` } : p));
}
