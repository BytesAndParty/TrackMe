# TrackMe - Claude Instructions

Lokale Zeiterfassung als Progressive Web App (React/TypeScript/Vite). Alle Daten liegen in der IndexedDB des Browsers - es gibt **kein** Backend, **keine** API und **keine** Benutzerkonten.

## Architektur / Dateien

- `src/db/index.ts` - Dexie-Schema und Migrationen (Projekte, Unterprojekte, Zeitbuchungen, Items, Todos)
- `src/pages/` - Routen-Ebene: Tages-/Wochen-/Monatsansicht, Projekte, Items, Todo, Reports, Import, DataManagement, Settings
- `src/components/grid/` - Zeit-Grid (Kern der Erfassung), `src/components/kanban/` - Item-Board
- `src/hooks/` - Grid-State/-Editing/-Persist, Backup-Folder, Theme, Storage-Persistence
- `src/lib/` - `parser.ts` (Eingabe-Parsing) und `dataTransfer.ts` (JSON-Backup, CSV-/XLSX-Import-Export)
- `src/i18n.ts` - alle Texte, Deutsch und Englisch

## Regeln

- Schemaänderungen ausschließlich als neue Dexie-Version mit Migration für Bestandsdaten.
- Projekte, Unterprojekte und Items werden archiviert, nie physisch gelöscht.
- Zeitbuchungen brauchen Start- und Endzeit, Ende nach Start, kein Zeitraum über Mitternacht.
- Neue Texte immer in beiden Sprachen in `src/i18n.ts`.
- Umlaute (ä, ö, ü, ß) in Code, Strings und Kommentaren verwenden, keine ASCII-Ersatzschreibweisen. Bestehende ASCII-Stellen nicht drive-by mitkorrigieren.
- `bun run test` (Vitest) verwenden, **nicht** `bun test`.
- Vor Abschluss: passender Test + `bun run build`.

## Arbeitsweise / Git

- Single-Dev-Repo: direkt auf `main` arbeiten, keine Feature-Branches ohne Aufforderung.
- Kein `git push` ohne explizite Aufforderung.
- `AGENTS.md` ist generiert - projektspezifische Ergänzungen gehören in `AGENTS.local.md`.
