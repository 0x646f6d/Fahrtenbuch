import { deleteTrip } from '../db/db';
import { endTrip, reopenTrip, startTrip } from '../gps/service';
import { useLive } from '../store/liveStore';
import { addEntry, removeEntry } from './entries';

/** Entries that begin a trip if none is running. */
const STARTS_TRIP = new Set(['tripStart', 'castOff', 'anchorUp']);

export interface QuickResult {
  /** toast text */
  text: string;
  undo: () => Promise<void>;
}

/**
 * Save a quick entry; trip entries also start/end the trip.
 * Ablegen and Anker auf start a trip when none is active.
 */
export async function saveQuickEntry(type: string, label: string): Promise<QuickResult> {
  const { activeTripId } = useLive.getState();

  if (type === 'tripEnd') {
    if (activeTripId == null) return { text: 'Keine Fahrt aktiv', undo: async () => {} };
    const id = await addEntry(type);
    await endTrip();
    return {
      text: 'Fahrt beendet',
      undo: async () => {
        await removeEntry(id);
        await reopenTrip(activeTripId);
      },
    };
  }

  if (STARTS_TRIP.has(type) && activeTripId == null) {
    const tripId = await startTrip();
    const id = await addEntry(type);
    return {
      text: type === 'tripStart' ? 'Fahrt begonnen' : `${label} eingetragen – Fahrt begonnen`,
      undo: async () => {
        await removeEntry(id);
        if (useLive.getState().activeTripId === tripId) await endTrip();
        await deleteTrip(tripId);
      },
    };
  }

  if (type === 'tripStart') return { text: 'Fahrt läuft bereits', undo: async () => {} };
  const id = await addEntry(type);
  return { text: `${label} eingetragen`, undo: () => removeEntry(id) };
}
