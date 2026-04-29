import { type TimeEntry, type Project, type SubProject, type Item } from '../db'
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
  subProjects: SubProject[],
  items: Item[]
) {
  const { editingRows, markEditing, unmarkEditing } = useGridEditing()
  const { rows, rowsRef, updateRows } = useGridRows(dbEntries, projects, subProjects, items, editingRows)
  const { commitRow, commitAllDirty, deleteRow, undoDelete } = useGridPersist(date, projects, subProjects, rowsRef, updateRows, editingRows)
  const { saveStatus, setSaveStatus, triggerDebouncedSave, cancelDebouncedSave } = useAutoSave(commitAllDirty, rowsRef)

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
        if (project) {
          const item = items.find((i) => i.projectId === project.id && i.itemNr === value.trim())
          if (item) {
            row.itemTitle = item.title
          }
        }
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
    return commitAllDirty(setSaveStatus)
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
