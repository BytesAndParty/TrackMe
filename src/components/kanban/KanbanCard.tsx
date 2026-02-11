import { type Item, type Project } from '../../db'
import { formatDuration } from '../../lib/parser'

interface KanbanCardProps {
  item: Item
  project?: Project
  onClick: () => void
  timeMinutes: number
}

export default function KanbanCard({ item, project, onClick, timeMinutes }: KanbanCardProps) {
  const estimatedMinutes = item.estimatedMinutes ?? 0
  const hasEstimate = estimatedMinutes > 0
  const remainingMinutes = estimatedMinutes - timeMinutes

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(item.id))
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={onClick}
      className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
          #{item.itemNr}
        </span>
        {project && (
          <span className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">
            {project.key}
          </span>
        )}
        {timeMinutes > 0 && (
          <span className="ml-auto flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            {formatDuration(timeMinutes)}
          </span>
        )}
      </div>
      <p className="text-sm font-medium leading-snug">{item.title}</p>
      {hasEstimate && (
        <p className={`text-[11px] mt-1 ${remainingMinutes >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {remainingMinutes >= 0
            ? `${formatDuration(remainingMinutes)} übrig`
            : `${formatDuration(Math.abs(remainingMinutes))} drüber`}
          {' · '}
          geplant {formatDuration(estimatedMinutes)}
        </p>
      )}
      {item.notes && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 line-clamp-2">{item.notes}</p>
      )}
    </div>
  )
}
