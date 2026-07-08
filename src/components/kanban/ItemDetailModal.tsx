import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { db, type Item, type ItemStatus, type Project } from '../../db'
import ItemDetailForm from './ItemDetailForm'
import ItemDetailFooter from './ItemDetailFooter'
import CloseButton from './CloseButton'
import { minutesToHoursInput, parseEstimatedMinutes } from './itemDetailUtils'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface ItemDetailModalProps {
  item?: Item
  defaultStatus?: ItemStatus
  defaultProjectId?: number
  projects: Project[]
  onClose: () => void
}

export default function ItemDetailModal({
  item,
  defaultStatus,
  defaultProjectId,
  projects,
  onClose,
}: ItemDetailModalProps) {
  const { t } = useTranslation()
  const isEdit = !!item

  const [projectId, setProjectId] = useState<number | ''>(item?.projectId ?? defaultProjectId ?? '')
  const [itemNr, setItemNr] = useState(item?.itemNr ?? '')
  const [title, setTitle] = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [status, setStatus] = useState<ItemStatus>(item?.status ?? defaultStatus ?? 'todo')
  const [estimatedHours, setEstimatedHours] = useState(minutesToHoursInput(item?.estimatedMinutes))
  const [url, setUrl] = useState(item?.url ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [infoCollapsed, setInfoCollapsed] = useState(() => localStorage.getItem('itemDetailInfoCollapsed') === 'true')
  const [notesPreview, setNotesPreview] = useState(false)

  useEscapeKey(onClose)

  function toggleInfoCollapsed() {
    setInfoCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('itemDetailInfoCollapsed', String(next))
      return next
    })
  }

  async function handleSave() {
    if (!projectId || !title.trim()) return

    const now = new Date().toISOString()
    const estimatedMinutes = parseEstimatedMinutes(estimatedHours)

    if (isEdit && item?.id) {
      await db.items.update(item.id, {
        projectId: Number(projectId),
        itemNr: itemNr.trim(),
        title: title.trim(),
        description,
        status,
        estimatedMinutes,
        url: url.trim(),
        notes,
        updatedAt: now,
      })
    } else {
      const existingItems = await db.items.where('status').equals(status).toArray()
      const maxSort = existingItems.reduce((max, i) => Math.max(max, i.sortOrder), 0)

      await db.items.add({
        projectId: Number(projectId),
        itemNr: itemNr.trim(),
        title: title.trim(),
        description,
        status,
        estimatedMinutes,
        url: url.trim(),
        notes,
        sortOrder: maxSort + 1000,
        createdAt: now,
        updatedAt: now,
      })
    }
    onClose()
  }

  async function handleDelete() {
    if (item?.id) {
      await db.items.delete(item.id)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold">{isEdit ? t('itemDetail.editItem') : t('itemDetail.newItem')}</h2>
          <CloseButton onClick={onClose} />
        </div>

        <div className="px-6 py-4 space-y-6">
          <ItemDetailForm
            projects={projects}
            projectId={projectId}
            onProjectIdChange={setProjectId}
            itemNr={itemNr}
            onItemNrChange={setItemNr}
            title={title}
            onTitleChange={setTitle}
            description={description}
            onDescriptionChange={setDescription}
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
            notesPreview={notesPreview}
            onToggleNotesPreview={() => setNotesPreview(!notesPreview)}
            notesRows={16}
            notesPreviewMinHeightClass="min-h-[240px]"
          />
        </div>

        <ItemDetailFooter
          showDelete={isEdit}
          confirmDelete={confirmDelete}
          onConfirmDeleteChange={setConfirmDelete}
          onDelete={handleDelete}
          onCancel={onClose}
          onSave={handleSave}
          saveDisabled={!projectId || !title.trim()}
        />
      </div>
    </div>
  )
}
