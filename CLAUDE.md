# CLAUDE.md – Fahrtenbuch

Logbuch-App für (Segel-)Boote als Progressive Web App. Rein clientseitig: **kein Backend**, alle Daten liegen in IndexedDB auf dem Gerät.

- Live: https://0x646f6d.github.io/Fahrtenbuch/ (GitHub Pages, automatisch bei Push auf `main`)
- Repo: `0x646f6d/Fahrtenbuch`
- Sprache der Oberfläche, Commits und Doku: **Deutsch**. Datums-/Zeitformat `de-AT`.

## Produktanforderungen (ursprüngliche Story)

1. **Hauptbildschirm**: OpenSeaMap mit Bootsposition, gefahrene Strecke eingezeichnet, GPS-Position wird alle paar Sekunden geloggt. Statusleiste mit Kurs u. a.
2. **Logbuch-Einträge**: über ein einfaches Menü erreichbare Kacheln, groß genug, um sie in Fahrt zu lesen und zu treffen, auf mehrere Screens verteilt, mit Icons. Oft benutzte Einträge (z. B. „Wende“, „Neuer Kurs“) werden vorgereiht. Bekannte Telemetrie wird vorausgefüllt (z. B. „Neuer Kurs“ übernimmt den GPS-Kurs).
3. **Export**: PDF/CSV, Teilen über die App (umgesetzt: PDF, CSV, GPX, JSON-Sicherung, Web Share API).
4. **Zurücksetzen**: alle Daten löschen können.
5. Release 1 speichert nur am Client; ein Backend ist ausdrücklich nicht Teil davon.

## Befehle

```bash
npm install
npm run dev        # Vite-Dev-Server
npm test           # vitest run (jsdom + fake-indexeddb)
npm run typecheck  # tsc --noEmit
npm run build      # tsc --noEmit && vite build -> dist/
npm run preview    # gebauten Stand lokal ausliefern (Port 4173)
```

Vor jedem Commit: `npm test` und `npm run build` müssen grün sein (CI führt beides aus).

## Stack

| Bereich | Bibliothek |
|---|---|
| Build | Vite 8, TypeScript 7 (`moduleResolution: bundler`, strict, `noUnusedLocals/Parameters`) |
| UI | React 19, `react-router-dom` 7 mit **HashRouter** |
| PWA | `vite-plugin-pwa` 2 (generateSW, `registerType: autoUpdate`) |
| Karte | Leaflet 1.9 + `react-leaflet` 5 |
| Speicher | Dexie 4 + `dexie-react-hooks` (`useLiveQuery`) |
| State | Zustand 5 (nur Live-Telemetrie & Toasts) |
| Icons | `lucide-react` |
| PDF | `jspdf` + `jspdf-autotable` (dynamisch importiert) |
| Tests | Vitest 5, jsdom, `fake-indexeddb`, `@testing-library/react` |

Kein ESLint/Prettier eingerichtet; Stil: 2 Spaces, Single Quotes, Semikolons, Zeilen bis ~120 Zeichen.

## Verzeichnisstruktur

