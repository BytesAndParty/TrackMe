import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { db, type ItemStatus } from '../../db'
import { formatDuration, formatDateShort } from '../../lib/parser'
import ItemDetailForm from './ItemDetailForm'
import { minutesToHoursInput, parseEstimatedMinutes } from './itemDetailUtils'

export default function ItemDetailOverlay() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const numericId = Number(id)
  const returnTo =
    typeof location.state === 'object' && location.state !== null && 'returnTo' in location.state
      ? location.state.returnTo
      : undefined

  const item = useLiveQuery(() => (numericId ? db.items.get(numericId) : undefined), [numericId])

  const projects = useLiveQuery(() => db.projects.toArray()) ?? []

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

  const [projectId, setProjectId] = useState<number | ''>('')
  const [itemNr, setItemNr] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ItemStatus>('todo')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [infoCollapsed, setInfoCollapsed] = useState(
    () => localStorage.getItem('itemDetailInfoCollapsed') === 'true'
  )
  const [notesPreview, setNotesPreview] = useState(false)

  useEffect(() => {
    if (item) {
      setProjectId(item.projectId)
      setItemNr(item.itemNr)
      setTitle(item.title)
      setDescription(item.description)
      setStatus(item.status)
      setEstimatedHours(minutesToHoursInput(item.estimatedMinutes))
      setUrl(item.url)
      setNotes(item.notes)
    }
  }, [item])

  function close() {
    navigate(typeof returnTo === 'string' ? returnTo : '/items')
  }

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [close])

  async function handleSave() {
    if (!item?.id || !projectId || !title.trim()) return
    const estimatedMinutes = parseEstimatedMinutes(estimatedHours)
    await db.items.update(item.id, {
      projectId: Number(projectId),
      itemNr: itemNr.trim(),
      title: title.trim(),
      description,
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
      await db.items.delete(item.id)
      close()
    }
  }

  function toggleInfoCollapsed() {
    setInfoCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('itemDetailInfoCollapsed', String(next))
      return next
    })
  }

  if (!item) return null

  const estimatedMinutes = item.estimatedMinutes ?? 0
  const hasEstimate = estimatedMinutes > 0
  const remainingMinutes = estimatedMinutes - totalMinutes

  return (
    <div className="fixed inset-0 z-100 flex justify-end">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={close} />

      <div className="relative bg-white dark:bg-slate-900 shadow-xl w-full max-w-4xl h-[90vh] mt-[5vh] mr-4 rounded-xl overflow-hidden flex flex-col animate-slide-in-right">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold">
            {item.itemNr ? `#${item.itemNr} – ` : ''}
            {item.title}
          </h2>
          <button
            type="button"
            onClick={close}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
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
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div>
            {confirmDelete ? (
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
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
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
