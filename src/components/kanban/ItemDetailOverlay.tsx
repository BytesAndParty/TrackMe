import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { db } from '../../db'
import { formatDuration, formatDateShort } from '../../lib/parser'
import ItemDetailForm from './ItemDetailForm'
import ItemDetailFooter from './ItemDetailFooter'
import CloseButton from './CloseButton'
import { minutesToHoursInput, validateItemSave } from './itemDetailUtils'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useItemDetailFields } from '../../hooks/useItemDetailFields'
import { useProjectSubProjectLists } from '../../hooks/useProjectSubProjectLists'

interface Props {
  itemId?: number
  onClose?: () => void
  mode?: 'modal' | 'page'
}

export default function ItemDetailOverlay({ itemId: propItemId, onClose: propOnClose, mode = 'modal' }: Props = {}) {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const numericId = propItemId ?? Number(id)
  const returnTo =
    typeof location.state === 'object' && location.state !== null && 'returnTo' in location.state
      ? location.state.returnTo
      : undefined

  const item = useLiveQuery(() => (numericId ? db.items.get(numericId) : undefined), [numericId])

  const { projects, subProjects } = useProjectSubProjectLists()

  const timeEntries =
    useLiveQuery(() => {
      if (!item?.itemNr || !item?.projectId) return []
      return db.timeEntries
        .where('projectId')
        .equals(item.projectId)
        .filter((e) => e.itemNr === item.itemNr)
        .toArray()
    }, [item?.itemNr, item?.projectId]) ?? []

  const totalMinutes = timeEntries.reduce((sum, e) => sum + e.durationMinutes, 0)

  const {
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
  } = useItemDetailFields(projects, subProjects, { notesCollapsed: true })
  const [saveError, setSaveError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (item) {
      setProjectId(item.projectId)
      setSubProjectId(item.subProjectId ?? '')
      setItemNr(item.itemNr)
      setTitle(item.title)
      setDescription(item.description)
      setType(item.type)
      setStatus(item.status)
      setEstimatedHours(minutesToHoursInput(item.estimatedMinutes))
      setUrl(item.url)
      setNotes(item.notes)
      setNotesCollapsed(!item.notes?.trim())
    }
  }, [item, setProjectId, setSubProjectId, setItemNr, setTitle, setDescription, setType, setStatus, setEstimatedHours, setUrl, setNotes, setNotesCollapsed])

  const close = useCallback(() => {
    if (propOnClose) {
      propOnClose()
    } else {
      navigate(typeof returnTo === 'string' ? returnTo : '/items')
    }
  }, [propOnClose, navigate, returnTo])

  useEscapeKey(close)

  async function handleSave() {
    if (!item?.id || !projectId || !title.trim()) return
    const validation = await validateItemSave(Number(projectId), itemNr, estimatedHours, item.id)
    if (!validation.ok) {
      setSaveError(t('itemDetail.duplicateItemNr'))
      return
    }
    setSaveError('')
    const { normalizedItemNr, estimatedMinutes } = validation
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
      updatedAt: new Date().toISOString(),
    })
    close()
  }

  async function handleDelete() {
    if (item?.id) {
      await db.items.update(item.id, { archived: true, updatedAt: new Date().toISOString() })
      close()
    }
  }

  if (!item) return null

  const estimatedMinutes = item.estimatedMinutes ?? 0
  const hasEstimate = estimatedMinutes > 0
  const remainingMinutes = estimatedMinutes - totalMinutes

  const panelContent = (
    <>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold">
            {item.itemNr ? `#${item.itemNr} – ` : ''}
            {item.title}
          </h2>
          <CloseButton onClick={close} />
        </div>

        <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
          <ItemDetailForm
            {...formProps}
            afterNotes={
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                  {t('itemDetail.timeEntriesSummary', {
                    count: timeEntries.length,
                    duration: formatDuration(totalMinutes),
                  })}
                </h3>
                {hasEstimate && (
                  <p
                    className={`text-xs mb-3 ${
                      remainingMinutes >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {t('itemDetail.estimateSummary', {
                      estimated: formatDuration(estimatedMinutes),
                      logged: formatDuration(totalMinutes),
                      balance:
                        remainingMinutes >= 0
                          ? t('kanban.remaining', { duration: formatDuration(remainingMinutes) })
                          : t('kanban.over', { duration: formatDuration(Math.abs(remainingMinutes)) }),
                    })}
                  </p>
                )}
                {timeEntries.length > 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-700">
                          <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-2">
                            {t('itemDetail.date')}
                          </th>
                          <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-2">
                            {t('itemDetail.start')}
                          </th>
                          <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-2">
                            {t('itemDetail.end')}
                          </th>
                          <th className="text-right text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-2">
                            {t('common.duration')}
                          </th>
                          <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-2">
                            {t('itemDetail.comment')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {timeEntries
                          .sort(
                            (a, b) =>
                              a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
                          )
                          .map((entry) => (
                            <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300">
                                {formatDateShort(entry.date)}
                              </td>
                              <td className="px-4 py-2 text-sm tabular-nums text-slate-600 dark:text-slate-400">
                                {entry.startTime}
                              </td>
                              <td className="px-4 py-2 text-sm tabular-nums text-slate-600 dark:text-slate-400">
                                {entry.endTime}
                              </td>
                              <td className="px-4 py-2 text-sm tabular-nums text-right font-medium">
                                {formatDuration(entry.durationMinutes)}
                              </td>
                              <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">
                                {entry.taskText}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                          <td colSpan={3} className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {t('common.total')}
                          </td>
                          <td className="px-4 py-2 text-right text-sm tabular-nums font-bold">
                            {formatDuration(totalMinutes)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500">{t('itemDetail.noTimeEntries')}</p>
                )}
              </div>
            }
          />
          {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}
        </div>

        <ItemDetailFooter
          confirmDelete={confirmDelete}
          onConfirmDeleteChange={setConfirmDelete}
          onDelete={handleDelete}
          onCancel={close}
          onSave={handleSave}
          saveDisabled={!projectId || !title.trim()}
          className="shrink-0"
        />
    </>
  )

  if (mode === 'page') {
    return (
      <div className="bg-white dark:bg-slate-900 flex flex-col h-full overflow-hidden">
        {panelContent}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-100 flex justify-end">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={close} />
      <div className="relative bg-white dark:bg-slate-900 shadow-xl w-full max-w-4xl h-[90vh] mt-[5vh] mr-4 rounded-xl overflow-hidden flex flex-col animate-slide-in-right">
        {panelContent}
      </div>
    </div>
  )
}
