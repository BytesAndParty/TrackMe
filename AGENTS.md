<!-- AUTO-GENERATED — edit shared/base/AGENTS.base.md or AGENTS.local.md, not this file -->

# Workspace Instructions

Always read and apply the following shared guidelines:

## Karpathy-Inspired Coding Guidelines

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- Don't extract a condition into a named bool local used only once or twice - inline it (`if (x == null)` beats `bool isNull = x == null; if (isNull)`). Name it only when the condition is complex/long or reused 3+ times.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

Never edit auto-generated code (codegen output, `_Generated*` files, generator headers, etc.). If a task would require changing generated code, stop and describe what needs to change at the generator/source level instead - let the user decide, since manual edits get silently lost on the next generator run. Finish the rest of the task normally.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

**Never create new tests on your own initiative.** The examples above describe the verification loop for when tests are already part of the task or have been explicitly approved - don't add a test file or test project unilaterally just because it would be good verification. If you think tests are warranted, say so and ask; only write them after an explicit yes. Verify against existing tests, manual checks, or compilation/build success instead when tests haven't been approved.

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Container Runtime Preference

# Container Runtime Preference

**Podman > Docker** — projektübergreifend, ausnahmslos. Standard für lokale Container, Compose-Files,
Beispielbefehle, Anleitungen, neue Setups. Image-Refs voll qualifizieren (`docker.io/library/...`),
damit Podman ohne `unqualified-search-registries`-Konfig funktioniert. `docker-compose.yml` heißt
`compose.yaml`. Wenn ich „Docker" sage, ist trotzdem Podman gemeint — direkt umsetzen, nicht nachfragen.

## Artelier Guidelines

# Artelier Guidelines

## Linting & Code Quality
Jedes Frontend-Projekt verwendet ESLint (Flat Config, v9+) mit:

- **`eslint-plugin-react-hooks`** — Rules of Hooks + `react-compiler` Rule (deckt Code auf, den der React Compiler nicht optimieren kann: Mutationen im Render, Side-Effects außerhalb Effects, Ref-Zugriffe im Render).
- **`eslint-plugin-react-refresh`** — HMR-Safety: nur Components/Hooks aus Component-Dateien exportieren.
- **`typescript-eslint`** — TS-aware Rules (Type-Imports, ungenutzte Vars, `any`-Eskalation, exhaustive switch).

Standard: `eslint.config.js` mit diesen drei Plugins, `bun lint` Script, CI-Integration. Pre-commit über `lint-staged` empfohlen.

## Documentation Lifecycle
- **live-docs-collection** = Single Source of Truth: `C:\Users\robert.stickler\source\repos\__Development__\AI-Workflow\Skills\live-docs-collection`
- Bei jeder Task: aktuelle Versionen aus `package.json` checken → Change-Notes der neuen Versionen fetchen → in live-docs-collection ablegen → von dort konsumieren.
- Fehlt Doku oder ist veraltet → erstellen / aktualisieren, nicht umgehen.

## Engineering Discipline
- **Surgical Changes** — keine ungefragten Drive-by-Refactorings.
- **Iterative Refactoring** — wenn ein Ansatz scheitert: sauber zurücksetzen oder refactoren, *nicht* drüber patchen.

## Personal Instructions

# Personal Instructions — flame007

## Package Manager

**Bun first** — `bun` für Installation, Scripts und Runtime. Kein `npm`, kein `yarn`, kein `pnpm` außer explizit anders angegeben.

## AI Anonymity

**Zero AI Footprint** — niemals Spuren von AI-Nutzung in Repos committen, außer explizit erwähnt:
- Keine "Co-Authored-By" Tags in Commit-Messages
- Keine AI-generierten Kommentare oder Signaturen im Code
- Keine Tool-Metadaten oder Prompt-Referenzen (`.agents/`, `.gemini/`, `.claude/`, etc.) committen
- Auch in Testdaten, Sample-Values und Namen von Repro-/Test-Objekten keine AI/Claude-Referenzen verwenden (z.B. nicht "CLAUDE_NOEXIST_2026" oder "CLAUDE-REPRO-..." — stattdessen neutral wie "REPRO-..." oder "TEST_2026")
- Alle Änderungen sollen aussehen als wären sie direkt vom User geschrieben

## Kein automatischer Push

**Nie von selbst `git push`** — unabhängig vom Tool und unabhängig davon, ob vorher schon committed wurde. Push nur nach expliziter Aufforderung durch den User (z. B. via `/commit-push` oder direkter Ansage). Ein freigegebener Plan oder ein freigegebener Commit ist keine Freigabe für den Push.

