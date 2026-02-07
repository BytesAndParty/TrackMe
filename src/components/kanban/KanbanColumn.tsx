import { useState } from 'react'
import { type Item, type ItemStatus, type Project } from '../../db'
import KanbanCard from './KanbanCard'

interface KanbanColumnProps {
  title: string
  status: ItemStatus
  items: Item[]
  projects: Project[]
  onCardClick: (item: Item) => void
  onDrop: (itemId: number, newStatus: ItemStatus) => void
  onAddItem: (status: ItemStatus) => void
  itemTimeMap: Map<string, number>
}

export default function KanbanColumn({
  title,
  status,
  items,
  projects,
  onCardClick,
  onDrop,
  onAddItem,
  itemTimeMap,
}: KanbanColumnProps) {
  const [dragOver, setDragOver] = useState(false)

  const projectMap = new Map(projects.map((p) => [p.id, p]))

  return (
    <div
      className={`flex flex-col rounded-xl bg-slate-50 dark:bg-slate-800/50 border transition-colors min-h-50 ${
        dragOver ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-700'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const itemId = Number(e.dataTransfer.getData('text/plain'))
        if (itemId) onDrop(itemId, status)
      }}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
          <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onAddItem(status)}
          className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          title="Neues Item"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
      <div className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto">
        {items.map((item) => (
          <KanbanCard
            key={item.id}
            item={item}
            project={projectMap.get(item.projectId)}
            onClick={() => onCardClick(item)}
            timeMinutes={itemTimeMap.get(`${item.projectId}-${item.itemNr}`) ?? 0}
          />
        ))}
        {items.length === 0 && (
          <p className="text-xs text-slate-300 dark:text-slate-600 text-center py-8">Keine Items</p>
        )}
      </div>
    </div>
  )
}
