---
name: testing-library
description: Cached reference for `@testing-library/react` v16 — query priority, `userEvent` vs. `fireEvent`, testing-philosophy ("resembles how software is used"). Load before writing a component test, choosing between `userEvent` and `fireEvent`, or picking which query (`getByRole` vs. `getByTestId` etc.) to use.
---

## Was dieser Skill ist

Gecachte Referenz für React Testing Library v16 — Artelier-Standard für Unit-/Component-Tests (zusammen mit Vitest, statt Jest). Zentrale Philosophie: über echte DOM-Knoten testen, nicht über React-Interna (State/Props von innen).

## References

- `reference.md` — Setup, Query-Priorität, `userEvent` vs. `fireEvent`.

## Notes

- Gecachter Snapshot, Stand siehe `reference.md`-Kopfzeile. Bei Verdacht auf Veraltung: neueste veröffentlichte Version per `bun info @testing-library/react version` prüfen, die im Projekt installierte steht in `node_modules/@testing-library/react/package.json` (Feld `version`).
- Master-Quelle ist `__AI-Workflow__/skills/live-docs-collection/testing-library/testing-library.md`, gepflegt über `/live-docs-update`.
