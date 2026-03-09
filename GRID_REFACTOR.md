# Grid Refactoring Plan

## Problem Summary

The `EditableGrid` has accumulated complexity over time:

1. **Index-based cell refs** (`"rowIndex-colIndex"`) break when rows shift (DB sync, delete). This required workarounds: `activeCellKey` restoration via `useLayoutEffect`, `handleRowBlur` with `requestAnimationFrame`.
2. **`useGridState` is a 390-line monolith** mixing row sync, persistence, dirty tracking, editing protection, auto-save, and cell updates.
3. **Every cell receives 6+ callback props** (`onChange`, `onKeyDown`, `inputRef`, `onFocus`, `onBlur`, + cell-specific), making the JSX verbose and error-prone.
4. **Keyboard navigation is duplicated** — every cell gets the same `handleCellKeyDown` handler passed as a prop, instead of handling it once at the grid level.

## Goal

Refactor to a cleaner architecture that:
- Uses stable row-key refs (no index shifting issues)
- Splits the monolith hook into focused sub-hooks
- Reduces cell prop count via React Context
- Centralizes keyboard navigation via event delegation

All existing behavior must be preserved.

---

## Step 1: Split `useGridState` into Sub-Hooks

**Why first:** This is a pure extraction with no API changes. It reduces the monolith to focused modules and makes later steps easier to work with.

### New Files

#### `src/hooks/useGridEditing.ts`

Standalone hook — no dependencies on other new hooks.

**Extracts from `useGridState`:**
- `editingRows` ref (Map<string, number>)
- `markEditing(rowKey)` — increments ref count
- `unmarkEditing(rowKey)` — decrements ref count, deletes at 0

```typescript
import { useRef, useCallback } from 'react'

export function useGridEditing() {
  const editingRows = useRef(new Map<string, number>())

  const markEditing = useCallback((rowKey: string) => {
    editingRows.current.set(rowKey, (editingRows.current.get(rowKey) ?? 0) + 1)
  }, [])

  const unmarkEditing = useCallback((rowKey: string) => {
    const count = (editingRows.current.get(rowKey) ?? 0) - 1
    if (count <= 0) {
      editingRows.current.delete(rowKey)
    } else {
      editingRows.current.set(rowKey, count)
    }
  }, [])

  return { editingRows, markEditing, unmarkEditing }
}
```

**Returns:** `{ editingRows: RefObject<Map<string, number>>, markEditing, unmarkEditing }`

---

#### `src/hooks/useGridRows.ts`

Depends on: `editingRows` ref from `useGridEditing`.

**Extracts from `useGridState`:**
- `rows` state + `rowsRef`
- `setRowsImmediate`, `updateRows`
- `createEmptyRow`, `nextRowKey`, `_rowKeyCounter`
- `entryToRow`, `rowMatchesEntry`, `rowContentEqual`, `normalizeKey`
- `dedupeRowsById`
- The `useEffect` that syncs from DB (`syncKey` logic)

**Must also export:** `GridRowData`, `EditableField`, `createEmptyRow`, `entryToRow`, `rowContentEqual`, `dedupeRowsById`, `normalizeKey` — these are needed by `useGridPersist` and `EditableGrid`.

```typescript
export function useGridRows(
  date: string,
  dbEntries: TimeEntry[],
  projects: Project[],
  subProjects: SubProject[],
  editingRows: RefObject<Map<string, number>>
) {
  // ... all row sync logic moves here
  return { rows, rowsRef, updateRows, setRows: setRowsImmediate }
}
```

**Returns:** `{ rows, rowsRef, updateRows, setRows }`

---

#### `src/hooks/useGridPersist.ts`

Depends on: `rowsRef` and `updateRows` from `useGridRows`.

**Extracts from `useGridState`:**
- `pendingCommits` ref
- `runCommitRow` — builds entry data, auto-creates Kanban items, calls `db.timeEntries.add/update`
- `commitRow` — deduplicates in-flight commits
- `commitAllDirty` — commits all dirty rows with startTime
- `deleteRow` — deletes from DB + removes from rows

