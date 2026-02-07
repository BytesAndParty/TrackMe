# TrackMe - TODO

## Erledigt

- [x] Vite + React 19 + TypeScript Projekt erstellt
- [x] React Compiler (Babel Plugin) aktiviert
- [x] TailwindCSS v4 konfiguriert
- [x] Dexie.js mit Datenmodell (Project, SubProject, WorkItemLink, TimeEntry + itemNr)
- [x] vite-plugin-pwa konfiguriert (Offline, installierbar)
- [x] Recharts installiert
- [x] Projektstruktur angelegt (db, components, pages, hooks, lib)
- [x] React Router mit Layout + Seiten-Skeletons
- [x] Excel-like Grid mit Tab-Navigation (Start, Ende, Projekt, Unterprojekt, Item Nr, Kommentar)
- [x] Smart Time Parser (0900, 18,5, 9:00 etc.)
- [x] Tagesansicht mit editierbarem Grid + Summen
- [x] Wochenansicht: Matrix Mo-So mit Projekt-Aggregation
- [x] Monatsansicht: Heatmap-Kalender mit Statistiken
- [x] Timer-Funktion: Start/Stop mit Auto-Save
- [x] Projektverwaltung: CRUD + Unterprojekte
- [x] Autovervollstaendigung fuer Projekte/Unterprojekte im Grid
- [x] Reports: Balkendiagramm (Stunden/Woche), Donut (Projektverteilung), Projekttabelle

## Offen

### MVP - noch fehlend

- [ ] Konfliktpruefung bei Zeitueberschneidungen (rote Markierung)
- [ ] Work-Item-IDs + ADO-Link-Schema (per Klick oeffnen)
- [ ] Unterprojekt-Statistik in Reports
- [ ] Work-Item-Auswertung (#ID-basiert) in Reports
- [ ] Liniendiagramm: Work-Item-Trend

### Import / Export

- [ ] CSV Export
- [ ] XLSX Export
- [ ] Excel-Import mit Mapping-Assistent
- [ ] Duplikat-Check beim Import
- [ ] Exportprofile (z.B. "myTE-Format")

### Sonstiges

- [ ] Taetigkeitsbeschreibung pro Unterprojekt/Tag zusammenfuehren
- [ ] Einstellbarer Zeitraum fuer geleistete Stunden
- [ ] PWA finalisieren: Icons, Splash Screen
- [ ] Netlify Deployment einrichten

### Nice-to-have (nach MVP)

- [ ] PDF Export
- [ ] Custom-Farbschema fuer Projekte
- [ ] Lokale Datenverschluesselung (AES)
- [ ] Automatische Backups der Datenbank
