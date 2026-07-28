import { useState } from 'react'
import { type ItemStatus, type ItemType, type Project, type SubProject } from '../db'
import { createProjectIdChangeHandler } from '../components/kanban/itemDetailUtils'
import { useCollapsedSections } from './useCollapsedSections'

interface InitialItemDetailFields {
  projectId?: number | ''
  subProjectId?: number | ''
  itemNr?: string
  title?: string
  description?: string
  type?: ItemType
  status?: ItemStatus
  estimatedHours?: string
  url?: string
  notes?: string
  notesCollapsed: boolean
}

export function useItemDetailFields(projects: Project[], subProjects: SubProject[], initial: InitialItemDetailFields) {
  const [projectId, setProjectId] = useState<number | ''>(initial.projectId ?? '')
  const [subProjectId, setSubProjectId] = useState<number | ''>(initial.subProjectId ?? '')
  const [itemNr, setItemNr] = useState(initial.itemNr ?? '')
  const [title, setTitle] = useState(initial.title ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [type, setType] = useState<ItemType>(initial.type ?? 'task')
  const [status, setStatus] = useState<ItemStatus>(initial.status ?? 'todo')
  const [estimatedHours, setEstimatedHours] = useState(initial.estimatedHours ?? '')
  const [url, setUrl] = useState(initial.url ?? '')
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [notesPreview, setNotesPreview] = useState(false)
  const { infoCollapsed, toggleInfoCollapsed, notesCollapsed, setNotesCollapsed, toggleNotesCollapsed } =
    useCollapsedSections(initial.notesCollapsed)

  const onProjectIdChange = createProjectIdChangeHandler(subProjects, subProjectId, setSubProjectId, setProjectId)

  const formProps = {
    projects,
    projectId,
    onProjectIdChange,
    subProjects,
    subProjectId,
    onSubProjectIdChange: setSubProjectId,
    itemNr,
    onItemNrChange: setItemNr,
    title,
    onTitleChange: setTitle,
    description,
    onDescriptionChange: setDescription,
    type,
    onTypeChange: setType,
    status,
    onStatusChange: setStatus,
    estimatedHours,
    onEstimatedHoursChange: setEstimatedHours,
    url,
    onUrlChange: setUrl,
    notes,
    onNotesChange: setNotes,
    infoCollapsed,
    onToggleInfoCollapsed: toggleInfoCollapsed,
    notesCollapsed,
    onToggleNotesCollapsed: toggleNotesCollapsed,
    notesPreview,
    onToggleNotesPreview: () => setNotesPreview(!notesPreview),
  }

  return {
    formProps,
    projectId,
    subProjectId,
    itemNr,
    title,
    description,
    type,
    status,
    estimatedHours,
    url,
    notes,
    setProjectId,
    setSubProjectId,
    setItemNr,
    setTitle,
    setDescription,
    setType,
    setStatus,
    setEstimatedHours,
    setUrl,
    setNotes,
    setNotesCollapsed,
  }
}