```typescript
export function useGridPersist(
  date: string,
  projects: Project[],
  subProjects: SubProject[],
  rowsRef: RefObject<GridRowData[]>,
  updateRows: (mutator: (prev: GridRowData[]) => GridRowData[]) => GridRowData[],
  editingRows: RefObject<Map<string, number>>
) {
  // ... all persistence logic moves here
  return { commitRow, commitAllDirty, deleteRow }
}
```

**Returns:** `{ commitRow, commitAllDirty, deleteRow }`

---

#### `src/hooks/useAutoSave.ts`

Depends on: `commitAllDirty` from `useGridPersist`.

**Extracts from `useGridState`:**
- `saveStatus` state
- `triggerDebouncedSave` / `cancelDebouncedSave` (uses `useDebouncedCallback`)
- `useEffect` for unmount save
- `useEffect` for `beforeunload` handler

```typescript
export function useAutoSave(
  commitAllDirty: () => Promise<boolean>,
  rowsRef: RefObject<GridRowData[]>
) {
  // ... auto-save logic moves here
  return { saveStatus, setSaveStatus, triggerDebouncedSave, cancelDebouncedSave }
}
```

**Returns:** `{ saveStatus, setSaveStatus, triggerDebouncedSave, cancelDebouncedSave }`

---

#### `src/hooks/useGridState.ts` — becomes thin orchestrator (~50 lines)

```typescript
export function useGridState(date, dbEntries, projects, subProjects) {
  const { editingRows, markEditing, unmarkEditing } = useGridEditing()
  const { rows, rowsRef, updateRows } = useGridRows(date, dbEntries, projects, subProjects, editingRows)
  const { commitRow, commitAllDirty, deleteRow } = useGridPersist(date, projects, subProjects, rowsRef, updateRows, editingRows)
  const { saveStatus, setSaveStatus, triggerDebouncedSave } = useAutoSave(commitAllDirty, rowsRef)

  function updateCell(rowKey: string, field: EditableField, value: string) {
    updateRows((prev) => {
      // ... same logic as before
    })
    setSaveStatus('saving')
    triggerDebouncedSave()
  }

  return { rows, updateCell, commitRow, commitAllDirty, deleteRow, markEditing, unmarkEditing, saveStatus }
}
```

The public API (`rows`, `updateCell`, `commitRow`, `commitAllDirty`, `deleteRow`, `markEditing`, `unmarkEditing`, `saveStatus`) stays identical. No changes needed in `EditableGrid.tsx` for this step.

### Verification

- `bun run tsc --noEmit` passes
- Existing test passes
- Grid behavior unchanged (pure extraction)

---

## Step 2: Row-Key Based Refs

**Why:** With index-based refs, inserting/deleting a row invalidates all refs below it. Row keys are stable.

### Modified File: `src/components/grid/EditableGrid.tsx`

#### Change `setCellRef`

```typescript
// BEFORE
function setCellRef(row: number, col: number, el: HTMLInputElement | null) {
  const key = `${row}-${col}`
  ...
}

// AFTER
function setCellRef(rowKey: string, col: number, el: HTMLInputElement | null) {
  const key = `${rowKey}-${col}`
  ...
}
```

#### Change `focusCell` to use rowKey

```typescript
// BEFORE
function focusCell(row: number, col: number) {
  const key = `${row}-${col}`
  ...
}

// AFTER — primary: lookup by rowKey
function focusCell(rowKey: string, col: number) {
  const key = `${rowKey}-${col}`
  activeCellKey.current = key
  const el = cellRefs.current.get(key)
  if (el) { el.focus(); el.select() }
}

// AFTER — convenience: lookup by rowIndex (resolves key, then delegates)
function focusCellAt(rowIndex: number, col: number) {
  const row = rows[rowIndex]
  if (row) focusCell(row._key, col)
}
```

#### Update `handleCellKeyDown`

