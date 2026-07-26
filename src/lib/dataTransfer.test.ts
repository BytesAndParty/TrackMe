import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  createBackup,
  createTimeEntryTransferRows,
  createTimeEntryWorkbook,
  parseBackup,
  parseTimeEntryWorkbook,
  type TrackMeData,
} from './dataTransfer'

const data: TrackMeData = {
  projects: [{ id: 1, key: 'urb', name: 'Urban', active: true }],
  subProjects: [{ id: 2, projectId: 1, key: 'app', name: 'App' }],
  workItemLinks: [],
  timeEntries: [{ id: 3, date: '2026-07-24', startTime: '09:00', endTime: '10:30', durationMinutes: 90, projectId: 1, subProjectId: 2, itemNr: '123', taskText: 'Planung', notes: 'Wichtig' }],
  items: [],
  todoTasks: [],
}

describe('data transfer', () => {
  it('round-trips a versioned full backup', () => {
    const backup = createBackup(data)
    const parsed = parseBackup(JSON.stringify(backup))

    expect(parsed.format).toBe(BACKUP_FORMAT)
    expect(parsed.version).toBe(BACKUP_VERSION)
    expect(parsed.data).toEqual(data)
  })

  it('exports and imports time entries with project keys', () => {
    const rows = createTimeEntryTransferRows(data.timeEntries, data.projects, data.subProjects)
    const result = parseTimeEntryWorkbook(createTimeEntryWorkbook(rows))

    expect(result.issues).toEqual([])
    expect(result.rows).toEqual(rows)
  })

  it('reports invalid imported time ranges', () => {
    const worksheet = XLSX.utils.json_to_sheet([{ Datum: '2026-07-24', Start: '12:00', Ende: '09:00' }])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Zeiteinträge')

    expect(parseTimeEntryWorkbook(workbook)).toEqual({
      rows: [],
      issues: [{ row: 2, message: 'Die Endzeit muss nach der Startzeit liegen.' }],
    })
  })
})