```
src/
  main.tsx                 Einstieg: Leaflet-CSS, styles.css, storage.persist(), initTracking()
  App.tsx                  HashRouter, Layout (StatusBar / Routes / BottomNav / ToastView), Theme -> <html data-theme>
  styles.css               gesamtes CSS, Farb-Variablen; Nachtmodus über :root[data-theme='night']
  vite-env.d.ts            __APP_VERSION__ (aus package.json via define)
  db/
    db.ts                  Dexie-Schema + clearAllData, deleteTrip, getActiveTrip, recordUsage/unrecordUsage
    settings.ts            Settings (Key/Value-Tabelle), DEFAULT_SETTINGS, loadSettings, saveSetting, useSettings
    hooks.ts               useTrack(tripId), useTripEntries(tripId)
  gps/
    service.ts             watchPosition, Trip starten/beenden, Track schreiben, initTracking/resetTracking
    recorder.ts            decide(): ob ein Fix als Trackpunkt gespeichert wird (rein, getestet)
    motion.ts              MotionEstimator: SOG/COG (Gerätewerte bevorzugt, sonst aus Historie, geglättet)
    nav.ts                 Haversine (sm), Peilung, Kreismittel, Formatierung (Pos/Kurs/Fahrt/Dauer)
    wakeLock.ts            Screen Wake Lock während aktiver Fahrt
  store/liveStore.ts       Zustand: GPS-Status, aktueller Fix, aktive Fahrt, Fahrtdistanz
  entries/
    entryTypes.ts          ALLE Eintragstypen (Icon, Felder, prefill), sortByUsage, describeData
    entries.ts             addEntry (stempelt Zeit/Pos/SOG/COG), updateEntry, removeEntry
  export/
    pdf.ts csv.ts gpx.ts   Generatoren
    backup.ts              JSON-Sicherung erstellen/wiederherstellen
    exportTrip.ts          Orchestrierung je Format + Gesamt-CSV + Backup
    share.ts               shareOrDownload (Web Share API Level 2, Fallback Download), Dateinamen
    format.ts              fmtDate/fmtTime/fmtDateTime (de-AT)
  map/
    layers.ts              OVERLAYS (OpenSeaMap-Ebenen), isLayerOn, toggleLayer, gridStep/gridLabel
    MapLayers.tsx          OSM-Basiskarte + aktivierte Overlays (XYZ, WMS, Gitter) – in jeder Karte verwenden
    LayerToggles.tsx       Schalterliste (Karten-Panel und Einstellungen)
    Graticule.tsx          Koordinatengitter mit Beschriftung
  components/              StatusBar, BottomNav, ToastView + toast.ts (showToast), TrackLayers, EntryList
  screens/                 MapScreen, LogTilesScreen, EntryFormScreen, LogbookScreen, TripsScreen,
                           TripDetailScreen, SettingsScreen
  test/setup.ts            importiert fake-indexeddb/auto
public/                    icon.svg, icon-192.png, icon-512.png (PNG aus SVG gerendert)
.github/workflows/deploy.yml  Test + Build + Deploy auf GitHub Pages
```

## Routen (Hash-Routing)

| Pfad | Screen |
|---|---|
| `#/` | Karte |
| `#/eintraege` | Eintrags-Kacheln |
| `#/eintrag/:type` | Formular für neuen Eintrag |
| `#/eintrag/bearbeiten/:id` | Eintrag bearbeiten/löschen |
| `#/logbuch` | Einträge (aktuelle/letzte Fahrt, alle, je Fahrt) |
| `#/fahrten`, `#/fahrten/:id` | Fahrtenliste, Detail mit Karte + Export |
| `#/einstellungen` | Bootsname, Log-Intervall, Theme, Export/Sicherung, Daten löschen |

## Datenmodell (Dexie DB `fahrtenbuch`, Version 1)

| Tabelle | Schlüssel/Indizes | Felder |
|---|---|---|
| `trips` | `++id, startedAt, endedAt` | `name, startedAt, endedAt?, distanceNm` – offene Fahrt = `endedAt` undefined |
| `trackPoints` | `++id, tripId, [tripId+ts]` | `lat, lon, sog (kn), cog (°), accuracy (m), gap?` |
| `logEntries` | `++id, tripId, ts, type` | `tripId` (null = ohne Fahrt), `lat, lon, sog, cog, data: Record<string,string\|number>, note?` |
| `entryUsage` | `type` | `count, lastUsed` – für Kachel-Sortierung |
| `settings` | `key` | `value` – Keys: `boatName, logIntervalSec, theme ('day'\|'night'), followBoat, mapLayers` |

Schemaänderungen **immer** über eine neue `db.version(n)` mit Upgrade, nie Version 1 ändern – Nutzer haben echte Daten im Browser. Bei neuen Tabellen auch `clearAllData`, `backup.ts` (`Backup`-Typ, create/restore) anpassen.

## Einheiten & Konventionen

- Geschwindigkeit in **Knoten** (`MS_TO_KN = 1.943844`), Distanz in **Seemeilen (sm)**, Kurs in Grad 0–359, Position als Grad/Dezimalminuten (`54°19.301′N 010°08.501′E`).
- Zeitstempel überall `Date.now()`-Millisekunden.
- Nicht-reaktiver Zugriff auf Live-Daten: `useLive.getState()`; in Komponenten Selektoren `useLive((s) => s.fix)`.
- DB-Lesen in Komponenten über `useLiveQuery` (aktualisiert sich automatisch).
- Rückmeldungen über `showToast(text, { label, run })` (z. B. „Rückgängig“).
- Bestätigungen derzeit per `confirm()`/`prompt()`; „Alle Daten löschen“ verlangt Eingabe `LÖSCHEN`.

