import { useState } from 'react'
import { Link, useNavigate, Outlet } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { db, type ItemStatus } from '../db'
import KanbanBoard from '../components/kanban/KanbanBoard'
import ItemDetailModal from '../components/kanban/ItemDetailModal'

export default function Items() {
  const { t } = useTranslation()
  const [filterProjectId, setFilterProjectId] = useState<number | undefined>()
  const [creatingWithStatus, setCreatingWithStatus] = useState<ItemStatus | null>(null)
  const navigate = useNavigate()

  const projects = useLiveQuery(() => db.projects.toArray()) ?? []
  const items = useLiveQuery(
    () => {
      if (filterProjectId) {
        return db.items.where('projectId').equals(filterProjectId).sortBy('sortOrder')
      }
      return db.items.orderBy('sortOrder').toArray()
    },
    [filterProjectId]
  ) ?? []
  const timeEntries = useLiveQuery(() => db.timeEntries.toArray()) ?? []

  // Build time-per-item map
  const itemTimeMap = new Map<string, number>()
  for (const entry of timeEntries) {
    if (entry.itemNr && entry.projectId) {
      const key = `${entry.projectId}-${entry.itemNr}`
      itemTimeMap.set(key, (itemTimeMap.get(key) ?? 0) + entry.durationMinutes)
    }
  }

  const columns = {
    todo: items.filter((i) => i.status === 'todo'),
    in_progress: items.filter((i) => i.status === 'in_progress'),
    done: items.filter((i) => i.status === 'done'),
  }

  async function handleDelete(itemId: number) {
    await db.items.delete(itemId)
  }

  async function handleDrop(itemId: number, newStatus: ItemStatus) {
    const targetItems = columns[newStatus]
    const newSortOrder =
      targetItems.length > 0
        ? targetItems[targetItems.length - 1].sortOrder + 1000
        : 1000

    await db.items.update(itemId, {
      status: newStatus,
      sortOrder: newSortOrder,
      updatedAt: new Date().toISOString(),
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{t('layout.nav.items')}</h1>
        <select
          value={filterProjectId ?? ''}
          onChange={(e) => setFilterProjectId(e.target.value ? Number(e.target.value) : undefined)}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-100/10"
        >
          <option value="">{t('items.allProjects')}</option>
          {projects
            .filter((p) => p.active)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.key} – {p.name}
              </option>
            ))}
        </select>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-slate-300 dark:text-slate-600 mb-4">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <p className="text-slate-500 dark:text-slate-400">{t('items.noProjectsHint')}</p>
          <Link
            to="/projects"
            className="inline-flex items-center mt-3 text-sm font-medium px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            {t('items.noProjectsAction')}
          </Link>
        </div>
      ) : (
        <KanbanBoard
          columns={columns}
          projects={projects}
          onCardClick={(item) => navigate(`/items/${item.id}`)}
          onDrop={handleDrop}
          onDelete={handleDelete}
          onAddItem={(status) => setCreatingWithStatus(status)}
          itemTimeMap={itemTimeMap}
        />
      )}

      <Outlet />

      {creatingWithStatus && (
        <ItemDetailModal
          defaultStatus={creatingWithStatus}
          defaultProjectId={filterProjectId}
          projects={projects}
          onClose={() => setCreatingWithStatus(null)}
        />
      )}
    </div>
  )
}