All `focusCell(rowIndex, col)` calls become `focusCellAt(rowIndex, col)` for relative navigation (Enter → next row, ArrowDown, etc.).

#### Update `handleCellFocus`

```typescript
// BEFORE
function handleCellFocus(rowIndex: number, colIndex: number, rowKey: string) {
  activeCellKey.current = `${rowIndex}-${colIndex}`
  markEditing(rowKey)
}

// AFTER
function handleCellFocus(rowKey: string, colIndex: number) {
  activeCellKey.current = `${rowKey}-${colIndex}`
  markEditing(rowKey)
}
```

#### Remove `useLayoutEffect` focus restoration

The `useLayoutEffect` that restores focus after re-render is no longer needed because row keys are stable — the ref map key doesn't change when rows shift.

```typescript
// DELETE this entire block:
useLayoutEffect(() => {
  const key = activeCellKey.current
  if (!key) return
  const el = cellRefs.current.get(key)
  if (el && document.activeElement !== el && document.activeElement === document.body) {
    el.focus()
  }
}, [rows])
```

#### Simplify `handleRowBlur`

The `requestAnimationFrame` workaround was needed because index-based keys could become stale. With stable row keys, simplify to:

```typescript
function handleRowBlur(rowKey: string) {
  unmarkEditing(rowKey)
}
```

#### Update JSX

All `setCellRef(rowIndex, col, el)` → `setCellRef(row._key, col, el)`
All `handleCellFocus(rowIndex, col, row._key)` → `handleCellFocus(row._key, col)`

### Verification

- `bun run tsc --noEmit` passes
- Focus preserved during DB sync (row key stable, not index)
- Enter → next row works via `focusCellAt`
- Tab navigation works
- Delete row works

---

## Step 3: Grid Context and GridRow Extraction

**Why:** Cells currently receive 6+ props each. Context lets cells self-register and access grid operations without prop drilling.

### New File: `src/components/grid/GridContext.tsx`

```typescript
import { createContext, useContext } from 'react'

export type EditableField = 'startTime' | 'endTime' | 'project' | 'subProject' | 'itemNr' | 'taskText'

export interface GridContextValue {
  registerCellRef: (rowKey: string, col: number, el: HTMLInputElement | null) => void
  focusCell: (rowKey: string, col: number) => void
  updateCell: (rowKey: string, field: EditableField, value: string) => void
  markEditing: (rowKey: string) => void
  unmarkEditing: (rowKey: string) => void
}

const GridContext = createContext<GridContextValue | null>(null)

export const GridProvider = GridContext.Provider

export function useGridContext(): GridContextValue {
  const ctx = useContext(GridContext)
  if (!ctx) throw new Error('useGridContext must be used within GridProvider')
  return ctx
}
```

### New File: `src/components/grid/GridRow.tsx`

Extract the `<tr>` from `EditableGrid`'s map into a `React.memo`'d component.

```tsx
import React from 'react'
import { type GridRowData } from '../../hooks/useGridState'
import { type Item } from '../../db'
import TimeCell from './TimeCell'
import AutocompleteCell from './AutocompleteCell'
import TextCell from './TextCell'
// ... imports for suggestions, duration, etc.

interface GridRowProps {
  row: GridRowData
  rowIndex: number
  hasConflict: boolean
  projectSuggestions: Suggestion[]
  getSubProjectSuggestions: (projectKey: string) => Suggestion[]
  getItemSuggestions: (projectKey: string, subProjectKey: string) => Suggestion[]
  buildItemUrl: (itemNr: string, projectKey: string) => string | null
  findItem: (itemNr: string, projectKey: string) => Item | undefined
  onItemClick?: (item: Item) => void
  onDeleteRow: (rowKey: string) => void
  onProjectChange: (rowKey: string, value: string, currentSubProject: string) => void
}

export const GridRow = React.memo(function GridRow({ row, rowIndex, hasConflict, ... }: GridRowProps) {
  // Cell components now get minimal props — they use context internally
  return (
    <tr key={row._key} data-row-key={row._key} ...>
      <td className="grid-cell" data-row-key={row._key} data-col={0}>
        <TimeCell value={row.startTime} rowKey={row._key} col={0} field="startTime" />
      </td>
      <td className="grid-cell" data-row-key={row._key} data-col={1}>
        <TimeCell value={row.endTime} rowKey={row._key} col={1} field="endTime" />
      </td>
      <td className="grid-cell" data-row-key={row._key} data-col={2}>
        <AutocompleteCell
          value={row.project}
          suggestions={projectSuggestions}
          rowKey={row._key}
          col={2}
          field="project"
          onProjectChange={onProjectChange}
          currentSubProject={row.subProject}
        />
      </td>
      {/* ... remaining cells similarly simplified */}
    </tr>
  )
})
```

