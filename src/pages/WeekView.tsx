import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { getWeekDates, formatDateShort, formatDuration, todayISO, toLocalISO } from '../lib/parser'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function WeekView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const dateParam = searchParams.get('date')
  const referenceDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? new Date(dateParam + 'T12:00:00')
    : new Date()

  const weekDates = getWeekDates(referenceDate)

  const todayWeekDates = getWeekDates(new Date())
  const isCurrentWeek = weekDates[0] === todayWeekDates[0]

  function navigateWeek(offset: number) {
    const d = new Date(referenceDate)
    d.setDate(d.getDate() + offset * 7)
    setSearchParams({ date: toLocalISO(d) }, { replace: true })
  }

  function resetToCurrentWeek() {
    setSearchParams({}, { replace: true })
  }

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
            onClick={() => navigateWeek(-1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Wochenansicht</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {formatDateShort(weekDates[0])} – {formatDateShort(weekDates[6])} &middot; {formatDuration(weekTotal)} gesamt
            </p>
          </div>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        {!isCurrentWeek && (
          <button
            onClick={resetToCurrentWeek}
            className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
          >
            Diese Woche
          </button>
        )}
      </div>

      {/* Week Matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-3 sticky left-0 bg-white dark:bg-slate-900 min-w-35">
                  Projekt
                </th>
                {weekDates.map((date) => (
                  <th
                    key={date}
                    className={`text-center text-xs font-medium uppercase tracking-wider px-3 py-3 min-w-22.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      date === today
                        ? 'text-slate-900 dark:text-slate-100 bg-blue-50/50 dark:bg-blue-900/20'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                    onClick={() => navigateToDay(date)}
                  >
                    {formatDateShort(date)}
                  </th>
                ))}
                <th className="text-center text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-3 min-w-20">
                  Summe
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {rows.size === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <p>Keine Einträge diese Woche.</p>
                  </td>
                </tr>
              ) : (
                Array.from(rows.entries()).map(([key, row]) => {
                  const rowTotal = Array.from(row.byDay.values()).reduce((a, b) => a + b, 0)
                  return (
                    <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 sticky left-0 bg-white dark:bg-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                            {getProjectKey(row.projectId)}
                          </span>
                          {row.subProjectId && (
                            <span className="font-mono text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
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
                              date === today ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                            }`}
                          >
                            {mins > 0 ? (
                              <span className="text-sm tabular-nums font-medium text-slate-700 dark:text-slate-300">
                                {formatDuration(mins)}
                              </span>
                            ) : (
                              <span className="text-slate-200 dark:text-slate-700">·</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="text-center px-3 py-3">
                        <span className="text-sm tabular-nums font-bold">
                          {formatDuration(rowTotal)}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <td className="px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-800/50">
                  Tagesgesamt
                </td>
                {weekDates.map((date) => {
                  const total = dayTotals.get(date) ?? 0
                  return (
                    <td
                      key={date}
                      className={`text-center px-3 py-3 ${date === today ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                    >
                      {total > 0 ? (
                        <span className="text-sm tabular-nums font-bold">
                          {formatDuration(total)}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-sm">–</span>
                      )}
                    </td>
                  )
                })}
                <td className="text-center px-3 py-3">
                  <span className="text-sm tabular-nums font-black">
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
