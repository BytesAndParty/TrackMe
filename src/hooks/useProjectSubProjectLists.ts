import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export function useProjectSubProjectLists() {
  const projects = useLiveQuery(() => db.projects.toArray()) ?? []
  const subProjects = useLiveQuery(() => db.subProjects.toArray()) ?? []
  return { projects, subProjects }
}
