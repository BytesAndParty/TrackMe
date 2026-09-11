import { useCallback, useEffect, useRef } from 'react'
import { db, type DraftRow } from '../db'
import { calculateDuration } from '../lib/parser'
import { type GridRowData } from './useGridRows'

/** Eine Zeile ist speicherbar, sobald sie eine gültige Zeitspanne hat. */
export function isCommittableRow(row: GridRowData): boolean {
  return Boolean(row.startTime && row.endTime && calculateDuration(row.startTime, row.endTime) > 0)
}

/** Leere Zeilen brauchen keinen Draft - sonst würde jede angetippte Zeile einen Eintrag erzeugen. */
export function hasDraftContent(row: GridRowData): boolean {
  return Boolean(
    row.startTime ||
      row.endTime ||
      row.project.trim() ||
      row.subProject.trim() ||
      row.itemNr.trim() ||
      row.taskText.trim() ||
      row._notes.trim()
  )
}

/**
 * Zeilen, die noch keine gültige Zeitbuchung ergeben, aber schon Inhalt haben. Nur diese
 * gehören in draftRows - alles andere ist entweder leer oder bereits in timeEntries.
 */
function draftCandidates(rows: GridRowData[]): GridRowData[] {
  return rows.filter((row) => !isCommittableRow(row) && hasDraftContent(row))
}

export function draftToRow(draft: DraftRow): GridRowData {
  return {
    _key: draft.rowKey,
    _dirty: true,
    _isNew: false,
    _draft: true,
    _notes: draft.notes,
    startTime: draft.startTime,
    endTime: draft.endTime,
    project: draft.project,
    subProject: draft.subProject,
    itemNr: draft.itemNr,
    itemTitle: draft.itemTitle,
    taskText: draft.taskText,
  }
}

export function useDraftRows(date: string, rowsRef: React.RefObject<GridRowData[]>) {
  const dateRef = useRef(date)
  useEffect(() => {
    dateRef.current = date
  }, [date])

  /**
   * Schreibt den aktuellen Draft-Stand für ein Datum. Immer als Komplettabgleich, damit
   * Zeilen, die inzwischen gültig (oder wieder leer) geworden sind, verschwinden.
   */
  const persistDrafts = useCallback(async (targetDate: string, rows: GridRowData[]) => {
    const candidates = draftCandidates(rows)
    const now = new Date().toISOString()

    await db.transaction('rw', db.draftRows, async () => {
      const existing = await db.draftRows.where('date').equals(targetDate).toArray()
      const keep = new Set(candidates.map((row) => row._key))

      const obsolete = existing.filter((draft) => !keep.has(draft.rowKey)).map((draft) => draft.id!)
      if (obsolete.length > 0) await db.draftRows.bulkDelete(obsolete)

      const idByRowKey = new Map(existing.map((draft) => [draft.rowKey, draft.id!]))
      await db.draftRows.bulkPut(
        candidates.map((row) => ({
          id: idByRowKey.get(row._key),
          date: targetDate,
          rowKey: row._key,
          startTime: row.startTime,
          endTime: row.endTime,
          project: row.project,
          subProject: row.subProject,
          itemNr: row.itemNr,
          itemTitle: row.itemTitle,
          taskText: row.taskText,
          notes: row._notes,
          updatedAt: now,
        }))
      )
    })
  }, [])

  const flushDrafts = useCallback(() => {
    return persistDrafts(dateRef.current, rowsRef.current)
  }, [persistDrafts, rowsRef])

  /** Draft entfernen, sobald die Zeile als echte Zeitbuchung gelandet ist. */
  const clearDraft = useCallback(async (rowKey: string) => {
    await db.draftRows.where('rowKey').equals(rowKey).delete()
  }, [])

  // Beim Verlassen der Ansicht sichern - hier landen die Zeilen, die commitAllDirty
  // mangels gültiger Zeitspanne überspringen muss. Der Ref-Zugriff im Cleanup ist hier
  // gewollt: gebraucht wird der Stand zum Unmount-Zeitpunkt, nicht der beim Mount.
  useEffect(() => {
    const rows = rowsRef
    return () => {
      void persistDrafts(dateRef.current, rows.current)
    }
  }, [persistDrafts, rowsRef])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') void flushDrafts()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [flushDrafts])

  return { persistDrafts, flushDrafts, clearDraft }
}
