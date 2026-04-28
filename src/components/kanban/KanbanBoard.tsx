import { useState } from 'react'
import { type Item, type ItemStatus, type Project } from '../../db'
import KanbanColumn from './KanbanColumn'
import { useTranslation } from 'react-i18next'

interface KanbanBoardProps {
  columns: Record<ItemStatus, Item[]>
  projects: Project[]
  onCardClick: (item: Item) => void
  onDrop: (itemId: number, newStatus: ItemStatus) => void
  onAddItem: (status: ItemStatus) => void
  onDelete: (itemId: number) => void
  itemTimeMap: Map<string, number>
}

const columnConfig: { status: ItemStatus }[] = [
  { status: 'todo' },
  { status: 'in_progress' },
  { status: 'done' },
]

export default function KanbanBoard({
  columns,
  projects,
  onCardClick,
  onDrop,
  onAddItem,
  onDelete,
  itemTimeMap,
}: KanbanBoardProps) {
  const { t } = useTranslation()
  const [isDragging, setIsDragging] = useState(false)
  const [trashOver, setTrashOver] = useState(false)

  return (
    <div
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => { setIsDragging(false); setTrashOver(false) }}
    >
      <div className="grid grid-cols-3 gap-4">
        {columnConfig.map(({ status }) => (
          <KanbanColumn
            key={status}
            title={t(`kanban.column.${status}`)}
            status={status}
            items={columns[status]}
            projects={projects}
            onCardClick={onCardClick}
            onDrop={onDrop}
            onAddItem={onAddItem}
            itemTimeMap={itemTimeMap}
          />
        ))}
      </div>

      <div
        className={`mt-4 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 transition-all ${
          isDragging
            ? trashOver
              ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500'
            : 'border-transparent text-transparent pointer-events-none'
        }`}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setTrashOver(true) }}
        onDragLeave={() => setTrashOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setTrashOver(false)
          const itemId = Number(e.dataTransfer.getData('text/plain'))
          if (itemId) onDelete(itemId)
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
        <span className="text-sm font-medium">{t('kanban.trash')}</span>
      </div>
    </div>
  )
}
