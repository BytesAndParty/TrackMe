import { useState, useEffect } from 'react'
import { db, type Item, type ItemStatus, type Project } from '../../db'

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
  const isEdit = !!item

  const [projectId, setProjectId] = useState<number | ''>(item?.projectId ?? defaultProjectId ?? '')
  const [itemNr, setItemNr] = useState(item?.itemNr ?? '')
  const [title, setTitle] = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [status, setStatus] = useState<ItemStatus>(item?.status ?? defaultStatus ?? 'todo')
  const [url, setUrl] = useState(item?.url ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  async function handleSave() {
    if (!projectId || !title.trim()) return

    const now = new Date().toISOString()

    if (isEdit && item?.id) {
      await db.items.update(item.id, {
        projectId: Number(projectId),
        itemNr: itemNr.trim(),
        title: title.trim(),
        description,
        status,
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {isEdit ? 'Item bearbeiten' : 'Neues Item'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
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
                  <option key={key} value={key}>
                    {label}
                  </option>
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
              rows={10}
              placeholder="Eigene Notizen zu diesem Item..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
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
                    className="text-xs font-medium text-slate-500 hover:text-slate-700"
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
