import { beforeEach, describe, expect, it } from 'vitest';
import { createBackup, restoreBackup } from '../export/backup';
import { clearAllData, db, deleteTrip, recordUsage, unrecordUsage } from './db';

beforeEach(async () => {
  await clearAllData(false);
});

describe('db', () => {
  it('tracks usage', async () => {
    await recordUsage('tack');
    await recordUsage('tack');
    expect((await db.entryUsage.get('tack'))?.count).toBe(2);
    await unrecordUsage('tack');
    await unrecordUsage('tack');
    expect(await db.entryUsage.get('tack')).toBeUndefined();
  });

  it('deletes a trip with its data', async () => {
    const id = (await db.trips.add({ name: 'a', startedAt: 1, distanceNm: 0 })) as number;
    await db.trackPoints.add({ tripId: id, ts: 1, lat: 0, lon: 0, sog: null, cog: null, accuracy: 1 });
    await db.logEntries.add({ tripId: id, ts: 1, type: 'tack', lat: null, lon: null, sog: null, cog: null, data: {} });
    await deleteTrip(id);
    expect(await db.trackPoints.count()).toBe(0);
    expect(await db.logEntries.count()).toBe(0);
  });

  it('clears all data but keeps settings', async () => {
    await db.settings.put({ key: 'boatName', value: 'Möwe' });
    await db.trips.add({ name: 'a', startedAt: 1, distanceNm: 0 });
    await clearAllData(true);
    expect(await db.trips.count()).toBe(0);
    expect(await db.settings.count()).toBe(1);
  });

  it('restores a version 1 backup without routes', async () => {
    await db.routes.add({ name: 'r', createdAt: 1, updatedAt: 1, points: [] });
    await restoreBackup(JSON.stringify({ app: 'fahrtenbuch', version: 1, trips: [], trackPoints: [], logEntries: [], entryUsage: [], settings: [] }));
    expect(await db.routes.count()).toBe(0);
  });

  it('round-trips a backup', async () => {
    await db.trips.add({ name: 'a', startedAt: 1, distanceNm: 2 });
    await db.routes.add({ name: 'r', createdAt: 1, updatedAt: 1, points: [{ lat: 1, lon: 2, name: 'WP 1' }] });
    await db.places.add({ name: 'Bucht', lat: 1, lon: 2, createdAt: 1 });
    const json = JSON.stringify(await createBackup());
    await clearAllData(false);
    await restoreBackup(json);
    expect((await db.trips.toArray())[0].name).toBe('a');
    expect((await db.routes.toArray())[0].points[0].name).toBe('WP 1');
    expect(await db.places.count()).toBe(1);
    await expect(restoreBackup('{"foo":1}')).rejects.toThrow();
  });
});
