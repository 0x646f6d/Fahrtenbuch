import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Check, Minus, Navigation, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { showToast } from '../components/toast';
import { db, type EntryValue } from '../db/db';
import { addEntry, removeEntry, updateEntry } from '../entries/entries';
import { ENTRY_TYPE_MAP, type FieldDef } from '../entries/entryTypes';
import { fmtDateTime } from '../export/format';
import { formatCourse, formatPosition, formatSpeed, normalizeDeg } from '../gps/nav';
import { useLive } from '../store/liveStore';

function CourseInput({ value, onChange }: { value: EntryValue | undefined; onChange: (v: number) => void }) {
  const cog = useLive((s) => s.fix?.cog ?? null);
  const n = value === undefined || value === '' ? null : Number(value);
  const step = (d: number) => onChange(Math.round(normalizeDeg((n ?? 0) + d)));
  return (
    <div className="course-input">
      <button type="button" onClick={() => step(-10)}>−10</button>
      <button type="button" onClick={() => step(-1)}><Minus /></button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={359}
        value={n ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? NaN : Math.round(normalizeDeg(Number(e.target.value))))}
      />
      <button type="button" onClick={() => step(1)}><Plus /></button>
      <button type="button" onClick={() => step(10)}>+10</button>
      <button type="button" className="secondary wide" onClick={() => cog != null && onChange(Math.round(cog) % 360)} disabled={cog == null}>
        <Navigation size={18} /> aktueller Kurs {formatCourse(cog)}
      </button>
    </div>
  );
}

function Field({ def, value, onChange }: { def: FieldDef; value: EntryValue | undefined; onChange: (v: EntryValue) => void }) {
  switch (def.kind) {
    case 'course':
      return <CourseInput value={value} onChange={onChange} />;
    case 'select':
      return (
        <div className="chips">
          {def.options!.map((o) => (
            <button type="button" key={o} className={`chip ${value === o ? 'active' : ''}`} onClick={() => onChange(value === o ? '' : o)}>
              {o}
            </button>
          ))}
        </div>
      );
    case 'textarea':
      return <textarea rows={4} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'number':
      return (
        <div className="with-unit">
          <input
            type="number"
            inputMode="decimal"
            min={def.min}
            max={def.max}
            step={def.step ?? 'any'}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
          {def.unit && <span className="unit">{def.unit}</span>}
        </div>
      );
    default:
      return <input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
}

export function EntryFormScreen() {
  const navigate = useNavigate();
  const params = useParams();
  const editId = params.id ? Number(params.id) : null;
  const existing = useLiveQuery(() => (editId != null ? db.logEntries.get(editId) : undefined), [editId]);
  const typeId = editId != null ? existing?.type : params.type;
  const def = typeId ? ENTRY_TYPE_MAP.get(typeId) : undefined;
  const fix = useLive((s) => s.fix);

  const [data, setData] = useState<Record<string, EntryValue>>({});
  const [note, setNote] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || !def) return;
    if (editId != null) {
      if (!existing) return;
      setData(existing.data);
      setNote(existing.note ?? '');
    } else {
      setData(def.prefill?.(useLive.getState().fix) ?? {});
    }
    setInitialized(true);
  }, [def, editId, existing, initialized]);

  if (!def) {
    return <div className="page"><p>{editId != null && existing === undefined ? 'Lade…' : 'Unbekannter Eintrag'}</p></div>;
  }

  const clean = () =>
    Object.fromEntries(Object.entries(data).filter(([, v]) => v !== '' && !(typeof v === 'number' && Number.isNaN(v))));

  const save = async () => {
    if (editId != null) {
      await updateEntry(editId, { data: clean(), note: note || undefined });
      showToast('Eintrag gespeichert');
      navigate(-1);
    } else {
      const id = await addEntry(def.id, clean(), note);
      showToast(`${def.label} eingetragen`, { label: 'Rückgängig', run: () => void removeEntry(id) });
      navigate('/eintraege');
    }
  };

  const del = async () => {
    if (editId == null || !confirm('Eintrag löschen?')) return;
    await removeEntry(editId);
    showToast('Eintrag gelöscht');
    navigate(-1);
  };

  const telemetry = editId != null && existing ? existing : { ts: Date.now(), lat: fix?.lat ?? null, lon: fix?.lon ?? null, cog: fix?.cog ?? null, sog: fix?.sog ?? null };

  return (
    <div className="page form-page">
      <div className="page-header">
        <button className="icon-button" onClick={() => navigate(-1)} aria-label="Zurück"><ArrowLeft size={28} /></button>
        <def.icon size={30} />
        <h1>{def.label}</h1>
        {editId != null && (
          <button className="icon-button danger" onClick={del} aria-label="Löschen"><Trash2 size={26} /></button>
        )}
      </div>
      <div className="telemetry">
        <span>{fmtDateTime(telemetry.ts)}</span>
        <span className="mono">{formatPosition(telemetry.lat, telemetry.lon)}</span>
        <span>COG {formatCourse(telemetry.cog)} · SOG {formatSpeed(telemetry.sog)}</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {def.fields?.map((f) => (
          <div key={f.key} className="field">
            <span className="field-label">{f.label}</span>
            <Field def={f} value={data[f.key]} onChange={(v) => setData((d) => ({ ...d, [f.key]: v }))} />
          </div>
        ))}
        {def.id !== 'note' && (
          <label className="field">
            <span className="field-label">Bemerkung</span>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        )}
        <button type="submit" className="primary big-button">
          <Check size={28} /> Speichern
        </button>
      </form>
    </div>
  );
}
