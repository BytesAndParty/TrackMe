# Projekt: Lokale Windows-Desktop-Zeiterfassungsapp (project.md)

## 1. Überblick

Ziel ist die Entwicklung einer lokalen Windows-Desktop-Anwendung, die es einzelnen Usern ermöglicht, ihre Arbeitsstunden extrem schnell zu erfassen, zu kategorisieren und zu analysieren. Jeder User installiert die App eigenständig, nutzt eine lokale Datenbank und kann Reports exportieren. Eine optionale Azure-DevOps-Verlinkung (Work-Item-URLs) erleichtert die Navigation zu Aufgaben.

---

## 2. Zielsetzung

- Schnellstmögliche Zeiteingabe (Tastatur-first, ähnlich oder schneller als Excel).
- Lokale Ausführung ohne Server, ohne Cloud-Abhängigkeit.
- Per-User-Datenhaltung (lokale SQLite-Datenbank).
- Project-, Subproject- und Work-Item-Struktur im Hintergrund pflegen.
- Reports exportieren (CSV, XLSX, PDF optional).
- Azure DevOps Links hinterlegen und direkt öffnen.
- Wöchentliche/monatliche Statistiken & Grafiken.

---

## 3. Anforderungen

### 3.1 Funktionale Anforderungen

#### Erfassung

- Schnellzeile: freie Eingabe wie `09:00 11:30 urb retro #1234 "Meeting"`.
- Automatisches Parsing für Uhrzeiten, Projektkürzel, Unterprojekte, Texte.
- Timer-Funktion: Start/Stop mit nachträglichem Editieren.
- Inline-Bearbeitung einer Tagesliste (Start/Ende/Projekt/Text/Item-Link).
- Konfliktprüfung bei Überschneidungen.

#### Masterdaten

- Projektmanagement (Name, Kürzel, aktiv/inaktiv).
- Unterprojekte (pro Projekt).
- Work-Item-IDs + ADO-Link-Schema.
- Favoriten und Autovervollständigung.

#### Ansichten

- Tagesansicht mit Zeilenliste + Summen.
- Wochenansicht ähnlich deiner Excel-Vorlage.
- Monatsübersicht.

#### Reports & Analytics

