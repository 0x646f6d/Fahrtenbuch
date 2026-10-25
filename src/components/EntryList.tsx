import { useNavigate } from 'react-router-dom';
import type { LogEntry } from '../db/db';
import { describeData, ENTRY_TYPE_MAP, entryLabel } from '../entries/entryTypes';
import { fmtDate, fmtTime } from '../export/format';
import { formatCourse, formatPosition, formatSpeed } from '../gps/nav';

export function EntryList({ entries }: { entries: LogEntry[] }) {
  const navigate = useNavigate();
  if (entries.length === 0) return <p className="empty">Noch keine Einträge.</p>;
  let lastDay = '';
  return (
    <ul className="entry-list">
      {entries.map((e) => {
        const def = ENTRY_TYPE_MAP.get(e.type);
        const Icon = def?.icon;
        const day = fmtDate(e.ts);
        const showDay = day !== lastDay;
        lastDay = day;
        const details = [describeData(e.type, e.data), e.note].filter(Boolean).join(' – ');
        return (
          <li key={e.id}>
            {showDay && <div className="day-header">{day}</div>}
            <button className={`entry-row ${def?.accent ?? ''}`} onClick={() => navigate(`/eintrag/bearbeiten/${e.id}`)}>
              <span className="entry-time">{fmtTime(e.ts)}</span>
              {Icon && <Icon size={26} />}
              <span className="entry-main">
                <strong>{entryLabel(e.type)}</strong>
                {details && <span className="entry-details">{details}</span>}
                <span className="entry-meta mono">
                  {formatPosition(e.lat, e.lon)} · {formatCourse(e.cog)} · {formatSpeed(e.sog)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
