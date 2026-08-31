import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Project, type SubProject } from '../db'

// Stabile Fallbacks: ein Literal an dieser Stelle würde bei jedem Render eine neue
// Referenz erzeugen, solange die Live-Query noch kein Ergebnis geliefert hat.
const EMPTY_PROJECTS: Project[] = []
const EMPTY_SUB_PROJECTS: SubProject[] = []

export function useProjectSubProjectLists() {
  const projects = useLiveQuery(() => db.projects.toArray()) ?? EMPTY_PROJECTS
  const subProjects = useLiveQuery(() => db.subProjects.toArray()) ?? EMPTY_SUB_PROJECTS
  return { projects, subProjects }
}
