import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { todayISO, formatDateLong, formatDuration } from '../lib/parser'
import EditableGrid from '../components/grid/EditableGrid'

export default function DayView() {
  const [selectedDate, setSelectedDate] = useState(todayISO())

  const entries =
    useLiveQuery(
      () => db.timeEntries.where('date').equals(selectedDate).sortBy('startTime'),
      [selectedDate]
    ) ?? []

  const projects = useLiveQuery(() => db.projects.toArray()) ?? []
  const subProjects = useLiveQuery(() => db.subProjects.toArray()) ?? []

  const totalMinutes = entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0)

  function navigateDay(offset: number) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + offset)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateDay(-1)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{formatDateLong(selectedDate)}</h1>
            <p className="text-slate-500 text-sm">
              {entries.length} {entries.length === 1 ? 'Eintrag' : 'Einträge'} &middot;{' '}
              {formatDuration(totalMinutes)} gesamt
            </p>
          </div>
          <button
            onClick={() => navigateDay(1)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {selectedDate !== todayISO() && (
          <button
            onClick={() => setSelectedDate(todayISO())}
            className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors font-medium"
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
      />

      {/* Keyboard hint */}
      <div className="flex items-center gap-4 text-[11px] text-slate-400">
        <span><kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px]">Tab</kbd> Nächste Zelle</span>
        <span><kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px]">Enter</kbd> Nächste Zeile</span>
        <span><kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px]">Esc</kbd> Abbrechen</span>
        <span>Zeiteingabe: <code className="text-slate-500">0900</code> <code className="text-slate-500">9:00</code> <code className="text-slate-500">18,5</code></span>
      </div>
    </div>
  )
}
