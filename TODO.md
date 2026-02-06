# TrackMe - TODO

## Erledigt

- [x] Vite + React 19 + TypeScript Projekt erstellt
- [x] React Compiler (Babel Plugin) aktiviert
- [x] TailwindCSS v4 konfiguriert
- [x] Dexie.js mit Datenmodell (Project, SubProject, WorkItemLink, TimeEntry)
- [x] vite-plugin-pwa konfiguriert (Offline, installierbar)
- [x] Recharts installiert
- [x] Projektstruktur angelegt (db, components, pages, hooks, lib)
- [x] React Router mit Layout + Seiten-Skeletons (Tag, Woche, Monat, Reports, Projekte)

## Offen

### MVP - Kernfunktionen

- [ ] Schnellzeile: Parser fuer Eingaben wie `09:00 11:30 urb retro #1234 "Meeting"`
- [ ] Tagesansicht: Zeilenliste mit Start/Ende/Projekt/Task/#Item/Kommentar + Summen
- [ ] Inline-Bearbeitung der Tageseintraege
- [ ] Wochenansicht: Matrix Mo-So mit dynamisch wachsenden Spalten
- [ ] Monatsueebrsicht
- [ ] Timer-Funktion: Start/Stop mit nachtraeglichem Editieren
- [ ] Konfliktpruefung bei Zeitueberschneidungen

### Masterdaten

- [ ] Projektverwaltung (Name, Kuerzel, aktiv/inaktiv)
- [ ] Unterprojekte (pro Projekt)
- [ ] Work-Item-IDs + ADO-Link-Schema
- [ ] Favoriten & Autovervollstaendigung fuer Schnellzeile

### Reports & Analytics

- [ ] Projekt-Statistik: Gesamtstunden, Trend, Anteil
- [ ] Unterprojekt-Statistik
- [ ] Work-Item-Auswertung (#ID-basiert)
- [ ] Balkendiagramme: Stunden je Woche
- [ ] Donut: Anteil Projekte
- [ ] Linie: Work-Item-Trend

### Import / Export

- [ ] CSV Export
- [ ] XLSX Export
- [ ] Excel-Import mit Mapping-Assistent
- [ ] Duplikat-Check beim Import
- [ ] Exportprofile (z.B. "myTE-Format")

### Azure DevOps Integration

- [ ] Per Klick: Work-Item im Browser oeffnen
- [ ] URL-Schema konfigurierbar

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
- [ ] Portable Version (ohne Installer)
