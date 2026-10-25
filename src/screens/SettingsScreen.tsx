import { Database, Download, FileSpreadsheet, Moon, Sun, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { showToast } from '../components/toast';
import { clearAllData } from '../db/db';
import { saveSetting, useSettings } from '../db/settings';
import { restoreBackup } from '../export/backup';
import { exportAllEntriesCsv, exportBackup } from '../export/exportTrip';
import { LayerToggles } from '../map/LayerToggles';
import { initTracking, resetTracking, setLogInterval } from '../gps/service';
import { initRoute, setArrivalRadius, stopRoute } from '../route/active';

const INTERVALS = [2, 5, 10, 30, 60];
const ARRIVAL_RADII = [0.05, 0.1, 0.2, 0.5];
const CONFIRM_WORD = 'LÖSCHEN';

export function SettingsScreen() {
  const settings = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      const res = await fn();
      if (res === 'downloaded') showToast('Datei heruntergeladen');
      else if (ok) showToast(ok);
    } catch (e) {
      showToast(`Fehler: ${(e as Error).message}`);
    }
  };

  const onImport = async (file: File) => {
    if (!confirm('Alle vorhandenen Daten werden durch die Sicherung ersetzt. Fortfahren?')) return;
    await run(async () => {
      await restoreBackup(await file.text());
      resetTracking();
      await initTracking();
      await initRoute();
    }, 'Sicherung wiederhergestellt');
  };

  const wipe = async () => {
    await run(async () => {
      await clearAllData(true);
      resetTracking();
      stopRoute();
    }, 'Alle Daten gelöscht');
    setConfirmOpen(false);
    setConfirmText('');
  };

  return (
    <div className="page settings">
      <div className="page-header">
        <h1>Einstellungen</h1>
      </div>

      <section>
        <h2>Boot</h2>
        <div className="field">
          <span className="field-label">Bootsname</span>
          <input type="text" value={settings.boatName} onChange={(e) => void saveSetting('boatName', e.target.value)} />
        </div>
      </section>

      <section>
        <h2>GPS-Aufzeichnung</h2>
        <div className="field">
          <span className="field-label">Trackpunkt alle</span>
          <div className="chips">
            {INTERVALS.map((s) => (
              <button
                key={s}
                className={`chip ${settings.logIntervalSec === s ? 'active' : ''}`}
                onClick={() => {
                  setLogInterval(s);
                  void saveSetting('logIntervalSec', s);
                }}
              >
                {s} s
              </button>
            ))}
          </div>
        </div>
        <p className="hint">
          Die App muss für die Aufzeichnung im Vordergrund bleiben – der Bildschirm wird während einer Fahrt wach gehalten.
        </p>
      </section>

      <section>
        <h2>Routen-Navigation</h2>
        <div className="field">
          <span className="field-label">Wegpunkt erreicht im Umkreis von</span>
          <div className="chips">
            {ARRIVAL_RADII.map((r) => (
              <button
                key={r}
                className={`chip ${settings.arrivalRadiusNm === r ? 'active' : ''}`}
                onClick={() => setArrivalRadius(r)}
              >
                {r.toLocaleString('de-AT')} sm
              </button>
            ))}
          </div>
        </div>
        <p className="hint">
          Danach schaltet die Navigation zum nächsten Wegpunkt und schreibt „Wegpunkt erreicht“ ins Logbuch. Routen und Orte
          verwaltest du über das Wegweiser-Symbol auf der Karte.
        </p>
      </section>

      <section>
        <h2>Anzeige</h2>
        <div className="chips">
          <button className={`chip ${settings.theme === 'day' ? 'active' : ''}`} onClick={() => void saveSetting('theme', 'day')}>
            <Sun size={20} /> Tag
          </button>
          <button className={`chip ${settings.theme === 'night' ? 'active' : ''}`} onClick={() => void saveSetting('theme', 'night')}>
            <Moon size={20} /> Nacht
          </button>
        </div>
      </section>

      <section>
        <h2>Kartenebenen (OpenSeaMap)</h2>
        <p className="hint">Auch direkt auf der Karte über das Ebenen-Symbol umschaltbar.</p>
        <LayerToggles />
      </section>

      <section>
        <h2>Export &amp; Sicherung</h2>
        <p className="hint">Einzelne Fahrten (PDF, CSV, GPX) exportierst du in der Fahrten-Ansicht.</p>
        <div className="export-grid">
          <button onClick={() => run(exportAllEntriesCsv)}><FileSpreadsheet size={28} />Alle Einträge CSV</button>
          <button onClick={() => run(exportBackup)}><Download size={28} />Sicherung (JSON)</button>
          <button onClick={() => fileRef.current?.click()}><Upload size={28} />Sicherung laden</button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void onImport(f);
          }}
        />
      </section>

      <section className="danger-zone">
        <h2><Database size={22} /> Daten zurücksetzen</h2>
        {!confirmOpen ? (
          <button className="danger big-button" onClick={() => setConfirmOpen(true)}>
            <Trash2 size={24} /> Alle Daten löschen
          </button>
        ) : (
          <div className="confirm-box">
            <p>
              Alle Fahrten, Tracks, Einträge, Routen und Orte werden unwiderruflich gelöscht. Erstelle vorher eine Sicherung.
              Zum Bestätigen <strong>{CONFIRM_WORD}</strong> eingeben:
            </p>
            <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus />
            <div className="row">
              <button className="secondary" onClick={() => { setConfirmOpen(false); setConfirmText(''); }}>Abbrechen</button>
              <button className="danger" disabled={confirmText.trim().toUpperCase() !== CONFIRM_WORD} onClick={wipe}>
                Endgültig löschen
              </button>
            </div>
          </div>
        )}
      </section>
      <p className="version">Fahrtenbuch v{__APP_VERSION__} · Daten werden nur auf diesem Gerät gespeichert.</p>
    </div>
  );
}