## Umlaute

# Umlaute

Umlaute (ä, ö, ü, ß) müssen immer normal verwendet werden. Keine ASCII-Ersatzschreibweisen wie "ae", "oe", "ue", "ss" erzwingen. Gilt für Commit-Messages, Kommentare, UI-Texte, Dokumentation und Chat-Antworten an den User.

Gilt ausdrücklich auch für Inhalte, die über Skripte/Tools erzeugt werden (z. B. Excel-/Office-Zellinhalte und -Kommentare via openpyxl, generierte Reports, CSV-Exporte) und für Text innerhalb von Heredocs/Skript-Strings – dort keine ASCII-Ersatzschreibweisen aus Vorsicht vor Encoding-Problemen verwenden, UTF-8 ist Standard und funktioniert.

**Wichtig, falls ein Projekt eine ASCII-only-Regel hat:** Solche Regeln (z.B. "keine Sonderzeichen in Code und Kommentaren") beziehen sich ausschließlich auf Quellcode-Dateien (Strings, Code-Kommentare, Trace-/Log-Ausgaben) – niemals auf Chat-Antworten, Ticket-/PR-Texte oder eigenständige Markdown-Dokumentation (z.B. Progress-Dateien). Diese Regel hier hat dort immer Vorrang. Im Zweifel: ist das Ziel eine `.cs`/Code-Datei → ASCII-only beachten; ist es Chat, Ticket-Text oder `.md` → Umlaute normal verwenden. Den bestehenden Code-Stil eines Projekts bei tatsächlichem Code trotzdem respektieren (Surgical Changes).

**Umgekehrter Fall – Projekt erlaubt/verlangt Umlaute explizit auch in Code:** Steht das explizit in den Projektinstruktionen (z.B. AGENTS.md: "Umlaute in Code, Strings und Kommentaren sind korrekt und erwünscht"), hat das Vorrang vor "bestehenden Code-Stil respektieren" – die explizite Projektregel schlägt eine nur implizit aus alten Dateien abgeleitete Konvention. Neue Kommentare/Strings/Exception-Messages, die man selbst schreibt, dann mit echten Umlauten schreiben, auch wenn benachbarte/bestehende Code-Stellen noch ASCII-Ersatzschreibweisen verwenden. Bestehende ASCII-Stellen nicht drive-by mitkorrigieren (Surgical Changes bleibt bestehen) – nur was man selbst neu schreibt.

## Git Worktrees pro Session

# Git Worktrees pro Session

**Neue Claude-Code-Session auf einem Projekt-Repo → eigener Git-Worktree**, sobald plausibel
mehrere Sessions/Chats parallel auf demselben Repo laufen könnten. Verhindert, dass sich
unfertige Änderungen aus verschiedenen Chats gegenseitig überschreiben oder denselben Branch
blockieren.

**Wann anwenden:**
- Zielverzeichnis ist ein Git-Repo (`git rev-parse --is-inside-work-tree`).
- Es ist plausibel, dass parallel eine weitere Session/ein weiterer Chat auf demselben Repo
  arbeitet (typisch bei mehreren offenen Claude-Code-Tabs/-Fenstern).

**Wie:**
- Vor dem Anlegen kurz beim User nachfragen (z. B. "Läuft parallel evtl. noch eine andere
  Session auf diesem Repo? Dann lege ich einen eigenen Worktree an.") — nicht stillschweigend
  anlegen, auch wenn die Bedingung oben plausibel erscheint.
- Nach Bestätigung einen dedizierten Worktree als Sibling-Ordner anlegen, z. B.
  `git worktree add ../<repo>-session-<kurzbeschreibung> -b session/<kurzbeschreibung>`.
- In diesem Worktree arbeiten, committen, pushen — das Haupt-Repo bleibt auf seinem Branch
  unberührt.
- Nach Abschluss: Branch mergen (PR oder direkt), dann `git worktree remove <pfad>` —
  Worktrees nicht anhäufen lassen.

**Nicht anwenden, wenn:**
- Nur eine Session gleichzeitig auf dem Repo aktiv ist (Single-Chat-Workflow) — dann ist der
  Worktree reiner Overhead ohne Nutzen.
- Das Zielverzeichnis noch kein Git-Repo ist — vorher klären, ob `git init` gewünscht ist.

---

<!-- Project-specific instructions are appended below by sync-agents -->


---

## Project-Specific Instructions

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