### Modified File: `src/components/grid/EditableGrid.tsx`

Wrap tbody with `<GridProvider>` and use `<GridRow>`:

```tsx
const gridContext: GridContextValue = useMemo(() => ({
  registerCellRef: setCellRef,
  focusCell,
  updateCell,
  markEditing,
  unmarkEditing,
}), [updateCell, markEditing, unmarkEditing])

return (
  <div ...>
    <table>
      <thead>...</thead>
      <GridProvider value={gridContext}>
        <tbody>
          {rows.map((row, i) => (
            <GridRow
              key={row._key}
              row={row}
              rowIndex={i}
              hasConflict={conflictRows.has(i)}
              projectSuggestions={projectSuggestions}
              getSubProjectSuggestions={getSubProjectSuggestions}
              getItemSuggestions={getItemSuggestions}
              buildItemUrl={buildItemUrl}
              findItem={findItem}
              onItemClick={onItemClick}
              onDeleteRow={deleteRow}
              onProjectChange={handleProjectChange}
            />
          ))}
        </tbody>
      </GridProvider>
      <tfoot>...</tfoot>
    </table>
  </div>
)
```

### Modified Cell Components

#### `src/components/grid/TimeCell.tsx`

```tsx
// BEFORE: 6 props (value, onChange, onKeyDown, inputRef, onFocus, onBlur)
// AFTER:  4 props (value, rowKey, col, field) — rest from context

interface TimeCellProps {
  value: string
  rowKey: string
  col: number
  field: EditableField
}

export default function TimeCell({ value, rowKey, col, field }: TimeCellProps) {
  const { registerCellRef, updateCell, markEditing, unmarkEditing } = useGridContext()

  // inputRef callback:
  const setRef = useCallback((el: HTMLInputElement | null) => {
    registerCellRef(rowKey, col, el)
  }, [registerCellRef, rowKey, col])

  // onChange → updateCell(rowKey, field, value)
  // onFocus → markEditing(rowKey)
  // onBlur → commitRawInput() + unmarkEditing(rowKey)
  // onKeyDown → only handles Tab/Enter commit (stopPropagation on failure)
}
```

#### `src/components/grid/AutocompleteCell.tsx`

```tsx
// BEFORE: 7 props
// AFTER:  5 props (value, suggestions, rowKey, col, field) + optional onProjectChange

interface AutocompleteCellProps {
  value: string
  suggestions: Suggestion[]
  rowKey: string
  col: number
  field: EditableField
  // Only for project column — clears subProject on project change
  onProjectChange?: (rowKey: string, value: string, currentSubProject: string) => void
  currentSubProject?: string
}

export default function AutocompleteCell({ value, suggestions, rowKey, col, field, ... }: AutocompleteCellProps) {
  const { registerCellRef, updateCell, markEditing, unmarkEditing } = useGridContext()
  // ... same internal logic, but uses context instead of props
}
```

#### `src/components/grid/TextCell.tsx`

