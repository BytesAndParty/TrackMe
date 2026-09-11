import { useCallback, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type TimeEntry, type Project, type SubProject, type Item } from '../db'
import { useGridEditing } from './useGridEditing'
import { useGridRows, createEmptyRow, type GridRowData, type EditableField } from './useGridRows'
import { useGridPersist } from './useGridPersist'
import { useAutoSave, type SaveStatus } from './useAutoSave'
import { useDraftRows, draftToRow } from './useDraftRows'

export type { GridRowData }

const EMPTY_DRAFTS: GridRowData[] = []

export function useGridState(
  date: string,
  dbEntries: TimeEntry[],
  projects: Project[],
  subProjects: SubProject[],
  items: Item[]
) {
  const { editingRows, markEditing, unmarkEditing } = useGridEditing()

  const storedDrafts = useLiveQuery(() => db.draftRows.where('date').equals(date).toArray(), [date])
  const draftRowsForDate = useMemo(
    () => (storedDrafts ? storedDrafts.map(draftToRow) : EMPTY_DRAFTS),
    [storedDrafts]
  )

  const { rows, rowsRef, updateRows } = useGridRows(dbEntries, projects, subProjects, items, editingRows, draftRowsForDate)
  const { flushDrafts, clearDraft } = useDraftRows(date, rowsRef)
  const { commitRow, commitAllDirty, deleteRow, undoDelete } = useGridPersist(date, projects, subProjects, rowsRef, updateRows, editingRows, clearDraft)

  // Der Autosave schreibt gültige Zeilen in timeEntries und parkt den Rest als Draft,
  // damit auch unvollständige Eingaben den Seitenwechsel überleben.
  const commitAllAndDrafts = useCallback(
    async (setStatus: (s: SaveStatus) => void) => {
      const saved = await commitAllDirty(setStatus)
      await flushDrafts()
      return saved
    },
    [commitAllDirty, flushDrafts]
  )

  const { saveStatus, setSaveStatus, triggerDebouncedSave, cancelDebouncedSave } = useAutoSave(commitAllAndDrafts, rowsRef)

  function updateCell(rowKey: string, field: EditableField, value: string) {
    updateRows((prev) => {
      const rowIndex = prev.findIndex((r) => r._key === rowKey)
      if (rowIndex < 0) return prev

      const updated = [...prev]
      const current = updated[rowIndex]
      const row = { ...current }
      ;(row as GridRowData)[field] = value
      row._dirty = true

      // Handle bidirectional sync between itemNr and itemTitle
      if (field === 'itemNr') {
        const project = projects.find((p) => p.key.toLowerCase() === row.project.toLowerCase())
        const item = project
          ? items.find((i) => i.projectId === project.id && i.itemNr === value.trim())
          : undefined
        // Titel darf nur befüllt sein, wenn ein Item wirklich gesetzt ist
        row.itemTitle = item ? item.title : ''
      } else if (field === 'itemTitle') {
        const project = projects.find((p) => p.key.toLowerCase() === row.project.toLowerCase())
        if (project) {
          const item = items.find((i) => i.projectId === project.id && i.title === value.trim())
          if (item) {
            row.itemNr = item.itemNr
          }
        }
      }

      // If editing the last (empty) row, append a new empty row
      if (row._isNew && !current._dirty) {
        row._isNew = false
        updated[rowIndex] = row
        updated.push(createEmptyRow())
      } else {
        updated[rowIndex] = row
      }

      return updated
    })
    setSaveStatus('saving')
    triggerDebouncedSave()
  }

  /** Cancel pending debounce, then commit all dirty rows. Use for navigation/unmount. */
  function flushAndCommitAll(): Promise<boolean> {
    cancelDebouncedSave()
    return commitAllAndDrafts(setSaveStatus)
  }

  return {
    rows,
    updateCell,
    commitRow,
    commitAllDirty: flushAndCommitAll,
    deleteRow,
    undoDelete,
    markEditing,
    unmarkEditing,
    saveStatus,
  }
}
