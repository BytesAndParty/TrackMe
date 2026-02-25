import { type Item, type ItemStatus, type Project } from '../../db'
import KanbanColumn from './KanbanColumn'
import { useTranslation } from 'react-i18next'

interface KanbanBoardProps {
  columns: Record<ItemStatus, Item[]>
  projects: Project[]
  onCardClick: (item: Item) => void
  onDrop: (itemId: number, newStatus: ItemStatus) => void
  onAddItem: (status: ItemStatus) => void
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
  itemTimeMap,
}: KanbanBoardProps) {
  const { t } = useTranslation()

  return (
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
  )
}
