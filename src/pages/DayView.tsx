import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { todayISO, toLocalISO, formatDateLong, formatDuration } from '../lib/parser'
import EditableGrid from '../components/grid/EditableGrid'

export default function DayView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedDate, setSelectedDate] = useState(() => {
    const dateParam = searchParams.get('date')
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return dateParam
    return todayISO()
  })

  const entries =
    useLiveQuery(
      () => db.timeEntries.where('date').equals(selectedDate).sortBy('startTime'),
      [selectedDate]
    ) ?? []

  const projects = useLiveQuery(() => db.projects.toArray()) ?? []
  const subProjects = useLiveQuery(() => db.subProjects.toArray()) ?? []
  const items = useLiveQuery(() => db.items.toArray()) ?? []

  const totalMinutes = entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0)

  useEffect(() => {
    const current = searchParams.get('date')
    if (selectedDate === todayISO()) {
      if (current) setSearchParams({}, { replace: true })
    } else if (current !== selectedDate) {
      setSearchParams({ date: selectedDate }, { replace: true })
    }
  }, [selectedDate])

  function navigateDay(offset: number) {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + offset)
    setSelectedDate(toLocalISO(d))
  }

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateDay(-1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{formatDateLong(selectedDate)}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {entries.length} {entries.length === 1 ? 'Eintrag' : 'Einträge'} &middot;{' '}
              {formatDuration(totalMinutes)} gesamt
            </p>
          </div>
          <button
            onClick={() => navigateDay(1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {selectedDate !== todayISO() && (
          <button
            onClick={() => setSelectedDate(todayISO())}
            className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
          >
            Heute
          </button>
        )}
      </div>

      {/* Editable Grid */}
      <EditableGrid
        date={selectedDate}
        entries={entries}
        projects={projects}
        subProjects={subProjects}
        items={items}
        onItemClick={(item) =>
          navigate(`/items/${item.id}`, {
            state: { returnTo: `${location.pathname}${location.search}` },
          })
        }
      />

      {/* Keyboard hint */}
      <div className="flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
        <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px]">Tab</kbd> Nächste Zelle</span>
        <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px]">Enter</kbd> Nächste Zeile</span>
        <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px]">Esc</kbd> Abbrechen</span>
        <span>Zeiteingabe: <code className="text-slate-500 dark:text-slate-400">0900</code> <code className="text-slate-500 dark:text-slate-400">9:00</code> <code className="text-slate-500 dark:text-slate-400">18,5</code></span>
      </div>
    </div>
  )
}
