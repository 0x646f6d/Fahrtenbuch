import type { LucideIcon } from 'lucide-react';
import {
  Anchor,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CloudSun,
  Compass,
  Droplets,
  Flag,
  FlagOff,
  Fuel,
  Gauge,
  LifeBuoy,
  MapPin,
  Navigation,
  Minimize2,
  Maximize2,
  Power,
  PowerOff,
  RefreshCcw,
  Repeat,
  Ship,
  StickyNote,
  Users,
  Waves,
} from 'lucide-react';
import type { EntryValue } from '../db/db';
import type { LiveFix } from '../store/liveStore';

export type FieldKind = 'number' | 'text' | 'textarea' | 'select' | 'course';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  unit?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export interface EntryType {
  id: string;
  label: string;
  icon: LucideIcon;
  /** quick entries are saved with a single tap, without a form */
  quick?: boolean;
  fields?: FieldDef[];
  prefill?: (fix: LiveFix | null) => Record<string, EntryValue>;
  /** emphasised tile (e.g. safety-relevant) */
  accent?: 'danger' | 'primary';
  /** not offered as a tile (written automatically or shown elsewhere) */
  hidden?: boolean;
}

const COMPASS = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];

export const ENTRY_TYPES: EntryType[] = [
  { id: 'tack', label: 'Wende', icon: Repeat, quick: true },
  {
    id: 'course',
    label: 'Neuer Kurs',
    icon: Compass,
    accent: 'primary',
    fields: [
      { key: 'course', label: 'Kurs', kind: 'course', unit: '°' },
      { key: 'destination', label: 'Ziel / Wegpunkt', kind: 'text' },
    ],
    prefill: (fix): Record<string, EntryValue> => (fix?.cog != null ? { course: Math.round(fix.cog) % 360 } : {}),
  },
  { id: 'jibe', label: 'Halse', icon: RefreshCcw, quick: true },
  { id: 'castOff', label: 'Ablegen', icon: ArrowUpFromLine, quick: true },
  { id: 'moor', label: 'Anlegen', icon: ArrowDownToLine, quick: true },
  { id: 'anchorUp', label: 'Anker auf', icon: Ship, quick: true },
  { id: 'anchorDown', label: 'Anker fallen', icon: Anchor, quick: true },
  { id: 'engineOn', label: 'Motor an', icon: Power, quick: true },
  { id: 'engineOff', label: 'Motor aus', icon: PowerOff, quick: true },
  { id: 'sailsUp', label: 'Segel setzen', icon: Flag, quick: true },
  { id: 'sailsDown', label: 'Segel bergen', icon: FlagOff, quick: true },
  { id: 'reef', label: 'Reffen', icon: Minimize2, quick: true },
  { id: 'unreef', label: 'Ausreffen', icon: Maximize2, quick: true },
  {
    id: 'weather',
    label: 'Wetter',
    icon: CloudSun,
    fields: [
      { key: 'windDir', label: 'Windrichtung', kind: 'select', options: COMPASS },
      { key: 'windBft', label: 'Windstärke', kind: 'number', unit: 'Bft', min: 0, max: 12, step: 1 },
      { key: 'sea', label: 'Seegang', kind: 'select', options: ['glatt', 'ruhig', 'leicht', 'mäßig', 'grob', 'sehr grob', 'hoch'] },
      { key: 'pressure', label: 'Luftdruck', kind: 'number', unit: 'hPa', min: 900, max: 1100, step: 1 },
      { key: 'visibility', label: 'Sicht', kind: 'select', options: ['sehr gut', 'gut', 'mäßig', 'schlecht', 'Nebel'] },
      { key: 'sky', label: 'Bewölkung', kind: 'select', options: ['klar', 'heiter', 'wolkig', 'bedeckt', 'Regen', 'Gewitter'] },
    ],
  },
  {
    id: 'watch',
    label: 'Wache / Crew',
    icon: Users,
    fields: [
      { key: 'skipper', label: 'Wachführer / Rudergänger', kind: 'text' },
      { key: 'crew', label: 'Crew', kind: 'text' },
    ],
  },
  {
    id: 'speed',
    label: 'Fahrt / Log',
    icon: Gauge,
    fields: [
      { key: 'sog', label: 'Fahrt über Grund', kind: 'number', unit: 'kn', min: 0, step: 0.1 },
      { key: 'log', label: 'Logge', kind: 'number', unit: 'sm', min: 0, step: 0.1 },
    ],
    prefill: (fix): Record<string, EntryValue> => (fix?.sog != null ? { sog: Math.round(fix.sog * 10) / 10 } : {}),
  },
  {
    id: 'engineHours',
    label: 'Motorstunden',
    icon: Gauge,
    fields: [{ key: 'hours', label: 'Betriebsstunden', kind: 'number', unit: 'h', min: 0, step: 0.1 }],
  },
  {
    id: 'fuel',
    label: 'Tanken',
    icon: Fuel,
    fields: [
      { key: 'liters', label: 'Menge', kind: 'number', unit: 'l', min: 0, step: 0.1 },
      { key: 'price', label: 'Preis', kind: 'number', unit: '€', min: 0, step: 0.01 },
    ],
  },
  {
    id: 'water',
    label: 'Wasser',
    icon: Droplets,
    fields: [{ key: 'liters', label: 'Menge', kind: 'number', unit: 'l', min: 0, step: 1 }],
  },
  {
    id: 'depth',
    label: 'Wassertiefe',
    icon: Waves,
    fields: [{ key: 'depth', label: 'Tiefe', kind: 'number', unit: 'm', min: 0, step: 0.1 }],
  },
  { id: 'position', label: 'Position', icon: MapPin, quick: true },
  {
    id: 'note',
    label: 'Notiz',
    icon: StickyNote,
    fields: [{ key: 'text', label: 'Notiz', kind: 'textarea' }],
  },
  {
    id: 'incident',
    label: 'Vorkommnis',
    icon: AlertTriangle,
    accent: 'danger',
    fields: [
      { key: 'kind', label: 'Art', kind: 'select', options: ['Schaden', 'Grundberührung', 'Kollision', 'Verletzung', 'Ausfall', 'Sonstiges'] },
      { key: 'text', label: 'Beschreibung', kind: 'textarea' },
    ],
  },
  { id: 'mob', label: 'Mann über Bord', icon: LifeBuoy, quick: true, accent: 'danger', hidden: true },
  {
    id: 'waypoint',
    label: 'Wegpunkt erreicht',
    icon: Navigation,
    hidden: true,
    fields: [{ key: 'name', label: 'Wegpunkt', kind: 'text' }],
  },
];

