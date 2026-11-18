> Generiert aus der live-docs-collection (skills/live-docs-collection/tailwindcss/tailwindcss.md) am 2026-10-25. Master-Quelle ist dort gepflegt (`/live-docs-update`) — bei Zweifel an der Aktualität zuerst dort nachsehen und diese Datei danach neu generieren, nicht von Hand nachziehen.

# Tailwind CSS v4.3 — Cached Reference

Incremental over the v4.0 engine the project already uses (`@theme inline`, `@source`,
oklch tokens, `@custom-variant hover`). No breaking changes to those directives in
4.1–4.3. New utilities below.

## What's new (4.1 → 4.3)

| Version | Highlights |
|---|---|
| 4.1 | `text-shadow-*`, mask utilities |
| 4.2 | logical-property utilities, 4 neutral palettes (`mauve`/`olive`/`mist`/`taupe`), `font-features-[...]` |
| 4.3 | scrollbar utilities, zoom, tab-size, container-size queries, better `@variant` |

## Scrollbar utilities (4.3)

```html
<div class="scrollbar-thin overflow-auto">…</div>          <!-- auto | thin | none -->
<div class="scrollbar-thumb-sky-700 scrollbar-track-sky-100">…</div>
<div class="scrollbar-gutter-stable">…</div>               <!-- auto | stable | both -->
```

## Zoom + tab-size (4.3)

```html
<div class="zoom-125">…</div>           <!-- zoom-[1.1], zoom-(--preview-zoom) -->
<pre class="tab-2">…</pre>               <!-- tab-[12px], tab-(--tab-size) -->
```

## @variant improvements (4.3)

```css
/* stacked (AND) */
@variant hover:focus { … }
/* compound (OR) */
@variant hover, focus { … }
```

## Functional utilities with defaults (4.3)

```css
@utility tab-* {
  tab-size: --value(integer, --default(4));
}
```

## Logical properties (4.2) — note the deprecation

`mbs-* mbe-* pbs-* pbe-*`, sizing `block-* inline-*`, inset `inset-s-* inset-e-* inset-bs-* inset-be-*`.
**Deprecated:** `start-*` / `end-*` → use `inset-s-*` / `inset-e-*`.

## Container-size queries (4.3)

```html
<div class="@container-size"><div class="h-[50cqb]">…</div></div>
<div class="@container-size/name"><div class="@[50cqb]/name:block">…</div></div>
```

## Project notes

- Theming source of truth stays `components-showcase/src/styles.css` (`@theme inline`).
- The `@source "../../components/**/*.{ts,tsx}"` directive is unchanged and still required
  for the out-of-root `components/**` workspace.
- Under Vite 8, Tailwind's CSS is minified by **Lightning CSS** (not esbuild) — output may
  be marginally larger; no config change needed.
- The `mauve/olive/mist/taupe` neutral palettes are new in 4.2 and oklch-based.

## Gotcha: `@theme inline` backt Literalwerte ein (Praxis-Befund 2026-08-18)

Ein Token mit Literalwert (`--font-display: "Cormorant Garamond", serif;`) landet im `@theme inline`-Block
als fester Wert in der Utility (`.font-display { font-family: "Cormorant Garamond", … }`), ohne `var()`.
Die Custom Property an einem Vorfahren per Inline-Style zu überschreiben, wirkt deshalb nicht. Farb-Tokens
funktionieren nur, weil ihr Theme-Wert schon ein `var()` ist (`--color-background: var(--background)`).

Scope-überschreibbar wird ein Token so: Literalwert in einem normalen `:root`-Block auf `--foo-base`
legen, den `@theme inline`-Token auf `var(--foo-base)` zeigen lassen und im Scope `--foo-base`
überschreiben, nicht den Theme-Alias.

Zweite Falle: Elemente ohne eigene `font-family`-Regel erben den schon aufgelösten Wert vom Vorfahren,
keine Variable. Der Scope-Wrapper braucht deshalb zusätzlich eine echte `font-family`-Deklaration.
Referenz-Muster: `__Components__/section-showcase/src/sections/family-fonts.ts`.

## Gotcha: unlayered Fremd-CSS schlägt Utilities (Praxis-Befund 2026-09-27)

Utilities liegen in `@layer utilities`, unlayered CSS gewinnt gegen jede Layer-Regel, **unabhängig von
der Spezifität**. Beispiel `leaflet.css`: `.leaflet-popup-content p { margin: 1.3em 0 }` überschreibt
`mb-2` auf demselben Element. Fremd-DOM (Leaflet-Popups u. Ä.) deshalb mit unlayered CSS hinter dem
Fremd-Stylesheet stylen. Details: [react-leaflet](../react-leaflet/react-leaflet.md).

Eigene Media-Query-Variante für niedrige Viewports (Phones im Querformat):
`@custom-variant short (@media (max-height: 30rem));` → `short:hidden`, `short:text-2xl`.
