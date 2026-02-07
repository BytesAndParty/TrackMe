import { type Item, type Project } from '../../db'
import { formatDuration } from '../../lib/parser'

interface KanbanCardProps {
  item: Item
  project?: Project
  onClick: () => void
  timeMinutes: number
}

export default function KanbanCard({ item, project, onClick, timeMinutes }: KanbanCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(item.id))
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={onClick}
      className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
          #{item.itemNr}
        </span>
        {project && (
          <span className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
            {project.key}
          </span>
        )}
        {timeMinutes > 0 && (
          <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            {formatDuration(timeMinutes)}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-slate-900 leading-snug">{item.title}</p>
      {item.notes && (
        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{item.notes}</p>
      )}
    </div>
  )
}
