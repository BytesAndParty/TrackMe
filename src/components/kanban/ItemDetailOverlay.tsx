import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ItemStatus } from '../../db'
import { formatDuration, formatDateShort } from '../../lib/parser'
import MarkdownView from '../MarkdownView'

const statusLabels: Record<ItemStatus, string> = {
  todo: 'Zu erledigen',
  in_progress: 'In Arbeit',
  done: 'Erledigt',
}

function minutesToHoursInput(minutes?: number): string {
  if (!minutes || minutes <= 0) return ''
  const hours = minutes / 60
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/\.?0+$/, '')
}

function parseEstimatedMinutes(rawHours: string): number | undefined {
  const normalized = rawHours.trim().replace(',', '.')
  if (!normalized) return undefined
  const hours = Number(normalized)
  if (!Number.isFinite(hours) || hours <= 0) return undefined
  return Math.round(hours * 60)
}

export default function ItemDetailOverlay() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const numericId = Number(id)
  const returnTo = typeof location.state === 'object' && location.state !== null && 'returnTo' in location.state
    ? location.state.returnTo
    : undefined

  const item = useLiveQuery(
    () => (numericId ? db.items.get(numericId) : undefined),
    [numericId]
  )

  const projects = useLiveQuery(() => db.projects.toArray()) ?? []

  const timeEntries = useLiveQuery(
    () => {
      if (!item?.itemNr || !item?.projectId) return []
      return db.timeEntries
        .where('projectId')
        .equals(item.projectId)
        .filter(e => e.itemNr === item.itemNr)
        .toArray()
    },
    [item?.itemNr, item?.projectId]
  ) ?? []

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
  const [infoCollapsed, setInfoCollapsed] = useState(() => localStorage.getItem('itemDetailInfoCollapsed') === 'true')
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
    setInfoCollapsed(prev => {
      const next = !prev
      localStorage.setItem('itemDetailInfoCollapsed', String(next))
      return next
    })
  }

  if (!item) return null

  const estimatedMinutes = item.estimatedMinutes ?? 0
  const hasEstimate = estimatedMinutes > 0
  const remainingMinutes = estimatedMinutes - totalMinutes

  const inputClass = "w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-100/10"

  return (
    <div className="fixed inset-0 z-100 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={close} />

      {/* Panel */}
      <div className="relative bg-white dark:bg-slate-900 shadow-xl w-full max-w-4xl h-[90vh] mt-[5vh] mr-4 rounded-xl overflow-hidden flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold">
            {item.itemNr ? `#${item.itemNr} – ` : ''}{item.title}
          </h2>
          <button type="button" onClick={close} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
          {/* Collapsible Project Info */}
          <div>
            <button
              type="button"
              onClick={toggleInfoCollapsed}
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
              Projekt-Infos
            </button>

            {!infoCollapsed && (
              <div className="space-y-4">
                {/* Projekt */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Projekt *</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}
                    className={inputClass}
                  >
                    <option value="">Projekt wählen...</option>
                    {projects
                      .filter((p) => p.active)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.key} – {p.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Item Nr + Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Item Nr</label>
                    <input
                      type="text"
                      value={itemNr}
                      onChange={(e) => setItemNr(e.target.value)}
                      placeholder="z.B. 1234"
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ItemStatus)}
                      className={inputClass}
                    >
                      {(Object.entries(statusLabels) as [ItemStatus, string][]).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Aufwandsschaetzung */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Schätzung (Stunden)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    placeholder="z.B. 8"
                    className={inputClass}
                  />
                </div>

                {/* Titel */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Titel *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Kurzbeschreibung des Items"
                    className={inputClass}
                  />
                </div>

                {/* Beschreibung */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Beschreibung</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Details zum Item..."
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {/* URL */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://dev.azure.com/..."
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notizen — always visible */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Persönliche Notizen</label>
              <button
                type="button"
                onClick={() => setNotesPreview(!notesPreview)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                title={notesPreview ? 'Bearbeiten' : 'Vorschau'}
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
              <div className="min-h-[150px] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800">
                {notes.trim() ? (
                  <MarkdownView content={notes} />
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic">Keine Notizen vorhanden.</p>
                )}
              </div>
            ) : (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={12}
                placeholder="Eigene Notizen zu diesem Item... (Markdown wird unterstützt)"
                className={`${inputClass} resize-none`}
              />
            )}
          </div>

          {/* Time Entries Section */}
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
              Zeiteinträge ({timeEntries.length}) &middot; {formatDuration(totalMinutes)} gesamt
            </h3>
            {hasEstimate && (
              <p className={`text-xs mb-3 ${remainingMinutes >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                Schätzung {formatDuration(estimatedMinutes)} &middot; Erfasst {formatDuration(totalMinutes)} &middot;{' '}
                {remainingMinutes >= 0
                  ? `${formatDuration(remainingMinutes)} übrig`
                  : `${formatDuration(Math.abs(remainingMinutes))} drüber`}
              </p>
            )}
            {timeEntries.length > 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-2">Datum</th>
                      <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-2">Start</th>
                      <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-2">Ende</th>
                      <th className="text-right text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-2">Dauer</th>
                      <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-2">Kommentar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {timeEntries
                      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                      .map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300">{formatDateShort(entry.date)}</td>
                          <td className="px-4 py-2 text-sm tabular-nums text-slate-600 dark:text-slate-400">{entry.startTime}</td>
                          <td className="px-4 py-2 text-sm tabular-nums text-slate-600 dark:text-slate-400">{entry.endTime}</td>
                          <td className="px-4 py-2 text-sm tabular-nums text-right font-medium">{formatDuration(entry.durationMinutes)}</td>
                          <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">{entry.taskText}</td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                      <td colSpan={3} className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Gesamt</td>
                      <td className="px-4 py-2 text-right text-sm tabular-nums font-bold">{formatDuration(totalMinutes)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">Keine Zeiteinträge vorhanden.</p>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Wirklich löschen?</span>
                <button type="button" onClick={handleDelete} className="text-xs font-medium text-red-600 hover:text-red-700">
                  Ja
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                  Nein
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Löschen
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!projectId || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