## GPS & Track (gps/)

- `navigator.geolocation.watchPosition` mit `enableHighAccuracy`, startet beim App-Start (`initTracking`) und stellt eine offene Fahrt wieder her.
- Trackpunkt-Regeln in `recorder.ts` (`decide`):
  - Fix mit `accuracy > 50 m` verwerfen (`MAX_ACCURACY_M`)
  - nur alle `logIntervalSec` (Standard 5 s, Auswahl 2/5/10/30/60)
  - implizite Geschwindigkeit > 60 kn = Sprung → verwerfen
  - Abstand > max(30 s, 6 × Intervall) → `gap: true`, keine Distanz (neues Track-Segment, auch im GPX)
- SOG/COG (`motion.ts`): Gerätewerte bevorzugt, sonst aus Fix ≥ 3 s zurück (Historie 15 s); COG über letzte 3 Werte kreisgemittelt; unter 0,5 kn bleibt der letzte Kurs stehen.
- Schreibvorgänge werden in `service.ts` über eine Promise-Kette serialisiert; `trips.distanceNm` wird laufend mitgeschrieben, Live-Wert steht in `useLive().tripDistanceNm`.
- Während einer Fahrt Wake Lock aktiv.
- **Einschränkung**: PWAs erhalten im Hintergrund/bei gesperrtem Bildschirm (v. a. iOS) keine Positionen. Echtes Hintergrund-Tracking bräuchte eine native Hülle (z. B. Capacitor). Geolocation nur über HTTPS/localhost.

## Eintragstypen (entries/entryTypes.ts)

- `quick: true` → ein Tipp speichert sofort (Toast mit Rückgängig). Sonst Formular mit `fields` (`number | text | textarea | select | course`) und optionalem `prefill(fix)`.
- Jeder Eintrag bekommt automatisch Zeit, Position, SOG, COG und `tripId` der aktiven Fahrt; Formular hat zusätzlich „Bemerkung“ (`note`).
- Aktuelle Typen: Wende, Neuer Kurs (prefill COG), Halse, Ablegen, Anlegen, Anker auf, Anker fallen, Motor an/aus, Segel setzen/bergen, Reffen, Ausreffen, Wetter, Wache/Crew, Fahrt/Log (prefill SOG), Motorstunden, Tanken, Wasser, Wassertiefe, Position, Notiz, Vorkommnis, Mann über Bord.
- `mob` wird nicht im Raster gezeigt, sondern als immer sichtbarer roter Button oben im Kachel-Screen.
- Sortierung `sortByUsage`: `count × 0.5^(AlterTage/14)`, bei Gleichstand Reihenfolge des Arrays. Die Array-Reihenfolge ist also die Standardreihenfolge.
- Kacheln: 8 pro Seite (2×4, ab 700 px Breite 4×2), Seiten per horizontalem Scroll-Snap.
- Neuen Typ hinzufügen = Eintrag in `ENTRY_TYPES` (id stabil halten – sie steht in der DB!).

## Kartenebenen (map/)

- Basiskarte immer OSM (`tile.openstreetmap.org`). Overlays sind in `OVERLAYS` definiert (Reihenfolge = Zeichenreihenfolge), Quellen wie auf map.openseamap.org:

| id | Ebene | Quelle | Standard |
|---|---|---|---|
| `gebco` | Wassertiefe (GEBCO) | WMS `geoserver.openseamap.org/geoserver/gwc/service/wms`, `gebco2021:gebco_2021`, Deckkraft 0,8 | aus |
| `contours` | Tiefenlinien | WMS `depth.openseamap.org/geoserver/openseamap/wms`, `openseamap:contour2,openseamap:contour` | aus |
| `depthPoints10` | Tiefen-Messpunkte 10 m | dito, `openseamap:tracks_10m` | aus |
| `depthPoints100` | Tiefen-Messpunkte 100 m | dito, `openseamap:tracks_100m` | aus |
| `seamarks` | Seezeichen | XYZ `tiles.openseamap.org/seamark/{z}/{x}/{y}.png` | an |
| `sport` | Wassersport | XYZ `tiles.openseamap.org/sport/{z}/{x}/{y}.png` | aus |
| `grid` | Koordinatengitter | clientseitig (`Graticule.tsx`) | aus |

