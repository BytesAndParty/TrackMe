import { useState, useEffect, useRef } from 'react'
import { db, type TimeEntry, type Project, type SubProject } from '../db'
import { calculateDuration } from '../lib/parser'

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

export function useGridState(
  date: string,
  dbEntries: TimeEntry[],
  projects: Project[],
  subProjects: SubProject[]
) {
  const initialRows = [createEmptyRow()]
  const [rows, setRows] = useState<GridRowData[]>(initialRows)
  const rowsRef = useRef<GridRowData[]>(initialRows)
  const editingRows = useRef(new Set<string>())
  const pendingCommits = useRef(new Map<string, Promise<void>>())
  const lastSyncRef = useRef<string>('')

  function setRowsImmediate(nextRows: GridRowData[]) {
    rowsRef.current = nextRows
    setRows(nextRows)
  }

  function updateRows(mutator: (prev: GridRowData[]) => GridRowData[]): GridRowData[] {
    const nextRows = mutator(rowsRef.current)
    setRowsImmediate(nextRows)
    return nextRows
  }

  // Sync from DB when entries change (but not while editing)
  useEffect(() => {
    const syncKey = dbEntries.map((e) => `${e.id}:${e.startTime}:${e.endTime}:${e.projectId}:${e.subProjectId}:${e.itemNr}:${e.taskText}`).join('|')
    if (syncKey === lastSyncRef.current) return
    lastSyncRef.current = syncKey

    const prev = rowsRef.current
    const newRows: GridRowData[] = dbEntries.map((entry) => {
      const existing = prev.find((r) => r._id === entry.id)
      // Keep local state if row is being edited
      if (existing && editingRows.current.has(existing._key)) {
        return existing
      }
      return entryToRow(entry, projects, subProjects, existing?._key)
    })

    // Preserve any dirty new rows (without _id)
    const dirtyNewRows = prev.filter((r) => !r._id && r._dirty && !newRows.some((n) => n._key === r._key))
    newRows.push(...dirtyNewRows)

    // Ensure there's always an empty row at the end
    const hasEmpty = newRows.some((r) => r._isNew && !r._dirty)
    if (!hasEmpty) {
      newRows.push(createEmptyRow())
    }

    setRowsImmediate(newRows)
  }, [dbEntries, projects, subProjects])

  function markEditing(rowKey: string) {
    editingRows.current.add(rowKey)
  }

  function unmarkEditing(rowKey: string) {
    editingRows.current.delete(rowKey)
  }

  function isEditing(rowKey: string): boolean {
    return editingRows.current.has(rowKey)
  }

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
  }

  async function runCommitRow(rowKey: string): Promise<void> {
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
      updated[idx] = {
        ...current,
        _id: current._id ?? insertedId,
        _dirty: contentUnchanged ? false : current._dirty,
        _isNew: false,
      }
      return updated
    })
  }

  function commitRow(rowKey: string): Promise<void> {
    const inFlight = pendingCommits.current.get(rowKey)
    if (inFlight) return inFlight

    const promise = runCommitRow(rowKey).finally(() => {
      pendingCommits.current.delete(rowKey)
    })
    pendingCommits.current.set(rowKey, promise)
    return promise
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
    deleteRow,
    markEditing,
    unmarkEditing,
    isEditing,
  }
}
