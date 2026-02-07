import { useState, useEffect, useRef } from 'react'
import { db, type TimeEntry, type Project, type SubProject } from '../db'
import { calculateDuration } from '../lib/parser'

export interface GridRowData {
  _id?: number
  _dirty: boolean
  _isNew: boolean
  startTime: string
  endTime: string
  project: string
  subProject: string
  itemNr: string
  taskText: string
}

function createEmptyRow(): GridRowData {
  return {
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

function entryToRow(entry: TimeEntry, projects: Project[], subProjects: SubProject[]): GridRowData {
  return {
    _id: entry.id,
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

export function useGridState(
  date: string,
  dbEntries: TimeEntry[],
  projects: Project[],
  subProjects: SubProject[]
) {
  const [rows, setRows] = useState<GridRowData[]>([createEmptyRow()])
  const editingRows = useRef(new Set<number>())
  const lastSyncRef = useRef<string>('')

  // Sync from DB when entries change (but not while editing)
  useEffect(() => {
    const syncKey = dbEntries.map((e) => `${e.id}:${e.startTime}:${e.endTime}:${e.projectId}:${e.subProjectId}:${e.itemNr}:${e.taskText}`).join('|')
    if (syncKey === lastSyncRef.current) return
    lastSyncRef.current = syncKey

    setRows((prev) => {
      const newRows: GridRowData[] = dbEntries.map((entry) => {
        const existingIdx = prev.findIndex((r) => r._id === entry.id)
        // Keep local state if row is being edited
        if (existingIdx >= 0 && editingRows.current.has(existingIdx)) {
          return prev[existingIdx]
        }
        return entryToRow(entry, projects, subProjects)
      })

      // Preserve any dirty new rows (without _id) that are being edited
      const dirtyNewRows = prev.filter((r) => !r._id && r._dirty)
      newRows.push(...dirtyNewRows)

      // Ensure there's always an empty row at the end
      const hasEmpty = newRows.some((r) => r._isNew && !r._dirty)
      if (!hasEmpty) {
        newRows.push(createEmptyRow())
      }

      return newRows
    })
  }, [dbEntries, projects, subProjects])

  function markEditing(rowIndex: number) {
    editingRows.current.add(rowIndex)
  }

  function unmarkEditing(rowIndex: number) {
    editingRows.current.delete(rowIndex)
  }

  function updateCell(rowIndex: number, field: keyof GridRowData, value: string) {
    setRows((prev) => {
      const updated = [...prev]
      const row = { ...updated[rowIndex] }
      ;(row as Record<string, unknown>)[field] = value
      row._dirty = true

      // If editing the last (empty) row, append a new empty row
      if (row._isNew && !updated[rowIndex]._dirty) {
        row._isNew = false
        updated[rowIndex] = row
        updated.push(createEmptyRow())
      } else {
        updated[rowIndex] = row
      }

      return updated
    })
  }

  async function commitRow(rowIndex: number) {
    const row = rows[rowIndex]
    if (!row || !row._dirty) return

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

    if (row._id) {
      await db.timeEntries.update(row._id, entryData)
      setRows((prev) => {
        const updated = [...prev]
        updated[rowIndex] = { ...updated[rowIndex], _dirty: false }
        return updated
      })
    } else {
      const id = await db.timeEntries.add(entryData)
      setRows((prev) => {
        const updated = [...prev]
        updated[rowIndex] = { ...updated[rowIndex], _id: id as number, _dirty: false, _isNew: false }
        return updated
      })
    }
  }

  async function deleteRow(rowIndex: number) {
    const row = rows[rowIndex]
    if (row._id) {
      await db.timeEntries.delete(row._id)
    }
    setRows((prev) => {
      const updated = prev.filter((_, i) => i !== rowIndex)
      if (!updated.some((r) => r._isNew && !r._dirty)) {
        updated.push(createEmptyRow())
      }
      return updated
    })
  }

  return {
    rows,
    updateCell,
    commitRow,
    deleteRow,
    markEditing,
    unmarkEditing,
  }
}
