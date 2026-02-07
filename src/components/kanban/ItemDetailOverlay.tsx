import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ItemStatus } from '../../db'
import { formatDuration, formatDateShort } from '../../lib/parser'

const statusLabels: Record<ItemStatus, string> = {
  todo: 'Zu erledigen',
  in_progress: 'In Arbeit',
  done: 'Erledigt',
}

export default function ItemDetailOverlay() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const numericId = Number(id)

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
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (item) {
      setProjectId(item.projectId)
      setItemNr(item.itemNr)
      setTitle(item.title)
      setDescription(item.description)
      setStatus(item.status)
      setUrl(item.url)
      setNotes(item.notes)
    }
  }, [item])

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [])

  function close() {
    navigate('/items')
  }

  async function handleSave() {
    if (!item?.id || !projectId || !title.trim()) return
    await db.items.update(item.id, {
      projectId: Number(projectId),
      itemNr: itemNr.trim(),
      title: title.trim(),
      description,
      status,
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

  if (!item) return null

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={close} />

      {/* Panel */}
      <div className="relative bg-white shadow-xl w-full max-w-4xl h-[90vh] mt-[5vh] mr-4 rounded-xl overflow-hidden flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-slate-900">
            {item.itemNr ? `#${item.itemNr} – ` : ''}{item.title}
          </h2>
          <button type="button" onClick={close} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
          {/* Form fields */}
          <div className="space-y-4">
            {/* Projekt */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Projekt *</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
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
                <label className="block text-xs font-medium text-slate-500 mb-1">Item Nr</label>
                <input
                  type="text"
                  value={itemNr}
                  onChange={(e) => setItemNr(e.target.value)}
                  placeholder="z.B. 1234"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ItemStatus)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  {(Object.entries(statusLabels) as [ItemStatus, string][]).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Titel */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Titel *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Kurzbeschreibung des Items"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            {/* Beschreibung */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Beschreibung</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Details zum Item..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
              />
            </div>

            {/* URL */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://dev.azure.com/..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            {/* Notizen */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Persönliche Notizen</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                placeholder="Eigene Notizen zu diesem Item..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
              />
            </div>
          </div>

          {/* Time Entries Section */}
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-3">
              Zeiteinträge ({timeEntries.length}) &middot; {formatDuration(totalMinutes)} gesamt
            </h3>
            {timeEntries.length > 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-2">Datum</th>
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-2">Start</th>
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-2">Ende</th>
                      <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-2">Dauer</th>
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-2">Kommentar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {timeEntries
                      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                      .map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 text-sm text-slate-700">{formatDateShort(entry.date)}</td>
                          <td className="px-4 py-2 text-sm tabular-nums text-slate-600">{entry.startTime}</td>
                          <td className="px-4 py-2 text-sm tabular-nums text-slate-600">{entry.endTime}</td>
                          <td className="px-4 py-2 text-sm tabular-nums text-right font-medium">{formatDuration(entry.durationMinutes)}</td>
                          <td className="px-4 py-2 text-sm text-slate-500">{entry.taskText}</td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50/50">
                      <td colSpan={3} className="px-4 py-2 text-xs font-medium text-slate-500">Gesamt</td>
                      <td className="px-4 py-2 text-right text-sm tabular-nums font-bold">{formatDuration(totalMinutes)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Keine Zeiteinträge vorhanden.</p>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Wirklich löschen?</span>
                <button type="button" onClick={handleDelete} className="text-xs font-medium text-red-600 hover:text-red-700">
                  Ja
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs font-medium text-slate-500 hover:text-slate-700">
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
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!projectId || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
