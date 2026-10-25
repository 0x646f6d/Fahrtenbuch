import { db, recordUsage, unrecordUsage, type EntryValue, type LogEntry } from '../db/db';
import { useLive } from '../store/liveStore';

/**
 * Create a log entry, stamping it with the current time and telemetry.
 * Automatic entries pass `countUsage = false` so they don't affect the tile order.
 */
export async function addEntry(
  type: string,
  data: Record<string, EntryValue> = {},
  note?: string,
  countUsage = true,
): Promise<number> {
  const { fix, activeTripId } = useLive.getState();
  const entry: LogEntry = {
    tripId: activeTripId,
    ts: Date.now(),
    type,
    lat: fix?.lat ?? null,
    lon: fix?.lon ?? null,
    sog: fix?.sog ?? null,
    cog: fix?.cog ?? null,
    data,
    note: note || undefined,
  };
  const id = (await db.logEntries.add(entry)) as number;
  if (countUsage) await recordUsage(type);
  return id;
}

export async function updateEntry(id: number, changes: Partial<LogEntry>): Promise<void> {
  await db.logEntries.update(id, changes);
}

export async function removeEntry(id: number): Promise<void> {
  const entry = await db.logEntries.get(id);
  if (!entry) return;
  await db.logEntries.delete(id);
  await unrecordUsage(entry.type);
}
