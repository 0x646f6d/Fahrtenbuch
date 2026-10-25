import { create } from 'zustand';

export type GpsStatus = 'idle' | 'searching' | 'ok' | 'denied' | 'unavailable' | 'error';

export interface LiveFix {
  lat: number;
  lon: number;
  ts: number;
  accuracy: number;
  sog: number | null;
  cog: number | null;
}

interface LiveState {
  status: GpsStatus;
  fix: LiveFix | null;
  activeTripId: number | null;
  tripStartedAt: number | null;
  tripDistanceNm: number;
  setStatus: (s: GpsStatus) => void;
  setFix: (f: LiveFix) => void;
  setTrip: (id: number | null, startedAt: number | null, distanceNm?: number) => void;
  addDistance: (nm: number) => void;
}

export const useLive = create<LiveState>((set) => ({
  status: 'idle',
  fix: null,
  activeTripId: null,
  tripStartedAt: null,
  tripDistanceNm: 0,
  setStatus: (status) => set({ status }),
  setFix: (fix) => set({ fix, status: 'ok' }),
  setTrip: (activeTripId, tripStartedAt, tripDistanceNm = 0) =>
    set({ activeTripId, tripStartedAt, tripDistanceNm }),
  addDistance: (nm) => set((s) => ({ tripDistanceNm: s.tripDistanceNm + nm })),
}));
