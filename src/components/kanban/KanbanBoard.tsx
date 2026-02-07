import { type Item, type ItemStatus, type Project } from '../../db'
import KanbanColumn from './KanbanColumn'

interface KanbanBoardProps {
  columns: Record<ItemStatus, Item[]>
  projects: Project[]
  onCardClick: (item: Item) => void
  onDrop: (itemId: number, newStatus: ItemStatus) => void
  onAddItem: (status: ItemStatus) => void
  itemTimeMap: Map<string, number>
}

const columnConfig: { status: ItemStatus; title: string }[] = [
  { status: 'todo', title: 'Zu erledigen' },
  { status: 'in_progress', title: 'In Arbeit' },
  { status: 'done', title: 'Erledigt' },
]

export default function KanbanBoard({
  columns,
  projects,
  onCardClick,
  onDrop,
  onAddItem,
  itemTimeMap,
}: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {columnConfig.map(({ status, title }) => (
        <KanbanColumn
          key={status}
          title={title}
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
