import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { db, type Item, type ItemStatus, type ItemType, type Project, type SubProject } from '../../db'
import ItemDetailForm from './ItemDetailForm'
import ItemDetailFooter from './ItemDetailFooter'
import CloseButton from './CloseButton'
import { minutesToHoursInput, parseEstimatedMinutes } from './itemDetailUtils'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface ItemDetailModalProps {
  item?: Item
  defaultStatus?: ItemStatus
  defaultProjectId?: number
  defaultSubProjectId?: number
  defaultItemNr?: string
  defaultTitle?: string
  projects: Project[]
  subProjects: SubProject[]
  onClose: () => void
  onCreated?: (item: Item) => void
}

export default function ItemDetailModal({
  item,
  defaultStatus,
  defaultProjectId,
  defaultSubProjectId,
  defaultItemNr,
  defaultTitle,
  projects,
  subProjects,
  onClose,
  onCreated,
}: ItemDetailModalProps) {
  const { t } = useTranslation()
  const isEdit = !!item

  const [projectId, setProjectId] = useState<number | ''>(item?.projectId ?? defaultProjectId ?? '')
  const [subProjectId, setSubProjectId] = useState<number | ''>(item?.subProjectId ?? defaultSubProjectId ?? '')
  const [itemNr, setItemNr] = useState(item?.itemNr ?? defaultItemNr ?? '')
  const [title, setTitle] = useState(item?.title ?? defaultTitle ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [type, setType] = useState<ItemType>(item?.type ?? 'task')
  const [status, setStatus] = useState<ItemStatus>(item?.status ?? defaultStatus ?? 'todo')
  const [estimatedHours, setEstimatedHours] = useState(minutesToHoursInput(item?.estimatedMinutes))
  const [url, setUrl] = useState(item?.url ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [saveError, setSaveError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [infoCollapsed, setInfoCollapsed] = useState(() => localStorage.getItem('itemDetailInfoCollapsed') === 'true')
  const [notesCollapsed, setNotesCollapsed] = useState(() => !(item?.notes ?? '').trim())
  const [notesPreview, setNotesPreview] = useState(false)

  useEscapeKey(onClose)

  function handleProjectIdChange(value: number | '') {
    setProjectId(value)
    const stillValid = subProjects.some((s) => s.id === subProjectId && s.projectId === value)
    if (!stillValid) setSubProjectId('')
  }

  function toggleInfoCollapsed() {
    setInfoCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('itemDetailInfoCollapsed', String(next))
      return next
    })
  }

  function toggleNotesCollapsed() {
    setNotesCollapsed((prev) => !prev)
  }

  async function handleSave() {
    if (!projectId || !title.trim()) return

    const now = new Date().toISOString()
    const estimatedMinutes = parseEstimatedMinutes(estimatedHours)
    const normalizedItemNr = itemNr.trim()
    if (normalizedItemNr) {
      const duplicate = await db.items
        .where('projectId')
        .equals(Number(projectId))
        .filter((candidate) => candidate.id !== item?.id && candidate.itemNr === normalizedItemNr)
        .first()
      if (duplicate) {
        setSaveError(t('itemDetail.duplicateItemNr'))
        return
      }
    }
    setSaveError('')

    if (isEdit && item?.id) {
      await db.items.update(item.id, {
        projectId: Number(projectId),
        subProjectId: subProjectId ? Number(subProjectId) : undefined,
        itemNr: normalizedItemNr,
        title: title.trim(),
        description,
        type,
        status,
        estimatedMinutes,
        url: url.trim(),
        notes,
        updatedAt: now,
      })
    } else {
      const existingItems = await db.items.where('status').equals(status).toArray()
      const maxSort = existingItems.reduce((max, i) => Math.max(max, i.sortOrder), 0)

      const newItem = {
        projectId: Number(projectId),
        subProjectId: subProjectId ? Number(subProjectId) : undefined,
        itemNr: normalizedItemNr,
        title: title.trim(),
        description,
        type,
        status,
        archived: false,
        estimatedMinutes,
        url: url.trim(),
        notes,
        sortOrder: maxSort + 1000,
        createdAt: now,
        updatedAt: now,
      }
      const insertedId = await db.items.add(newItem)
      onCreated?.({ ...newItem, id: insertedId })
    }
    onClose()
  }

  async function handleDelete() {
    if (item?.id) {
      await db.items.update(item.id, { archived: true, updatedAt: new Date().toISOString() })
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold">{isEdit ? t('itemDetail.editItem') : t('itemDetail.newItem')}</h2>
          <CloseButton onClick={onClose} />
        </div>

        <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
          <ItemDetailForm
            projects={projects}
            projectId={projectId}
            onProjectIdChange={handleProjectIdChange}
            subProjects={subProjects}
            subProjectId={subProjectId}
            onSubProjectIdChange={setSubProjectId}
            itemNr={itemNr}
            onItemNrChange={setItemNr}
            title={title}
            onTitleChange={setTitle}
            description={description}
            onDescriptionChange={setDescription}
            type={type}
            onTypeChange={setType}
            status={status}
            onStatusChange={setStatus}
            estimatedHours={estimatedHours}
            onEstimatedHoursChange={setEstimatedHours}
            url={url}
            onUrlChange={setUrl}
            notes={notes}
            onNotesChange={setNotes}
            infoCollapsed={infoCollapsed}
            onToggleInfoCollapsed={toggleInfoCollapsed}
            notesCollapsed={notesCollapsed}
            onToggleNotesCollapsed={toggleNotesCollapsed}
            notesPreview={notesPreview}
            onToggleNotesPreview={() => setNotesPreview(!notesPreview)}
            notesRows={16}
            notesPreviewMinHeightClass="min-h-[240px]"
          />
          {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}
        </div>

        <ItemDetailFooter
          showDelete={isEdit}
          confirmDelete={confirmDelete}
          onConfirmDeleteChange={setConfirmDelete}
          onDelete={handleDelete}
          onCancel={onClose}
          onSave={handleSave}
          saveDisabled={!projectId || !title.trim()}
          className="shrink-0"
        />
      </div>
    </div>
  )
}
