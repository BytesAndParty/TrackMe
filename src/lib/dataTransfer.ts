import * as XLSX from 'xlsx'
import { z } from 'zod'
import type { Item, Project, SubProject, TimeEntry, TodoTask, WorkItemLink } from '../db'
import { parseTimeInput } from './parser'

export const BACKUP_FORMAT = 'trackme-backup'
export const BACKUP_VERSION = 1

export interface TrackMeData {
  projects: Project[]
  subProjects: SubProject[]
  workItemLinks: WorkItemLink[]
  timeEntries: TimeEntry[]
  items: Item[]
  todoTasks: TodoTask[]
}

export interface TrackMeBackup {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exportedAt: string
  data: TrackMeData
}

export interface TimeEntryTransferRow {
  date: string
  startTime: string
  endTime: string
  projectKey: string
  subProjectKey: string
  itemNr: string
  taskText: string
  notes: string
}

export interface ImportIssue {
  row: number
  message: string
}

export interface TimeEntryImportResult {
  rows: TimeEntryTransferRow[]
  issues: ImportIssue[]
}

const projectSchema = z.object({
  id: z.number().int().positive().optional(),
  key: z.string().min(1),
  name: z.string().min(1),
  active: z.boolean(),
  color: z.string().optional(),
  linkTemplate: z.string().optional(),
})

const subProjectSchema = z.object({
  id: z.number().int().positive().optional(),
  projectId: z.number().int().positive(),
  key: z.string().min(1),
  name: z.string().min(1),
})

const workItemLinkSchema = z.object({
  id: z.number().int().positive().optional(),
  itemId: z.string(),
  url: z.string(),
  projectId: z.number().int().positive().optional(),
  subProjectId: z.number().int().positive().optional(),
})

const timeEntrySchema = z.object({
  id: z.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string(),
  endTime: z.string(),
  durationMinutes: z.number().nonnegative(),
  projectId: z.number().int().positive().optional(),
  subProjectId: z.number().int().positive().optional(),
  workItemLinkId: z.number().int().positive().optional(),
  itemNr: z.string(),
  taskText: z.string(),
  notes: z.string(),
})

const itemSchema = z.object({
  id: z.number().int().positive().optional(),
  projectId: z.number().int().positive(),
  subProjectId: z.number().int().positive().optional(),
  itemNr: z.string(),
  title: z.string(),
  description: z.string(),
  estimatedMinutes: z.number().nonnegative().optional(),
  status: z.enum(['todo', 'in_progress', 'done']),
  type: z.enum(['task', 'bug', 'requirement']),
  url: z.string(),
  notes: z.string(),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const todoTaskSchema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string(),
  text: z.string(),
  linkedItemId: z.number().int().positive().optional(),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string().datetime(),
  data: z.object({
    projects: z.array(projectSchema),
    subProjects: z.array(subProjectSchema),
    workItemLinks: z.array(workItemLinkSchema),
    timeEntries: z.array(timeEntrySchema),
    items: z.array(itemSchema),
    todoTasks: z.array(todoTaskSchema),
  }),
})

const transferHeaders = {
  date: ['datum', 'date'],
  startTime: ['start', 'startzeit', 'start time'],
  endTime: ['ende', 'endzeit', 'end time'],
  projectKey: ['projekt', 'project', 'projektkuerzel', 'project key'],
  subProjectKey: ['unterprojekt', 'subproject', 'sub project'],
  itemNr: ['item', 'itemnr', 'item nr', 'ticket'],
  taskText: ['aufgabe', 'task', 'beschreibung', 'description'],
  notes: ['notizen', 'notes', 'kommentar', 'comment'],
} as const

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase('de-DE').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

function findValue(record: Record<string, unknown>, names: readonly string[]): unknown {
  for (const [key, value] of Object.entries(record)) {
    if (names.includes(normalizeHeader(key) as never)) return value
  }
  return undefined
}

function toText(value: unknown): string {
  return String(value ?? '').trim()
}

function createTimeEntryTransferRow(record: Record<string, unknown>, row: number): TimeEntryTransferRow | ImportIssue {
  const date = toText(findValue(record, transferHeaders.date))
  const startTime = parseTimeInput(toText(findValue(record, transferHeaders.startTime)))
  const endTime = parseTimeInput(toText(findValue(record, transferHeaders.endTime)))

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { row, message: 'Datum muss im Format JJJJ-MM-TT vorliegen.' }
  }
  if (!startTime || !endTime) {
    return { row, message: 'Start- und Endzeit müssen gültige Uhrzeiten sein.' }
  }
  if (endTime <= startTime) {
    return { row, message: 'Die Endzeit muss nach der Startzeit liegen.' }
  }

  return {
    date,
    startTime,
    endTime,
    projectKey: toText(findValue(record, transferHeaders.projectKey)).toLowerCase(),
    subProjectKey: toText(findValue(record, transferHeaders.subProjectKey)).toLowerCase(),
    itemNr: toText(findValue(record, transferHeaders.itemNr)),
    taskText: toText(findValue(record, transferHeaders.taskText)),
    notes: toText(findValue(record, transferHeaders.notes)),
  }
}

export function createBackup(data: TrackMeData): TrackMeBackup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  }
}

export function parseBackup(raw: string): TrackMeBackup {
  const parsed: unknown = JSON.parse(raw)
  return backupSchema.parse(parsed) as TrackMeBackup
}

export function createTimeEntryTransferRows(
  entries: TimeEntry[],
  projects: Project[],
  subProjects: SubProject[]
): TimeEntryTransferRow[] {
  return entries.map((entry) => ({
    date: entry.date,
    startTime: entry.startTime,
    endTime: entry.endTime,
    projectKey: projects.find((project) => project.id === entry.projectId)?.key ?? '',
    subProjectKey: subProjects.find((subProject) => subProject.id === entry.subProjectId)?.key ?? '',
    itemNr: entry.itemNr,
    taskText: entry.taskText,
    notes: entry.notes,
  }))
}

export function createTimeEntryWorkbook(rows: TimeEntryTransferRow[]): XLSX.WorkBook {
  const worksheetRows = rows.map((row) => ({
    Datum: row.date,
    Start: row.startTime,
    Ende: row.endTime,
    Projekt: row.projectKey,
    Unterprojekt: row.subProjectKey,
    Item: row.itemNr,
    Aufgabe: row.taskText,
    Notizen: row.notes,
  }))
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(worksheetRows)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Zeiteinträge')
  return workbook
}

export function parseTimeEntryWorkbook(workbook: XLSX.WorkBook): TimeEntryImportResult {
  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) return { rows: [], issues: [{ row: 0, message: 'Die Datei enthält kein Tabellenblatt.' }] }

  const worksheet = workbook.Sheets[firstSheet]
  const sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })
  const rows: TimeEntryTransferRow[] = []
  const issues: ImportIssue[] = []

  sourceRows.forEach((record, index) => {
    const result = createTimeEntryTransferRow(record, index + 2)
    if ('message' in result) issues.push(result)
    else rows.push(result)
  })

  return { rows, issues }
}

export async function readTimeEntryFile(file: File): Promise<TimeEntryImportResult> {
  const content = await file.arrayBuffer()
  const workbook = XLSX.read(content, { type: 'array' })
  return parseTimeEntryWorkbook(workbook)
}