import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { db, type ItemStatus } from '../db'
import { useHotkey } from '@tanstack/react-hotkeys'
import KanbanBoard from '../components/kanban/KanbanBoard'
import ItemDetailModal from '../components/kanban/ItemDetailModal'
import ProjectOptions from '../components/kanban/ProjectOptions'

export default function Items() {
  const { t } = useTranslation()
  const [filterProjectId, setFilterProjectId] = useState<number | undefined>()
  const [creatingWithStatus, setCreatingWithStatus] = useState<ItemStatus | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [trashOver, setTrashOver] = useState(false)
  const navigate = useNavigate()

  const projects = useLiveQuery(() => db.projects.toArray()) ?? []
  const subProjects = useLiveQuery(() => db.subProjects.toArray()) ?? []
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

  useHotkey('N', () => setCreatingWithStatus('todo'), { meta: { name: t('kanban.newItem') } })

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
    <div
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => { setIsDragging(false); setTrashOver(false) }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{t('layout.nav.items')}</h1>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed text-xs font-medium transition-all ${
              isDragging
                ? trashOver
                  ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 scale-105'
                  : 'border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500'
                : 'border-transparent text-transparent pointer-events-none'
            }`}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setTrashOver(true) }}
            onDragLeave={() => setTrashOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setTrashOver(false)
              const itemId = Number(e.dataTransfer.getData('text/plain'))
              if (itemId) void handleDelete(itemId)
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            {t('kanban.trash')}
          </div>
        </div>
        <select
          value={filterProjectId ?? ''}
          onChange={(e) => setFilterProjectId(e.target.value ? Number(e.target.value) : undefined)}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-100/10"
        >
          <option value="">{t('items.allProjects')}</option>
          <ProjectOptions projects={projects} />
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
          onAddItem={(status) => setCreatingWithStatus(status)}
          itemTimeMap={itemTimeMap}
        />
      )}


      {creatingWithStatus && (
        <ItemDetailModal
          defaultStatus={creatingWithStatus}
          defaultProjectId={filterProjectId}
          projects={projects}
          subProjects={subProjects}
          onClose={() => setCreatingWithStatus(null)}
        />
      )}
    </div>
  )
}
