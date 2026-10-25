import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../components/toast';
import { db } from '../db/db';
import { addEntry, removeEntry } from '../entries/entries';
import { ENTRY_TYPE_MAP, ENTRY_TYPES, sortByUsage, type EntryType } from '../entries/entryTypes';
import { formatPosition } from '../gps/nav';
import { useLive } from '../store/liveStore';

const PER_PAGE = 8;

export function LogTilesScreen() {
  const navigate = useNavigate();
  const usage = useLiveQuery(() => db.entryUsage.toArray(), [], []);
  const activeTripId = useLive((s) => s.activeTripId);
  const pagerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  const pages = useMemo(() => {
    const sorted = sortByUsage(
      ENTRY_TYPES.filter((t) => !t.hidden),
      usage,
    );
    const out: EntryType[][] = [];
    for (let i = 0; i < sorted.length; i += PER_PAGE) out.push(sorted.slice(i, i + PER_PAGE));
    return out;
  }, [usage]);

  const quickSave = async (t: EntryType) => {
    navigator.vibrate?.(30);
    const id = await addEntry(t.id);
    showToast(`${t.label} eingetragen`, { label: 'Rückgängig', run: () => void removeEntry(id) });
  };

  const onTile = (t: EntryType) => {
    if (t.quick) void quickSave(t);
    else navigate(`/eintrag/${t.id}`);
  };

  const onMob = async () => {
    navigator.vibrate?.([100, 50, 100]);
    const id = await addEntry('mob');
    const fix = useLive.getState().fix;
    showToast(`MOB-Position: ${formatPosition(fix?.lat ?? null, fix?.lon ?? null)}`, {
      label: 'Rückgängig',
      run: () => void removeEntry(id),
    });
  };

  const goTo = (i: number) => {
    const el = pagerRef.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  const mob = ENTRY_TYPE_MAP.get('mob')!;

  return (
    <div className="tiles-screen">
      {activeTripId == null && <div className="hint">Keine Fahrt aktiv – Einträge werden ohne Fahrt gespeichert.</div>}
      <button className="mob-button" onClick={onMob}>
        <mob.icon size={30} /> Mann über Bord
      </button>
      <div
        className="pager"
        ref={pagerRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setPage(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {pages.map((tiles, pi) => (
          <div className="tile-page" key={pi}>
            {tiles.map((t) => (
              <button key={t.id} className={`tile ${t.accent ?? ''} ${t.quick ? 'quick' : ''}`} onClick={() => onTile(t)}>
                <t.icon size={44} strokeWidth={2} />
                <span>{t.label}</span>
                {!t.quick && <span className="tile-more">…</span>}
              </button>
            ))}
          </div>
        ))}
      </div>
      {pages.length > 1 && (
        <div className="dots">
          {pages.map((_, i) => (
            <button key={i} className={`dot ${i === page ? 'active' : ''}`} onClick={() => goTo(i)} aria-label={`Seite ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}