- Projekt-Statistik: Gesamtstunden, Trend, Anteil.
- Unterprojekt-Statistik.
- Work-Item-Auswertung (#ID-basiert).
- Exportierbar: CSV, XLSX; optional PDF.

#### Import/Export

- Import der bestehenden Excel-Daten (Mapping für Spalten).
- Exportprofile (CSV, XLSX, custom-Mapping).

#### Azure DevOps Integration (optional)

- Per Klick: Work-Item im Browser öffnen.
- Keine automatische Synchronisation im MVP.

---

## 4. Nicht-funktionale Anforderungen

- Plattform: Windows.
- Technologie: .NET 8 + WPF, lokale SQLite-Datenbank.
- Offline-first, keine Cloud.
- Hohe Performance (< 100 ms Reaktionszeit im UI).
- Sichere Speicherung von ADO-Tokens (Windows Credential Locker).
- Automatische Backups der SQLite-Datei.

---

## 5. Architektur

### 5.1 Komponenten

- UI-Schicht (WPF): Views + ViewModels.
- Core-Domain: Entities, Services, Parser, Validatoren.
- Datenzugriff: SQLite via EF Core.
- Reporting-Modul: Aggregationen + Charting.
- Import/Export-Modul: CSV/XLSX.
- ADO-Modul: URL-Generator, optional REST-Client.

### 5.2 Domänenmodell

Project: Id, Key, Name, Active

SubProject: Id, ProjectId, Key, Name

WorkItemLink: Id, ItemId, Url, ProjectId, SubProjectId

TimeEntry:

- Id
- Date
- StartTime, EndTime, DurationMinutes
- ProjectId, SubProjectId
- WorkItemLinkId
- TaskText, Notes

---

## 6. UX / UI Design

### 6.1 Schnell-Eingabe

- Eingabezeile immer fokussiert.
- Auto-Erkennung aller Muster.
- Sofortige Anlage + neue Zeile.

### 6.2 Tagesliste

- Tabelle: Start | Ende | Projekt | Task | #Item | Kommentar.
- Summenzeile unten.

### 6.3 Wochenmatrix

- Spalten: Montag – Sonntag + dynamisch wachsende zusätzliche Spalten.
- Die App erzeugt automatisch immer eine neue leere Spalte, sobald ein Eintrag gemacht wurde.
- Dadurch steht dem User immer eine freie Spalte zur Verfügung – identisch zum Verhalten in Excel.
- Die Wochenansicht kann somit flexibel wachsen, ohne manuell neue Felder anlegen zu müssen.
- Jede neue Spalte ist direkt editierbar und wird wie eine normale Tages-/Zeilenstruktur behandelt.

### 6.4 Reporting-Dashboard

- Balkendiagramme: Stunden je Woche.
- Donut: Anteil Projekte.
- Linie: Work-Item-Trend.

---

## 7. Import & Export

### 7.1 Import

- Excel-/CSV-Import.
- Mapping-Assistent.
- Duplikat-Check.

### 7.2 Export

- CSV/XLSX.
- Exportprofil (z. B. "myTE-Format").
- Warnings: fehlende Felder, Lücken, Überschneidungen.

---

## 8. Sicherheit

- Lokale Datenverschlüsselung (optional AES).
- Speicherung von Tokens ausschließlich im Windows Credential Locker.
- Keine Netzwerkaktivität außer optionalem ADO-Link-Open.

---

## 9. Akzeptanzkriterien (Beispiele)

```Json
Given die App ist geöffnet
When der User "09:00 11:30 urb retro #1234" eingibt
Then wird ein TimeEntry mit Start=09:00, Ende=11:30 erstellt
And das Projekt "urb" wird automatisch zugeordnet
And der WorkItemLink #1234 ist verknüpft
```

```Json
Given ein Eintrag mit WorkItemLink existiert
When der User auf den Link klickt
Then öffnet sich der Browser mit der korrekten ADO-URL
```

```Json
Given mehrere Einträge in Woche 5 existieren
When der User den Projekt-Report exportiert
Then wird ein XLSX generiert mit Summen je Tag, Projekt, Item
```

---

## 10. MVP Umfang

- Schnellzeile
- Tages- & Wochenansicht
- Projekt-/Unterprojektverwaltung
- Work-Item-Links
- Basis-Reports
- CSV/XLSX Export
- Excel-Import


---

## 11. Offene Punkte

- Zeitzonen-Unterstützung nötig? (vermutlich nein)
- Custom-Farbschema für Projekte?
- Benötigst du eine Portable-Version (ohne Installer)?

---

## 12. Zusammenfassung

Dieses Dokument definiert eine schnelle, lokal laufende, Windows-basierte Zeiterfassungs-App mit kleinem, robustem Datenmodell, schneller Eingabe, projektbezogenen Strukturen, ADO-Linkfähigkeit und umfangreichen Export-/Reporting-Funktionen – ideal für einzelne User.


## 13. Weitere Punkte
Ich möchte den Zeitraum mit den geleisteten Stunden einstellbar machen

---

## 14. Backlog (Stand 2026-07-08)

Noch nicht umgesetzt – Sammlung offener Punkte aus aktueller Review-Session.

### 14.1 Design
Aktuelles UI-Design ist nur ein erster Wurf und muss grundlegend überarbeitet werden. Scope/Richtung noch offen.

### 14.2 Day View – Bugs bei Anzeige & Speichern
Es gibt noch Bugs in der Day View, die Anzeige und Speichern betreffen. **Konkrete Symptome/Repro-Schritte stehen noch aus.**

### 14.3 Navigation aufräumen
Week-, Month- und Reports-View werden kaum genutzt. Diese unter einem gemeinsamen Nav-Reiter gruppieren statt als eigene Top-Level-Einträge (betrifft `Layout.tsx`).

### 14.4 Item-Erstellung: kein Auto-Create mehr
Automatische Item-Anlage beim Speichern eines Grid-Eintrags (aktuell in `useGridPersist.ts`, wenn eine unbekannte Item-Nr getippt wird) entfernen.

Stattdessen: Item-Nr oder Item-Titel eingeben; wird kein Treffer in den Vorschlägen gefunden, öffnet Enter oder Klick auf ein "+" das `ItemDetailModal` zur expliziten Neuanlage, vorbefüllt mit dem Eingegebenen.

### 14.5 Default-Text bei leerer Item-Beschreibung
`dayView.noItemDescription` ("Ohne Item/Beschreibung") ersetzen durch eine Formulierung, die allgemeine Entwickler-Tätigkeit beschreibt, z. B. "Allgemeine Anpassung, Verbesserung oder Solution Design" (DE + EN in `i18n.ts`).

### 14.6 Papierkorb-Position auf Items-Seite
Aktuell liegt der Papierkorb (Drag&Drop-Ziel) unterhalb der drei Kanban-Spalten und ist nur während des Ziehens sichtbar (`KanbanBoard.tsx`). Nach oben verschieben, neben die "Items"-Überschrift bzw. als Overlay.

### 14.7 Item-Vorschläge nach Unterprojekt filtern
Item-Nr-Vorschläge in der Day-View-Autocomplete sollen hart nach aktuell gewähltem Unterprojekt gefiltert werden (aktuell nur Sortier-Priorisierung über Buchungshistorie, kein echter Filter).

Entscheidung: `Item` bekommt ein neues optionales Feld `subProjectId` (DB-Schema-Migration nötig).
- Beim Neuanlegen eines Items wird `subProjectId` automatisch aus dem aktuell in der Zeile gesetzten Unterprojekt übernommen.
- Items ohne `subProjectId` werden unabhängig vom gewählten Unterprojekt weiter angezeigt (kein Filter greift).

### 14.8 Edge Case: Unterprojekt-Wechsel nach Item-Auswahl
Wenn ein Item ausgewählt ist und danach das Unterprojekt geändert wird, werden Item-Nr und Item-Titel der Zeile automatisch geleert.