export const ENTRY_TYPE_MAP = new Map(ENTRY_TYPES.map((t) => [t.id, t]));

export function entryLabel(type: string): string {
  return ENTRY_TYPE_MAP.get(type)?.label ?? type;
}

export interface UsageInfo {
  type: string;
  count: number;
  lastUsed: number;
}

const HALF_LIFE_DAYS = 14;

/** Score usage: count decayed by recency so stale favourites drift down. */
export function usageScore(u: UsageInfo | undefined, now: number): number {
  if (!u) return 0;
  const ageDays = (now - u.lastUsed) / 86_400_000;
  return u.count * Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

/** Sort entry types by usage, falling back to the default order. */
export function sortByUsage(types: EntryType[], usage: UsageInfo[], now = Date.now()): EntryType[] {
  const byType = new Map(usage.map((u) => [u.type, u]));
  const index = new Map(types.map((t, i) => [t.id, i]));
  return [...types].sort((a, b) => {
    const diff = usageScore(byType.get(b.id), now) - usageScore(byType.get(a.id), now);
    if (Math.abs(diff) > 1e-9) return diff;
    return index.get(a.id)! - index.get(b.id)!;
  });
}

/** Human readable summary of an entry's data. */
export function describeData(type: string, data: Record<string, EntryValue>): string {
  const def = ENTRY_TYPE_MAP.get(type);
  if (!def?.fields) return '';
  return def.fields
    .filter((f) => data[f.key] !== undefined && data[f.key] !== '')
    .map((f) => {
      const v = data[f.key];
      if (f.kind === 'course') return `${f.label} ${String(v).padStart(3, '0')}°`;
      return `${f.label}: ${v}${f.unit ? ' ' + f.unit : ''}`;
    })
    .join(', ');
}
