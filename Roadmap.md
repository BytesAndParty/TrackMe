# Projekt: Lokale Windows-Desktop-Zeiterfassungsapp (project.md)

## 1. Überblick

Ziel ist die Entwicklung einer lokalen Windows-Desktop-Anwendung, die es
einzelnen Usern ermöglicht, ihre Arbeitsstunden extrem schnell zu erfassen, zu
kategorisieren und zu analysieren. Jeder User installiert die App eigenständig,
nutzt eine lokale Datenbank und kann Reports exportieren. Eine optionale
Azure-DevOps-Verlinkung (Work-Item-URLs) erleichtert die Navigation zu Aufgaben.

---

## 2. Zielsetzung

- Schnellstmögliche Zeiteingabe (Tastatur-first, ähnlich oder schneller als
  Excel).
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
- Die App erzeugt automatisch immer eine neue leere Spalte, sobald ein Eintrag
  gemacht wurde.
- Dadurch steht dem User immer eine freie Spalte zur Verfügung – identisch zum
  Verhalten in Excel.
- Die Wochenansicht kann somit flexibel wachsen, ohne manuell neue Felder
  anlegen zu müssen.
- Jede neue Spalte ist direkt editierbar und wird wie eine normale
  Tages-/Zeilenstruktur behandelt.

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

Dieses Dokument definiert eine schnelle, lokal laufende, Windows-basierte
Zeiterfassungs-App mit kleinem, robustem Datenmodell, schneller Eingabe,
projektbezogenen Strukturen, ADO-Linkfähigkeit und umfangreichen
Export-/Reporting-Funktionen – ideal für einzelne User.

## 13. Weitere Punkte

Ich möchte den Zeitraum mit den geleisteten Stunden einstellbar machen Es muss
auch so ein feld geben, wo ich reinschreib, das ich gemacht habe das muss pro
unterprojekt pro tag eig auch zusammengefügt werden
