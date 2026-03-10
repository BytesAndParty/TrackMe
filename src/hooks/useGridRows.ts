import { useState, useEffect, useRef, useCallback, type RefObject } from 'react'
import { type TimeEntry, type Project, type SubProject } from '../db'

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

export type EditableField = 'startTime' | 'endTime' | 'project' | 'subProject' | 'itemNr' | 'taskText'

let _rowKeyCounter = 0
function nextRowKey(): string {
  return `row-${++_rowKeyCounter}`
}

export function createEmptyRow(): GridRowData {
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

export function entryToRow(entry: TimeEntry, projects: Project[], subProjects: SubProject[], existingKey?: string): GridRowData {
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

export function rowContentEqual(a: GridRowData, b: GridRowData): boolean {
  return (
    a.startTime === b.startTime &&
    a.endTime === b.endTime &&
    a.project === b.project &&
    a.subProject === b.subProject &&
    a.itemNr === b.itemNr &&
    a.taskText === b.taskText
  )
}

export function normalizeKey(value: string): string {
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

export function dedupeRowsById(rows: GridRowData[]): GridRowData[] {
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

export function useGridRows(
  dbEntries: TimeEntry[],
  projects: Project[],
  subProjects: SubProject[],
  editingRows: RefObject<Map<string, number>>
) {
  const initialRows = [createEmptyRow()]
  const [rows, setRows] = useState<GridRowData[]>(initialRows)
  const rowsRef = useRef<GridRowData[]>(initialRows)
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
  }, [dbEntries, projects, subProjects, setRowsImmediate, editingRows])

  return { rows, rowsRef, updateRows, setRows: setRowsImmediate }
}
