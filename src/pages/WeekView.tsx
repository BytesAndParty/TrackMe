import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { getWeekDates, formatDateShort, formatDuration, todayISO } from '../lib/parser'
import { useNavigate } from 'react-router-dom'

export default function WeekView() {
  const [weekOffset, setWeekOffset] = useState(0)
  const navigate = useNavigate()

  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(baseDate)

  const entries = useLiveQuery(
    () =>
      db.timeEntries
        .where('date')
        .between(weekDates[0], weekDates[6], true, true)
        .toArray(),
    [weekDates[0], weekDates[6]]
  ) ?? []

  const projects = useLiveQuery(() => db.projects.toArray()) ?? []
  const subProjects = useLiveQuery(() => db.subProjects.toArray()) ?? []

  // Group entries by project+subproject, then by day
  type RowKey = string
  const rows = new Map<RowKey, { projectId?: number; subProjectId?: number; byDay: Map<string, number> }>()

  for (const entry of entries) {
    const key = `${entry.projectId ?? 'none'}-${entry.subProjectId ?? 'none'}`
    if (!rows.has(key)) {
      rows.set(key, { projectId: entry.projectId, subProjectId: entry.subProjectId, byDay: new Map() })
    }
    const row = rows.get(key)!
    row.byDay.set(entry.date, (row.byDay.get(entry.date) ?? 0) + entry.durationMinutes)
  }

  // Day totals
  const dayTotals = new Map<string, number>()
  for (const date of weekDates) {
    const total = entries
      .filter((e) => e.date === date)
      .reduce((sum, e) => sum + e.durationMinutes, 0)
    dayTotals.set(date, total)
  }
  const weekTotal = Array.from(dayTotals.values()).reduce((a, b) => a + b, 0)

  function getProjectKey(projectId?: number) {
    if (!projectId) return '–'
    return projects.find((p) => p.id === projectId)?.key ?? '?'
  }

  function getSubProjectKey(subProjectId?: number) {
    if (!subProjectId) return ''
    return subProjects.find((s) => s.id === subProjectId)?.key ?? ''
  }

  function navigateToDay(date: string) {
    navigate(`/?date=${date}`)
  }

  const today = todayISO()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Wochenansicht</h1>
            <p className="text-slate-500 text-sm">
              {formatDateShort(weekDates[0])} – {formatDateShort(weekDates[6])} &middot; {formatDuration(weekTotal)} gesamt
            </p>
          </div>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors font-medium"
          >
            Diese Woche
          </button>
        )}
      </div>

      {/* Week Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3 sticky left-0 bg-white min-w-35">
                  Projekt
                </th>
                {weekDates.map((date) => (
                  <th
                    key={date}
                    className={`text-center text-xs font-medium uppercase tracking-wider px-3 py-3 min-w-22.5 cursor-pointer hover:bg-slate-50 transition-colors ${
                      date === today
                        ? 'text-slate-900 bg-blue-50/50'
                        : 'text-slate-400'
                    }`}
                    onClick={() => navigateToDay(date)}
                  >
                    {formatDateShort(date)}
                  </th>
                ))}
                <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider px-3 py-3 min-w-20">
                  Summe
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.size === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <p>Keine Einträge diese Woche.</p>
                  </td>
                </tr>
              ) : (
                Array.from(rows.entries()).map(([key, row]) => {
                  const rowTotal = Array.from(row.byDay.values()).reduce((a, b) => a + b, 0)
                  return (
                    <tr key={key} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 sticky left-0 bg-white">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {getProjectKey(row.projectId)}
                          </span>
                          {row.subProjectId && (
                            <span className="font-mono text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                              {getSubProjectKey(row.subProjectId)}
                            </span>
                          )}
                        </div>
                      </td>
                      {weekDates.map((date) => {
                        const mins = row.byDay.get(date) ?? 0
                        return (
                          <td
                            key={date}
                            className={`text-center px-3 py-3 ${
                              date === today ? 'bg-blue-50/30' : ''
                            }`}
                          >
                            {mins > 0 ? (
                              <span className="text-sm tabular-nums font-medium text-slate-700">
                                {formatDuration(mins)}
                              </span>
                            ) : (
                              <span className="text-slate-200">·</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="text-center px-3 py-3">
                        <span className="text-sm tabular-nums font-bold text-slate-900">
                          {formatDuration(rowTotal)}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50/50">
                <td className="px-4 py-3 text-xs font-medium text-slate-500 sticky left-0 bg-slate-50/50">
                  Tagesgesamt
                </td>
                {weekDates.map((date) => {
                  const total = dayTotals.get(date) ?? 0
                  return (
                    <td
                      key={date}
                      className={`text-center px-3 py-3 ${date === today ? 'bg-blue-50/30' : ''}`}
                    >
                      {total > 0 ? (
                        <span className="text-sm tabular-nums font-bold text-slate-900">
                          {formatDuration(total)}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-sm">–</span>
                      )}
                    </td>
                  )
                })}
                <td className="text-center px-3 py-3">
                  <span className="text-sm tabular-nums font-black text-slate-900">
                    {formatDuration(weekTotal)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
