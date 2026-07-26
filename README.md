# TrackMe

TrackMe ist eine lokale Zeiterfassung als Progressive Web App. Projekte, Unterprojekte, Zeitbuchungen, Items und Todos werden im Browser in IndexedDB gespeichert. Es ist kein Server und kein Benutzerkonto erforderlich.

## Funktionen

- Tages-, Wochen- und Monatsansichten für Zeitbuchungen
- Projekt- und Unterprojektverwaltung mit Archivierung
- Kanban-Board für Items und verknüpfte Todos
- Auswertungen für frei wählbare Zeiträume
- JSON-Vollbackups sowie CSV-/XLSX-Export und -Import von Zeitbuchungen

## Voraussetzungen

- Aktuelle Version von [Bun](https://bun.sh/)

## Lokale Entwicklung

```bash
bun install
bun run dev
```

## Qualitätssicherung

```bash
bun run test
bun run lint
bun run build
```

`bun run test` verwendet Vitest. `bun test` startet stattdessen den Bun-Test-Runner und ist für diese Tests nicht vorgesehen.

## Daten und Backups

Die Daten liegen ausschließlich in der IndexedDB des aktuellen Browsers. Browserdaten zu löschen oder ein anderes Browserprofil zu verwenden entfernt den Zugriff auf diese Daten.

Unter **Daten** kann ein versioniertes JSON-Vollbackup erstellt und wiederhergestellt werden. Vor Browserwechseln, Updates oder umfangreichen Importen sollte ein Vollbackup exportiert werden. Der CSV-/XLSX-Import prüft Datum und Zeitbereiche, überspringt Duplikate und legt unbekannte Projekte sowie Unterprojekte an.

Zeitbuchungen werden nur gespeichert, wenn Start- und Endzeit vorhanden sind und die Endzeit nach der Startzeit liegt. Zeiträume über Mitternacht werden nicht unterstützt.

## Datenmodell

- Projekte und Unterprojekte werden archiviert statt physisch gelöscht.
- Items werden archiviert, damit Zeitbuchungen und Todo-Verknüpfungen erhalten bleiben.
- Projektkürzel sind eindeutig; Unterprojektkürzel sind innerhalb eines Projekts eindeutig.
- Änderungen am IndexedDB-Schema erfolgen ausschließlich als neue Dexie-Version mit Migration für bestehende Datensätze.
