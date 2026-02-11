import { useState, useEffect } from 'react'
import { db, type Item, type ItemStatus, type Project } from '../../db'
import MarkdownView from '../MarkdownView'

interface ItemDetailModalProps {
  item?: Item
  defaultStatus?: ItemStatus
  defaultProjectId?: number
  projects: Project[]
  onClose: () => void
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

export default function ItemDetailModal({
  item,
  defaultStatus,
  defaultProjectId,
  projects,
  onClose,
}: ItemDetailModalProps) {
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
    setInfoCollapsed(prev => {
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

  const statusLabels: Record<ItemStatus, string> = {
    todo: 'Zu erledigen',
    in_progress: 'In Arbeit',
    done: 'Erledigt',
  }

  const inputClass = "w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-100/10"

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {isEdit ? 'Item bearbeiten' : 'Neues Item'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
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
                        <option key={key} value={key}>
                          {label}
                        </option>
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
              <div className="min-h-[240px] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800">
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
                rows={16}
                placeholder="Eigene Notizen zu diesem Item... (Markdown wird unterstützt)"
                className={`${inputClass} resize-none`}
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            {isEdit && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">Wirklich löschen?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Ja
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
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
              )
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
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
