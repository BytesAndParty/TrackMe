# TrackMe

## Stack

- React, TypeScript, Vite und Tailwind CSS
- Dexie/IndexedDB für die lokale Persistenz
- i18next für Deutsch und Englisch
- Vitest und Testing Library für Tests

## Befehle

```bash
bun run test
bun run lint
bun run build
```

Verwende `bun run test`, nicht `bun test`.

## Datenmodell

- Datenbankschema und Migrationen liegen in `src/db/index.ts`.
- Jede Schemaänderung benötigt eine neue Dexie-Version sowie eine Migration für Bestandsdaten.
- Neue Projekte und Unterprojekte sind aktiv. Neue Items sind nicht archiviert.
- Projekte, Unterprojekte und Items werden archiviert statt physisch gelöscht, damit historische Referenzen erhalten bleiben.

## Zeiterfassung

- Eine Zeitbuchung darf nur gespeichert werden, wenn Start- und Endzeit vorhanden sind.
- Die Endzeit muss nach der Startzeit liegen. Zeiträume über Mitternacht werden nicht unterstützt.
- Änderungen im Grid brauchen mindestens einen fokussierten Hook- oder Komponententest.

## Sprache und Umlaute

- Umlaute (ä, ö, ü, ß) sind in Code, Strings und Kommentaren korrekt und erwünscht.
- Keine ASCII-Ersatzschreibweisen ("ae", "oe", "ue", "ss") in deutschem Text - weder in
  Kommentaren noch in UI-Texten, Commit-Messages oder Dokumentation. Die Quelldateien sind
  UTF-8.
- Einzelne ältere ASCII-Stellen im Bestand nicht drive-by mitkorrigieren, nur selbst neu
  geschriebenen Text.

## Änderungen

- Texte für beide Sprachen in `src/i18n.ts` ergänzen.
- Neue Abhängigkeiten nur ergänzen, wenn vorhandene Browser- oder Projekt-APIs nicht ausreichen.
- Vor Abschluss mindestens den passenden Test sowie `bun run build` ausführen.
