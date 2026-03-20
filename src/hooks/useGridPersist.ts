import { useRef, useCallback, type RefObject } from 'react'
import { db, type Project, type SubProject } from '../db'
import { calculateDuration } from '../lib/parser'
import { type GridRowData, rowContentEqual, dedupeRowsById, createEmptyRow } from './useGridRows'

export function useGridPersist(
  date: string,
  projects: Project[],
  subProjects: SubProject[],
  rowsRef: RefObject<GridRowData[]>,
  updateRows: (mutator: (prev: GridRowData[]) => GridRowData[]) => GridRowData[],
  editingRows: RefObject<Map<string, number>>
) {
  const pendingCommits = useRef(new Map<string, Promise<void>>())

  const runCommitRow = useCallback(async (rowKey: string): Promise<void> => {
    const rowIndex = rowsRef.current.findIndex((r) => r._key === rowKey)
    if (rowIndex < 0) return
    const row = rowsRef.current[rowIndex]
    if (!row._dirty) return

    // Need at least a start time to save
    if (!row.startTime) return

    // Mark row as pending commit to prevent duplicate creation during DB sync
    if (!row._id) {
      updateRows((prev) => {
        const idx = prev.findIndex((r) => r._key === rowKey)
        if (idx < 0) return prev
        const updated = [...prev]
        updated[idx] = { ...updated[idx], _pendingCommit: true }
        return updated
      })
    }

    const project = projects.find((p) => p.key.toLowerCase() === row.project.toLowerCase())
    const subProject = project
      ? subProjects.find(
          (s) => s.projectId === project.id && s.key.toLowerCase() === row.subProject.toLowerCase()
        )
      : undefined

    const duration =
      row.startTime && row.endTime ? calculateDuration(row.startTime, row.endTime) : 0

    const entryData = {
      date,
      startTime: row.startTime,
      endTime: row.endTime,
      durationMinutes: Math.max(0, duration),
      projectId: project?.id,
      subProjectId: subProject?.id,
      itemNr: row.itemNr,
      taskText: row.taskText,
      notes: row._notes ?? '',
    }

    let insertedId: number | undefined
    await db.transaction('rw', [db.timeEntries, db.items], async () => {
      // Auto-create item in Kanban if itemNr is new
      if (row.itemNr.trim() && project) {
        const existing = await db.items
          .where('projectId')
          .equals(project.id!)
          .filter((i) => i.itemNr === row.itemNr.trim())
          .first()

        if (!existing) {
          const now = new Date().toISOString()
          const todoItems = await db.items.where('status').equals('todo').toArray()
          const maxSort = todoItems.reduce((max, i) => Math.max(max, i.sortOrder), 0)
          await db.items.add({
            projectId: project.id!,
            itemNr: row.itemNr.trim(),
            title: row.taskText || `Item #${row.itemNr.trim()}`,
            description: '',
            status: 'todo',
            url: '',
            notes: '',
            sortOrder: maxSort + 1000,
            createdAt: now,
            updatedAt: now,
          })
        }
      }

      if (row._id) {
        await db.timeEntries.update(row._id, entryData)
      } else {
        insertedId = await db.timeEntries.add(entryData) as number
      }
    })

    updateRows((prev) => {
      const idx = prev.findIndex((r) => r._key === rowKey)
      if (idx < 0) return prev

      const current = prev[idx]
      const contentUnchanged = rowContentEqual(current, row)
      const updated = [...prev]
      const resolvedId = current._id ?? insertedId
      updated[idx] = {
        ...current,
        _id: resolvedId,
        _dirty: contentUnchanged ? false : current._dirty,
        _isNew: false,
        _pendingCommit: false,
      }
      return dedupeRowsById(updated)
    })
  }, [date, projects, subProjects, rowsRef, updateRows])

  const commitRow = useCallback((rowKey: string): Promise<void> => {
    const inFlight = pendingCommits.current.get(rowKey)
    if (inFlight) return inFlight

    const promise = runCommitRow(rowKey).finally(() => {
      pendingCommits.current.delete(rowKey)
    })
    pendingCommits.current.set(rowKey, promise)
    return promise
  }, [runCommitRow])

  const commitAllDirty = useCallback(async (setSaveStatus: (s: 'saved' | 'saving' | 'error') => void): Promise<boolean> => {
    const dirtyRows = rowsRef.current.filter((r) => r._dirty && r.startTime)
    if (dirtyRows.length === 0) {
      setSaveStatus('saved')
      return true
    }

    setSaveStatus('saving')
    try {
      await Promise.all(dirtyRows.map((r) => commitRow(r._key)))
      setSaveStatus('saved')
      return true
    } catch (e) {
      console.error('Failed to save entries:', e)
      setSaveStatus('error')
      return false
    }
  }, [rowsRef, commitRow])

  const pendingDeleteRef = useRef<{ row: GridRowData; timeoutId: ReturnType<typeof setTimeout> } | null>(null)

  const deleteRow = useCallback((rowKey: string) => {
    // If there's a pending delete from a previous row, finalize it now
    if (pendingDeleteRef.current) {
      const prev = pendingDeleteRef.current
      clearTimeout(prev.timeoutId)
      if (prev.row._id) void db.timeEntries.delete(prev.row._id)
      pendingDeleteRef.current = null
    }

    const row = rowsRef.current.find((r) => r._key === rowKey)
    if (!row) return

    // Remove from UI immediately
    updateRows((prev) => {
      const updated = prev.filter((r) => r._key !== rowKey)
      if (!updated.some((r) => r._isNew && !r._dirty)) {
        updated.push(createEmptyRow())
      }
      return updated
    })
    editingRows.current.delete(rowKey)

    // Schedule actual DB deletion after 5 seconds
    const timeoutId = setTimeout(() => {
      if (row._id) void db.timeEntries.delete(row._id)
      pendingDeleteRef.current = null
    }, 5000)

    pendingDeleteRef.current = { row, timeoutId }
  }, [rowsRef, updateRows, editingRows])

  const undoDelete = useCallback(() => {
    const pending = pendingDeleteRef.current
    if (!pending) return false

    clearTimeout(pending.timeoutId)
    pendingDeleteRef.current = null

    // Restore the row back into the grid
    updateRows((prev) => {
      const restored = [...prev]
      // Insert before the trailing empty row
      const emptyIdx = restored.findIndex((r) => r._isNew && !r._dirty)
      if (emptyIdx >= 0) {
        restored.splice(emptyIdx, 0, pending.row)
      } else {
        restored.push(pending.row)
      }
      return dedupeRowsById(restored)
    })
    return true
  }, [updateRows])

  return { commitRow, commitAllDirty, deleteRow, undoDelete }
}