```tsx
// BEFORE: 7 props
// AFTER:  5 props (value, rowKey, col, field, placeholder)

interface TextCellProps {
  value: string
  rowKey: string
  col: number
  field: EditableField
  placeholder?: string
}

export default function TextCell({ value, rowKey, col, field, placeholder }: TextCellProps) {
  const { registerCellRef, updateCell, markEditing, unmarkEditing } = useGridContext()
  // ... minimal — just an input, no internal key handling
}
```

### Verification

- `bun run tsc --noEmit` passes
- All cell interactions work as before
- Props reduced from 6-7 per cell to 4-5
- `React.memo` on GridRow prevents unnecessary re-renders

---

## Step 4: Event Delegation

**Why:** Instead of every cell getting the same `handleCellKeyDown` callback, handle keyboard navigation once at the `<tbody>` level.

### Modified File: `src/components/grid/EditableGrid.tsx`

Add `data-row-key` and `data-col` attributes on `<td>` elements (already done in Step 3 via GridRow).

Add single handler on `<tbody>`:

```tsx
<tbody onKeyDown={handleGridKeyDown}>
```

```typescript
function handleGridKeyDown(e: React.KeyboardEvent) {
  const td = (e.target as HTMLElement).closest('td[data-row-key]')
  if (!td) return
  const rowKey = (td as HTMLElement).dataset.rowKey!
  const col = Number((td as HTMLElement).dataset.col)
  const rowIndex = rows.findIndex(r => r._key === rowKey)
  if (rowIndex < 0) return

  switch (e.key) {
    case 'Tab':
      if (e.shiftKey) {
        if (col > 0) { e.preventDefault(); focusCell(rowKey, col - 1) }
        else if (rowIndex > 0) { e.preventDefault(); focusCellAt(rowIndex - 1, COLUMN_COUNT - 1) }
      } else {
        if (col < COLUMN_COUNT - 1) { e.preventDefault(); focusCell(rowKey, col + 1) }
        else { e.preventDefault(); void commitRow(rowKey); focusCellAt(rowIndex + 1, 0) }
      }
      break

    case 'Enter':
      e.preventDefault()
      void commitRow(rowKey)
      focusCellAt(rowIndex + 1, 0)
      break

    case 'Escape':
      (e.target as HTMLInputElement).blur()
      break

    case 'ArrowDown':
      if (!e.altKey) { e.preventDefault(); focusCellAt(rowIndex + 1, col) }
      break

    case 'ArrowUp':
      e.preventDefault()
      if (rowIndex > 0) focusCellAt(rowIndex - 1, col)
      break

    case 'ArrowLeft': {
      const input = e.target as HTMLInputElement
      if (input.selectionStart === 0 && input.selectionStart === input.selectionEnd && col > 0) {
        e.preventDefault()
        focusCell(rowKey, col - 1)
      }
      break
    }

    case 'ArrowRight': {
      const input = e.target as HTMLInputElement
      if (input.selectionStart === input.value.length && input.selectionStart === input.selectionEnd && col < COLUMN_COUNT - 1) {
        e.preventDefault()
        focusCell(rowKey, col + 1)
      }
      break
    }

    case 'Delete':
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); void deleteRow(rowKey) }
      break
  }
}
```

### Modified Cell Components — Remove Grid Navigation

#### `TimeCell.tsx`

Only handles Tab/Enter for `commitRawInput()`. If commit fails → `e.stopPropagation()` to prevent grid from navigating. If commit succeeds → let event bubble to grid handler.

```typescript
function handleKeyDown(e: React.KeyboardEvent) {
  if (e.key === 'Tab' || e.key === 'Enter') {
    const ok = commitRawInput()
    if (!ok) {
      e.preventDefault()
      e.stopPropagation() // prevent grid from navigating
      return
    }
    // let event bubble to grid handler for navigation
  }
  // all other keys: bubble to grid handler
}
```

#### `AutocompleteCell.tsx`

Handles dropdown-specific keys only. Non-handled keys bubble to grid.