- Zustand in Setting `mapLayers` (`Partial<Record<OverlayId, boolean>>`); fehlender Eintrag = `defaultOn`. Ebenen mit gleichem `group` schließen sich aus (Messpunkte 10 m/100 m).
- Umschalten über den Ebenen-Button auf der Karte (Bottom-Sheet) oder in den Einstellungen.
- WMS wird über Leaflets `WMSTileLayer` gekachelt abgerufen (Version 1.1.1, transparentes PNG). Neue Ebene = Eintrag in `OVERLAYS`; neue Hosts auch im Workbox-`urlPattern` in `vite.config.ts` ergänzen.
- Gitterabstand richtet sich nach Pixeln (`gridStep`, mind. 90 px), Breitenbeschriftung links, Längenbeschriftung oben.
- Nicht übernommen: Häfen (braucht PHP-Proxy von OpenSeaMap), AIS (MarineTraffic), Luftbild (Bing-Key).

## Export

- **PDF** (A4 quer, je Fahrt): Kopf mit Boot/Fahrt/Dauer/Distanz, Tabelle aller Einträge. Standard-PDF-Fonts können nur WinAnsi → Sonderzeichen über `pdfSafe` ersetzen (z. B. `′` → `'`).
- **CSV**: Semikolon, Dezimalkomma, UTF-8 mit BOM (Excel-DE). Einträge je Fahrt oder gesamt; Track separat.
- **GPX 1.1**: Track mit Segmenten an Lücken, Einträge als `<wpt>`. Keine Nicht-Standard-Elemente in `<trkpt>`.
- **JSON-Sicherung**: alle Tabellen; `restoreBackup` ersetzt den kompletten Bestand (prüft `app === 'fahrtenbuch'`).
- Ausgabe über `shareOrDownload` (Teilen-Menü, sonst Download).

## PWA / Deployment

- `vite.config.ts`: `base: './'` (relative Pfade, damit die Seite unter `/Fahrtenbuch/` läuft), Manifest (de, standalone), Precache aller Assets, Runtime-Cache `CacheFirst` für Kacheln von `tile.openstreetmap.org`, `tiles.openseamap.org`, `geoserver.openseamap.org` und `depth.openseamap.org` (max. 5000, 60 Tage).
- Kartenlayer siehe „Kartenebenen“. Attributionen beibehalten.
- `navigator.storage.persist()` wird beim Start angefordert.
- `.github/workflows/deploy.yml`: bei Push auf `main` (und manuell) → `npm ci`, `npm test`, `npm run build`, Upload `dist/`, Deploy auf GitHub Pages. Pages-Quelle im Repo steht auf „GitHub Actions“.
- Die installierte PWA aktualisiert sich automatisch (autoUpdate); neue Version ggf. erst beim nächsten Öffnen sichtbar.

## Tests

- Unit-Tests liegen neben dem Code (`*.test.ts`): `nav`, `recorder`, `motion`, `entryTypes`, `export` (CSV/GPX), `db` (inkl. Backup-Round-Trip), `map/layers`.
- UI-Prüfung bei Bedarf mit Playwright gegen `npm run preview`; Geolocation mit `context.setGeolocation` simulieren (Berechtigung `geolocation` setzen).

## Stolperfallen

- Formularfelder mit Buttons (Chips, Kurs-Stepper) **nicht** in `<label>` packen – ein Klick aufs Label löst sonst den ersten Button aus. Es wird `<div className="field">` verwendet.
- Die globale CSS-Klasse `.danger` setzt einen roten Hintergrund; bei Icon-Buttons/Listenzeilen wird sie gezielt überschrieben.
- Leaflet-Kacheln werden im Nachtmodus per CSS-Filter rot/dunkel eingefärbt.
- Große Bundles: jsPDF wird erst beim PDF-Export geladen; `chunkSizeWarningLimit` steht auf 700 kB.

## Git-Workflow

- Der Nutzer wünscht Commits **direkt auf `main`** (jeder Push deployt automatisch).
- Commit-Messages auf Deutsch, Betreff kurz und beschreibend.
