import { useState, useEffect, useRef, useCallback } from 'react'
import { db, type TimeEntry, type Project, type SubProject } from '../db'
import { calculateDuration } from '../lib/parser'
import { useDebouncedCallback } from './useDebouncedCallback'

export interface GridRowData {
  _id?: number
  _key: string
  _dirty: boolean
  _isNew: boolean
  startTime: string
  endTime: string
  project: string
  subProject: string
  itemNr: string
  taskText: string
}

type EditableField = 'startTime' | 'endTime' | 'project' | 'subProject' | 'itemNr' | 'taskText'

let _rowKeyCounter = 0
function nextRowKey(): string {
  return `row-${++_rowKeyCounter}`
}

function createEmptyRow(): GridRowData {
  return {
    _key: nextRowKey(),
    _dirty: false,
    _isNew: true,
    startTime: '',
    endTime: '',
    project: '',
    subProject: '',
    itemNr: '',
    taskText: '',
  }
}

function entryToRow(entry: TimeEntry, projects: Project[], subProjects: SubProject[], existingKey?: string): GridRowData {
  return {
    _id: entry.id,
    _key: existingKey ?? nextRowKey(),
    _dirty: false,
    _isNew: false,
    startTime: entry.startTime,
    endTime: entry.endTime,
    project: projects.find((p) => p.id === entry.projectId)?.key ?? '',
    subProject: subProjects.find((s) => s.id === entry.subProjectId)?.key ?? '',
    itemNr: entry.itemNr ?? '',
    taskText: entry.taskText,
  }
}

function rowContentEqual(a: GridRowData, b: GridRowData): boolean {
  return (
    a.startTime === b.startTime &&
    a.endTime === b.endTime &&
    a.project === b.project &&
    a.subProject === b.subProject &&
    a.itemNr === b.itemNr &&
    a.taskText === b.taskText
  )
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase()
}

function rowMatchesEntry(
  row: GridRowData,
  entry: TimeEntry,
  projects: Project[],
  subProjects: SubProject[]
): boolean {
  const rowProject = projects.find((p) => normalizeKey(p.key) === normalizeKey(row.project))
  const rowSubProject = rowProject
    ? subProjects.find(
        (s) => s.projectId === rowProject.id && normalizeKey(s.key) === normalizeKey(row.subProject)
      )
    : undefined

  return (
    row.startTime === entry.startTime &&
    row.endTime === entry.endTime &&
    (rowProject?.id ?? undefined) === (entry.projectId ?? undefined) &&
    (rowSubProject?.id ?? undefined) === (entry.subProjectId ?? undefined) &&
    row.itemNr.trim() === (entry.itemNr ?? '').trim() &&
    row.taskText.trim() === (entry.taskText ?? '').trim()
  )
}

function dedupeRowsById(rows: GridRowData[]): GridRowData[] {
  const seen = new Set<number>()
  const deduped: GridRowData[] = []

  for (const row of rows) {
    if (row._id !== undefined) {
      if (seen.has(row._id)) continue
      seen.add(row._id)
    }
    deduped.push(row)
  }

  return deduped
}

export type SaveStatus = 'saved' | 'saving' | 'error'