```typescript
function handleKeyDown(e: React.KeyboardEvent) {
  // Tab auto-completion
  if (e.key === 'Tab' && !e.shiftKey && filtered.length > 0 && value.length > 0) {
    const exactMatch = filtered.find(s => s.key.toLowerCase() === value.toLowerCase())
    if (!exactMatch) {
      e.preventDefault()
      e.stopPropagation() // stay in field, don't navigate
      onChange(filtered[highlightIndex].key)
      setOpen(false)
      return
    }
    onChange(exactMatch.key)
    setOpen(false)
    // let bubble to grid for Tab navigation
    return
  }

  if (open && filtered.length > 0) {
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); /* dropdown nav */ return }
    if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); /* dropdown nav */ return }
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); /* select item */ return }
    if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); return }
  }
  // all other keys: bubble to grid handler
}
```

#### `TextCell.tsx`

Remove `onKeyDown` prop entirely. No internal key handling — everything bubbles to grid.

```tsx
// No onKeyDown handler at all
<input ... />
```

### Verification

- Tab/Enter/Arrow navigation works identically
- TimeCell: invalid input prevents navigation (stopPropagation)
- AutocompleteCell: dropdown ArrowUp/Down don't move to adjacent rows
- AutocompleteCell: Tab partial match stays in field
- TextCell: all keys handled by grid
- Cmd+Delete still deletes row
- Escape still blurs

---

## Files Summary

| File | Action | Step |
|------|--------|------|
| `src/hooks/useGridEditing.ts` | **New** | 1 |
| `src/hooks/useGridRows.ts` | **New** | 1 |
| `src/hooks/useGridPersist.ts` | **New** | 1 |
| `src/hooks/useAutoSave.ts` | **New** | 1 |
| `src/hooks/useGridState.ts` | Refactor to thin orchestrator | 1 |
| `src/components/grid/EditableGrid.tsx` | Major refactor (refs, context, delegation) | 2, 3, 4 |
| `src/components/grid/GridContext.tsx` | **New** | 3 |
| `src/components/grid/GridRow.tsx` | **New** (extracted from EditableGrid) | 3 |
| `src/components/grid/TimeCell.tsx` | Simplify props, use context, cell-only keys | 3, 4 |
| `src/components/grid/AutocompleteCell.tsx` | Simplify props, use context, cell-only keys | 3, 4 |
| `src/components/grid/TextCell.tsx` | Simplify props, use context, remove onKeyDown | 3, 4 |
| `src/components/grid/EditableGrid.test.tsx` | May need minor updates for changed markup | 3 |

## Implementation Order

```
Step 1: useGridState split    →  no UI changes, pure extraction
Step 2: Row-key refs          →  EditableGrid internal only
Step 3: GridContext + GridRow  →  new files + cell component changes
Step 4: Event delegation      →  tbody handler + cell simplification
```

Each step should compile and work independently. Run `bun run tsc --noEmit` after each step.

## Verification Checklist

After all steps:

- [ ] `bun run tsc --noEmit` — zero errors
- [ ] `bun run test` — all tests pass
- [ ] Tab forward: moves through columns, wraps to next row
- [ ] Shift+Tab backward: moves through columns, wraps to previous row
- [ ] Enter: commits row, moves to first column of next row
- [ ] ArrowUp/Down: moves between rows in same column
- [ ] ArrowLeft/Right: moves between columns at cursor boundary
- [ ] Escape: blurs current cell
- [ ] Cmd+Delete: deletes current row
- [ ] Time parsing: "930" → "09:30", invalid input stays in cell
- [ ] Autocomplete dropdown: ArrowUp/Down navigate, Enter selects
- [ ] Tab in autocomplete: partial match auto-completes, exact match navigates
- [ ] Debounced auto-save works (2s after last edit)
- [ ] Save status indicator: saving → saved → error states
- [ ] Overlap detection: amber hints shown for conflicting times
- [ ] Focus preserved during DB sync (live query update)
- [ ] Enter from last data row creates new empty row and focuses it
- [ ] Delete row button visible on hover
- [ ] Item link / open button visible on hover
