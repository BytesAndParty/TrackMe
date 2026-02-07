import { useState } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ItemStatus } from '../db'
import KanbanBoard from '../components/kanban/KanbanBoard'
import ItemDetailModal from '../components/kanban/ItemDetailModal'

export default function Items() {
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
        <h1 className="text-xl font-bold">Items</h1>
        <select
          value={filterProjectId ?? ''}
          onChange={(e) => setFilterProjectId(e.target.value ? Number(e.target.value) : undefined)}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-100/10"
        >
          <option value="">Alle Projekte</option>
          {projects
            .filter((p) => p.active)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.key} – {p.name}
              </option>
            ))}
        </select>
      </div>

      <KanbanBoard
        columns={columns}
        projects={projects}
        onCardClick={(item) => navigate(`/items/${item.id}`)}
        onDrop={handleDrop}
        onAddItem={(status) => setCreatingWithStatus(status)}
        itemTimeMap={itemTimeMap}
      />

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
