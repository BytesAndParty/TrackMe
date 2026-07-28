import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { db, type Item, type ItemStatus, type Project, type SubProject } from '../../db'
import ItemDetailForm from './ItemDetailForm'
import ItemDetailFooter from './ItemDetailFooter'
import CloseButton from './CloseButton'
import { minutesToHoursInput, validateItemSave } from './itemDetailUtils'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useItemDetailFields } from '../../hooks/useItemDetailFields'

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

  const { formProps, projectId, itemNr, title, description, type, status, estimatedHours, url, subProjectId, notes } = useItemDetailFields(
    projects,
    subProjects,
    {
      projectId: item?.projectId ?? defaultProjectId ?? '',
      subProjectId: item?.subProjectId ?? defaultSubProjectId ?? '',
      itemNr: item?.itemNr ?? defaultItemNr ?? '',
      title: item?.title ?? defaultTitle ?? '',
      description: item?.description ?? '',
      type: item?.type ?? 'task',
      status: item?.status ?? defaultStatus ?? 'todo',
      estimatedHours: minutesToHoursInput(item?.estimatedMinutes),
      url: item?.url ?? '',
      notes: item?.notes ?? '',
      notesCollapsed: !(item?.notes ?? '').trim(),
    }
  )
  const [saveError, setSaveError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEscapeKey(onClose)

  async function handleSave() {
    if (!projectId || !title.trim()) return

    const now = new Date().toISOString()
    const validation = await validateItemSave(Number(projectId), itemNr, estimatedHours, item?.id)
    if (!validation.ok) {
      setSaveError(t('itemDetail.duplicateItemNr'))
      return
    }
    setSaveError('')
    const { normalizedItemNr, estimatedMinutes } = validation

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
          <ItemDetailForm {...formProps} notesRows={16} notesPreviewMinHeightClass="min-h-[240px]" />
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
