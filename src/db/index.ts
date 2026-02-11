import Dexie, { type EntityTable } from 'dexie'

export interface Project {
  id?: number
  key: string
  name: string
  active: boolean
  color?: string // hex color, e.g. '#3b82f6'
  linkTemplate?: string // e.g. https://dev.azure.com/org/project/_workitems/edit/{itemNr}
}

export interface SubProject {
  id?: number
  projectId: number
  key: string
  name: string
}

export interface WorkItemLink {
  id?: number
  itemId: string
  url: string
  projectId?: number
  subProjectId?: number
}

export interface TimeEntry {
  id?: number
  date: string // ISO date string YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  durationMinutes: number
  projectId?: number
  subProjectId?: number
  workItemLinkId?: number
  itemNr: string
  taskText: string
  notes: string
}

export type ItemStatus = 'todo' | 'in_progress' | 'done'

export interface Item {
  id?: number
  projectId: number
  itemNr: string
  title: string
  description: string
  estimatedMinutes?: number // original estimate in minutes
  status: ItemStatus
  url: string
  notes: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

const db = new Dexie('TrackMeDB') as Dexie & {
  projects: EntityTable<Project, 'id'>
  subProjects: EntityTable<SubProject, 'id'>
  workItemLinks: EntityTable<WorkItemLink, 'id'>
  timeEntries: EntityTable<TimeEntry, 'id'>
  items: EntityTable<Item, 'id'>
}

db.version(1).stores({
  projects: '++id, key, name, active',
  subProjects: '++id, projectId, key, name',
  workItemLinks: '++id, itemId, projectId, subProjectId',
  timeEntries: '++id, date, projectId, subProjectId, workItemLinkId',
})

db.version(2).stores({
  projects: '++id, key, name, active',
  subProjects: '++id, projectId, key, name',
  workItemLinks: '++id, itemId, projectId, subProjectId',
  timeEntries: '++id, date, projectId, subProjectId, workItemLinkId, itemNr',
}).upgrade(tx => {
  return tx.table('timeEntries').toCollection().modify(entry => {
    if (entry.itemNr === undefined) entry.itemNr = ''
  })
})

db.version(3).stores({
  projects: '++id, key, name, active',
  subProjects: '++id, projectId, key, name',
  workItemLinks: '++id, itemId, projectId, subProjectId',
  timeEntries: '++id, date, projectId, subProjectId, workItemLinkId, itemNr',
  items: '++id, projectId, itemNr, status, sortOrder',
})

db.version(4).stores({
  projects: '++id, key, name, active',
  subProjects: '++id, projectId, key, name',
  workItemLinks: '++id, itemId, projectId, subProjectId',
  timeEntries: '++id, date, projectId, subProjectId, workItemLinkId, itemNr',
  items: '++id, projectId, itemNr, status, sortOrder',
})

export const PROJECT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#64748b', // slate
  '#84cc16', // lime
]

/** Lighten a hex color by mixing with white. amount 0-1 */
export function lightenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lr = Math.round(r + (255 - r) * amount)
  const lg = Math.round(g + (255 - g) * amount)
  const lb = Math.round(b + (255 - b) * amount)
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}

export { db }