export function useGridState(
  date: string,
  dbEntries: TimeEntry[],
  projects: Project[],
  subProjects: SubProject[]
) {
  const initialRows = [createEmptyRow()]
  const [rows, setRows] = useState<GridRowData[]>(initialRows)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  
  const rowsRef = useRef<GridRowData[]>(initialRows)
  const editingRows = useRef(new Map<string, number>())
  const pendingCommits = useRef(new Map<string, Promise<void>>())
  const lastSyncRef = useRef<string>('')

  const setRowsImmediate = useCallback((nextRows: GridRowData[]) => {
    rowsRef.current = nextRows
    setRows(nextRows)
  }, [])

  const updateRows = useCallback((mutator: (prev: GridRowData[]) => GridRowData[]): GridRowData[] => {
    const nextRows = mutator(rowsRef.current)
    setRowsImmediate(nextRows)
    return nextRows
  }, [setRowsImmediate])

  // Sync from DB when entries change (but not while editing or dirty)
  useEffect(() => {
    const syncKey = dbEntries.map((e) => `${e.id}:${e.startTime}:${e.endTime}:${e.projectId}:${e.subProjectId}:${e.itemNr}:${e.taskText}`).join('|')
    if (syncKey === lastSyncRef.current) return
    lastSyncRef.current = syncKey

    const prev = rowsRef.current
    const matchedUnsavedKeys = new Set<string>()
    const newRows: GridRowData[] = dbEntries.map((entry) => {
      const existing = prev.find((r) => r._id === entry.id)
      
      // Keep local state if row is being edited OR is dirty (waiting for save)
      if (existing && ((editingRows.current.get(existing._key) ?? 0) > 0 || existing._dirty)) {
        return existing
      }

      if (existing) {
        return entryToRow(entry, projects, subProjects, existing._key)
      }

      const matchingUnsaved = prev.find(
        (r) =>
          !r._id &&
          !matchedUnsavedKeys.has(r._key) &&
          rowMatchesEntry(r, entry, projects, subProjects)
      )
      if (matchingUnsaved) {
        matchedUnsavedKeys.add(matchingUnsaved._key)
        return { ...matchingUnsaved, _id: entry.id, _isNew: false }
      }

      return entryToRow(entry, projects, subProjects)
    })

    // Preserve any dirty new rows (without _id)
    const dirtyNewRows = prev.filter((r) => !r._id && r._dirty && !newRows.some((n) => n._key === r._key))
    const mergedRows = dedupeRowsById([...newRows, ...dirtyNewRows])

    // Ensure there's always an empty row at the end
    const hasEmpty = mergedRows.some((r) => r._isNew && !r._dirty)
    if (!hasEmpty) {
      // Reuse existing empty row to preserve its React key and avoid focus loss
      const existingEmpty = prev.find((r) => r._isNew && !r._dirty && !r._id)
      mergedRows.push(existingEmpty ?? createEmptyRow())
    }

    setRowsImmediate(mergedRows)
  }, [dbEntries, projects, subProjects, setRowsImmediate])

  const markEditing = (rowKey: string) => {
    editingRows.current.set(rowKey, (editingRows.current.get(rowKey) ?? 0) + 1)
  }

  const unmarkEditing = (rowKey: string) => {
    const count = (editingRows.current.get(rowKey) ?? 0) - 1
    if (count <= 0) {
      editingRows.current.delete(rowKey)
    } else {
      editingRows.current.set(rowKey, count)
    }
  }

  const runCommitRow = useCallback(async (rowKey: string): Promise<void> => {
    const rowIndex = rowsRef.current.findIndex((r) => r._key === rowKey)
    if (rowIndex < 0) return
    const row = rowsRef.current[rowIndex]
    if (!row._dirty) return

    // Need at least a start time to save
    if (!row.startTime) return

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
      notes: '',
    }

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

    let insertedId: number | undefined
    if (row._id) {
      await db.timeEntries.update(row._id, entryData)
    } else {
      insertedId = await db.timeEntries.add(entryData) as number
    }

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
      }
      return dedupeRowsById(updated)
    })
  }, [date, projects, subProjects, updateRows])

  const commitRow = useCallback((rowKey: string): Promise<void> => {
    const inFlight = pendingCommits.current.get(rowKey)
    if (inFlight) return inFlight

    const promise = runCommitRow(rowKey).finally(() => {
      pendingCommits.current.delete(rowKey)
    })
    pendingCommits.current.set(rowKey, promise)
    return promise
  }, [runCommitRow])

  const commitAllDirty = useCallback(async (): Promise<boolean> => {
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
  }, [commitRow])

  const { debounced: triggerDebouncedSave, cancel: cancelDebouncedSave } = useDebouncedCallback(() => {
    void commitAllDirty()
  }, 2000)

  // Save on unmount
  useEffect(() => {
    return () => {
      cancelDebouncedSave()
      // Trigger one last immediate save of all dirty rows
      void commitAllDirty()
    }
  }, [cancelDebouncedSave, commitAllDirty])

  // Handle browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasDirty = rowsRef.current.some(r => r._dirty && r.startTime)
      if (hasDirty) {
        void commitAllDirty()
        // Standard way to show "unsaved changes" dialog
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [commitAllDirty])

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
    setSaveStatus('saving') // Visual feedback that change was captured
    triggerDebouncedSave()
  }

  async function deleteRow(rowKey: string) {
    const row = rowsRef.current.find((r) => r._key === rowKey)
    if (row?._id) {
      await db.timeEntries.delete(row._id)
    }
    updateRows((prev) => {
      const updated = prev.filter((r) => r._key !== rowKey)
      if (!updated.some((r) => r._isNew && !r._dirty)) {
        updated.push(createEmptyRow())
      }
      return updated
    })
    editingRows.current.delete(rowKey)
  }

  return {
    rows,
    updateCell,
    commitRow,
    commitAllDirty,
    deleteRow,
    markEditing,
    unmarkEditing,
    saveStatus
  }
}
