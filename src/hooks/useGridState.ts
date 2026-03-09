import { type TimeEntry, type Project, type SubProject } from '../db'
import { useGridEditing } from './useGridEditing'
import { useGridRows, createEmptyRow, type GridRowData, type EditableField } from './useGridRows'
import { useGridPersist } from './useGridPersist'
import { useAutoSave, type SaveStatus } from './useAutoSave'

export type { GridRowData, EditableField, SaveStatus }
export { createEmptyRow }

export function useGridState(
  date: string,
  dbEntries: TimeEntry[],
  projects: Project[],
  subProjects: SubProject[]
) {
  const { editingRows, markEditing, unmarkEditing } = useGridEditing()
  const { rows, rowsRef, updateRows } = useGridRows(date, dbEntries, projects, subProjects, editingRows)
  const { commitRow, commitAllDirty, deleteRow } = useGridPersist(date, projects, subProjects, rowsRef, updateRows, editingRows)
  const { saveStatus, setSaveStatus, triggerDebouncedSave } = useAutoSave(commitAllDirty, rowsRef)

  function updateCell(rowKey: string, field: EditableField, value: string) {
    updateRows((prev) => {
      const rowIndex = prev.findIndex((r) => r._key === rowKey)
      if (rowIndex < 0) return prev

      const updated = [...prev]
      const current = updated[rowIndex]
      const row = { ...current }
      ;(row as GridRowData)[field] = value
      row._dirty = true

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

  return {
    rows,
    updateCell,
    commitRow,
    commitAllDirty: () => commitAllDirty(setSaveStatus),
    deleteRow,
    markEditing,
    unmarkEditing,
    saveStatus,
  }
}
