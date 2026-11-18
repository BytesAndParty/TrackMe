---
name: tailwindcss
description: Cached reference for Tailwind CSS v4.3 — `@theme inline`, `@source`, oklch tokens, `@custom-variant hover`, new utilities added in 4.1–4.3. Load before adding a new Tailwind utility, configuring the `@theme` block, checking whether a CSS feature is already covered by a built-in v4 directive before hand-rolling it, or debugging why a token override on an ancestor or a utility has no effect.
---

## Was dieser Skill ist

Gecachte Referenz für Tailwind CSS v4.3 — inkrementell über die v4.0-Engine, die dieses Ökosystem als Standard nutzt (kein `dark:`-Variant-Wildwuchs, Farben ausschließlich über `:root`-Tokens). Deckt neue Utilities aus 4.1–4.3 ab, ohne die v4.0-Grundlagen zu wiederholen.

## References

- `reference.md` — Was ist neu (4.1→4.3)-Tabelle.

## Notes

- Gecachter Snapshot, Stand siehe `reference.md`-Kopfzeile. Bei Verdacht auf Veraltung: neueste veröffentlichte Version per `bun info tailwindcss version` prüfen, die im Projekt installierte steht in `node_modules/tailwindcss/package.json` (Feld `version`).
- Master-Quelle ist `__AI-Workflow__/skills/live-docs-collection/tailwindcss/tailwindcss.md`, gepflegt über `/live-docs-update`.
- Artelier-Standard ist Tailwind v4 mit `@theme`-Block und oklch-Tokens — kein Tailwind-Default-Graupalette, kein `dark:`-Variant, falls das Projekt bewusst nur ein Theme fährt.
