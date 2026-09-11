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
  subProjects: [{ id: 2, projectId: 1, key: 'app', name: 'App', active: true }],
  workItemLinks: [],
  timeEntries: [{ id: 3, date: '2026-07-24', startTime: '09:00', endTime: '10:30', durationMinutes: 90, projectId: 1, subProjectId: 2, itemNr: '123', taskText: 'Planung', notes: 'Wichtig' }],
  items: [],
  todoTasks: [],
  draftRows: [{ id: 4, date: '2026-07-24', rowKey: 'row-abc123-1', startTime: '11:00', endTime: '', project: 'urb', subProject: 'app', itemNr: '', itemTitle: '', taskText: 'Telefonat', notes: '', updatedAt: '2026-07-24T09:00:00.000Z' }],
}

describe('data transfer', () => {
  it('round-trips a versioned full backup', () => {
    const backup = createBackup(data)
    const parsed = parseBackup(JSON.stringify(backup))

    expect(parsed.format).toBe(BACKUP_FORMAT)
    expect(parsed.version).toBe(BACKUP_VERSION)
    expect(parsed.data).toEqual(data)
  })

  it('liest ein Backup der Version 1 ohne draftRows', () => {
    const legacy = {
      format: BACKUP_FORMAT,
      version: 1,
      exportedAt: '2026-07-24T09:00:00.000Z',
      data: {
        projects: data.projects,
        // Version-1-Backups kennen weder draftRows noch das Feld active am Unterprojekt.
        subProjects: [{ id: 2, projectId: 1, key: 'app', name: 'App' }],
        workItemLinks: [],
        timeEntries: data.timeEntries,
        items: [],
        todoTasks: [],
      },
    }
    const parsed = parseBackup(JSON.stringify(legacy))

    expect(parsed.version).toBe(1)
    expect(parsed.data.draftRows).toEqual([])
    expect(parsed.data.subProjects[0].active).toBe(true)
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