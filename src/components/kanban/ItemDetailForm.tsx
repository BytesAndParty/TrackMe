import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { type ItemStatus, type Project } from '../../db'
import MarkdownView from '../MarkdownView'

interface ItemDetailFormProps {
  projects: Project[]
  projectId: number | ''
  onProjectIdChange: (value: number | '') => void
  itemNr: string
  onItemNrChange: (value: string) => void
  title: string
  onTitleChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  status: ItemStatus
  onStatusChange: (value: ItemStatus) => void
  estimatedHours: string
  onEstimatedHoursChange: (value: string) => void
  url: string
  onUrlChange: (value: string) => void
  notes: string
  onNotesChange: (value: string) => void
  infoCollapsed: boolean
  onToggleInfoCollapsed: () => void
  notesPreview: boolean
  onToggleNotesPreview: () => void
  notesRows?: number
  notesPreviewMinHeightClass?: string
  afterNotes?: ReactNode
}

const inputClass =
  'w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-100/10'

export default function ItemDetailForm({
  projects,
  projectId,
  onProjectIdChange,
  itemNr,
  onItemNrChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  status,
  onStatusChange,
  estimatedHours,
  onEstimatedHoursChange,
  url,
  onUrlChange,
  notes,
  onNotesChange,
  infoCollapsed,
  onToggleInfoCollapsed,
  notesPreview,
  onToggleNotesPreview,
  notesRows = 12,
  notesPreviewMinHeightClass = 'min-h-[150px]',
  afterNotes,
}: ItemDetailFormProps) {
  const { t } = useTranslation()

  const statusLabels: Record<ItemStatus, string> = {
    todo: t('itemDetail.status.todo'),
    in_progress: t('itemDetail.status.in_progress'),
    done: t('itemDetail.status.done'),
  }

  return (
    <>
      <div>
        <button
          type="button"
          onClick={onToggleInfoCollapsed}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors mb-3"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${infoCollapsed ? '-rotate-90' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {t('itemDetail.projectInfo')}
        </button>

        {!infoCollapsed && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t('itemDetail.projectRequired')}
              </label>
              <select
                value={projectId}
                onChange={(e) => onProjectIdChange(e.target.value ? Number(e.target.value) : '')}
                className={inputClass}
              >
                <option value="">{t('itemDetail.selectProject')}</option>
                {projects
                  .filter((p) => p.active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.key} – {p.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t('itemDetail.itemNr')}
                </label>
                <input
                  type="text"
                  value={itemNr}
                  onChange={(e) => onItemNrChange(e.target.value)}
                  placeholder={t('itemDetail.itemNrPlaceholder')}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t('itemDetail.statusLabel')}
                </label>
                <select
                  value={status}
                  onChange={(e) => onStatusChange(e.target.value as ItemStatus)}
                  className={inputClass}
                >
                  {(Object.entries(statusLabels) as [ItemStatus, string][]).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t('itemDetail.estimateHours')}
              </label>
              <input
                type="number"
                min="0"
                step="0.25"
                value={estimatedHours}
                onChange={(e) => onEstimatedHoursChange(e.target.value)}
                placeholder={t('itemDetail.estimateHoursPlaceholder')}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t('itemDetail.titleRequired')}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder={t('itemDetail.titlePlaceholder')}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t('itemDetail.description')}
              </label>
              <textarea
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                rows={3}
                placeholder={t('itemDetail.descriptionPlaceholder')}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t('itemDetail.url')}
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://dev.azure.com/..."
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('itemDetail.notes')}
          </label>
          <button
            type="button"
            onClick={onToggleNotesPreview}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            title={notesPreview ? t('common.edit') : t('common.preview')}
          >
            {notesPreview ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        {notesPreview ? (
          <div className={`${notesPreviewMinHeightClass} border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800`}>
            {notes.trim() ? (
              <MarkdownView content={notes} />
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">{t('common.noNotes')}</p>
            )}
          </div>
        ) : (
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={notesRows}
            placeholder={t('itemDetail.notesPlaceholder')}
            className={`${inputClass} resize-none`}
          />
        )}
      </div>

      {afterNotes}
    </>
  )
}
