import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { db, type Item, type ItemStatus, type Project } from '../../db'
import ItemDetailForm from './ItemDetailForm'
import { minutesToHoursInput, parseEstimatedMinutes } from './itemDetailUtils'

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

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

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
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
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

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            {isEdit &&
              (confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">{t('itemDetail.confirmDelete')}</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    {t('common.yes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    {t('common.no')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-sm text-red-500 hover:text-red-700 transition-colors"
                >
                  {t('common.delete')}
                </button>
              ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!projectId || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
