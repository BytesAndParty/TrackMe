import Dexie, { type EntityTable } from 'dexie'

export interface Project {
  id?: number
  key: string
  name: string
  active: boolean
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
  taskText: string
  notes: string
}

const db = new Dexie('TrackMeDB') as Dexie & {
  projects: EntityTable<Project, 'id'>
  subProjects: EntityTable<SubProject, 'id'>
  workItemLinks: EntityTable<WorkItemLink, 'id'>
  timeEntries: EntityTable<TimeEntry, 'id'>
}

db.version(1).stores({
  projects: '++id, key, name, active',
  subProjects: '++id, projectId, key, name',
  workItemLinks: '++id, itemId, projectId, subProjectId',
  timeEntries: '++id, date, projectId, subProjectId, workItemLinkId',
})

export { db }
