# Fahrtenbuch

Logbuch-App für Boote als Progressive Web App (React, Vite). Alle Daten bleiben auf dem Gerät (IndexedDB) – es gibt kein Backend.

## Funktionen

- **Karte**: OpenStreetMap mit OpenSeaMap-Seezeichen, Bootsposition (Pfeil nach COG), aufgezeichneter Track und Logbuch-Einträge als Marker. „Karte folgt Boot“ schaltbar.
- **Statusleiste**: SOG, COG, Position, Distanz und Dauer der laufenden Fahrt, GPS-Genauigkeit, Uhrzeit.
- **GPS-Track**: Während einer Fahrt wird alle 2–60 s (einstellbar, Standard 5 s) ein Trackpunkt gespeichert. Ungenaue Positionen (> 50 m) und unplausible Sprünge werden verworfen, Lücken (z. B. App im Hintergrund) werden als neues Track-Segment markiert und nicht zur Distanz gezählt.
- **Einträge**: Große Kacheln mit Icons, auf mehrere Seiten verteilt (wischen). Häufig genutzte Einträge rücken nach vorne (Nutzungszähler mit Abklingzeit von 14 Tagen). Schnell-Einträge (Wende, Halse, Reffen, Anker, Motor …) werden mit einem Tipp gespeichert und lassen sich über den Hinweis rückgängig machen. Jeder Eintrag erhält automatisch Zeit, Position, COG und SOG; „Neuer Kurs“ übernimmt den aktuellen GPS-Kurs. Ein „Mann über Bord“-Button ist immer sichtbar.
- **Logbuch & Fahrten**: Einträge je Fahrt ansehen, bearbeiten und löschen; Fahrten umbenennen und löschen.
- **Export / Teilen** (über das Teilen-Menü des Geräts, sonst als Download):
  - PDF: klassisches Logbuch einer Fahrt
  - CSV: Einträge (Semikolon/Dezimalkomma für Excel) und Track-Punkte
  - GPX: Track und Einträge als Wegpunkte (z. B. für OpenCPN, Navionics)
  - JSON-Sicherung aller Daten inkl. Wiederherstellung
- **Zurücksetzen**: „Alle Daten löschen“ in den Einstellungen (Bestätigung durch Eingabe von `LÖSCHEN`).
- **Nachtmodus** mit rotem Farbschema, Offline-Betrieb durch Service Worker; zuletzt angesehene Kartenkacheln werden zwischengespeichert.

## Entwicklung

```bash
npm install
npm run dev       # Entwicklungsserver
npm test          # Unit-Tests (vitest)
npm run build     # Typprüfung + Produktions-Build nach dist/
npm run preview   # Build lokal ansehen
```

## Deployment

Jeder Push auf `main` wird per GitHub Actions (`.github/workflows/deploy.yml`) getestet, gebaut und auf GitHub Pages veröffentlicht:
**https://0x646f6d.github.io/Fahrtenbuch/**

Einmalig nötig: unter *Settings → Pages → Build and deployment → Source* „GitHub Actions“ auswählen.

Geolocation funktioniert nur über HTTPS (oder `localhost`). Für den Einsatz die Inhalte von `dist/` auf einem beliebigen statischen Host mit HTTPS ablegen (z. B. GitHub Pages, Netlify); die App nutzt relative Pfade und Hash-Routing.

## Bekannte Einschränkungen

- Browser liefern einer PWA im Hintergrund bzw. bei gesperrtem Bildschirm (vor allem iOS) keine GPS-Positionen. Die App hält deshalb während einer Fahrt den Bildschirm wach (Wake Lock) und sollte im Vordergrund bleiben. Echtes Hintergrund-Tracking erfordert eine native Hülle (z. B. Capacitor).
- Die Daten liegen nur im Browser-Speicher dieses Geräts. Die App fordert dauerhaften Speicher an, trotzdem regelmäßig eine JSON-Sicherung exportieren.
- Kartenkacheln stehen offline nur für bereits angesehene Gebiete zur Verfügung.

## Aufbau

```
src/
  db/          Dexie-Schema (Fahrten, Trackpunkte, Einträge, Nutzung, Einstellungen)
  gps/         Geolocation-Dienst, Track-Aufzeichnung, Navigationsberechnungen, Wake Lock
  entries/     Eintragstypen (Icons, Felder, Vorbelegung) und Sortierung nach Nutzung
  export/      PDF, CSV, GPX, JSON-Sicherung, Teilen
  screens/     Karte, Kacheln, Formular, Logbuch, Fahrten, Einstellungen
  components/  Statusleiste, Navigation, Karten-Layer, Hinweise
```

Neue Eintragstypen werden in `src/entries/entryTypes.ts` ergänzt.
