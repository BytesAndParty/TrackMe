import { Fragment, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { formatDuration, formatDateShort, getWeekDates, toLocalISO, todayISO, getISOWeek } from '../lib/parser'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1']
const COLORS_DARK = ['#e2e8f0', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#818cf8']

type RangePreset = 'this_week' | 'last_week' | 'pay_period' | 'last_month' | 'last_quarter' | 'this_year' | 'custom'

const PRESET_LABELS: [RangePreset, string][] = [
  ['this_week', 'Diese Woche'],
  ['last_week', 'Letzte Woche'],
  ['pay_period', 'Abrechnungszeitraum'],
  ['last_month', 'Letzter Monat'],
  ['last_quarter', 'Letztes Quartal'],
  ['this_year', 'Dieses Jahr'],
  ['custom', 'Benutzerdefiniert'],
]

function computeRange(preset: RangePreset, customFrom?: string, customTo?: string): { from: string; to: string } {
  const today = new Date()
  const todayStr = todayISO()
  switch (preset) {
    case 'this_week': {
      const weekDates = getWeekDates(today)
      return { from: weekDates[0], to: weekDates[6] }
    }
    case 'last_week': {
      const d = new Date(today)
      d.setDate(d.getDate() - 7)
      const weekDates = getWeekDates(d)
      return { from: weekDates[0], to: weekDates[6] }
    }
    case 'pay_period': {
      const day = today.getDate()
      const y = today.getFullYear()
      const m = today.getMonth()
      if (day <= 15) {
        return {
          from: toLocalISO(new Date(y, m, 1)),
          to: toLocalISO(new Date(y, m, 15)),
        }
      } else {
        const lastDay = new Date(y, m + 1, 0)
        return {
          from: toLocalISO(new Date(y, m, 16)),
          to: toLocalISO(lastDay),
        }
      }
    }
    case 'last_month': {
      const d = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: toLocalISO(d), to: toLocalISO(lastDay) }
    }
    case 'last_quarter': {
      const d = new Date(today)
      d.setMonth(d.getMonth() - 3)
      return { from: toLocalISO(d), to: todayStr }
    }
    case 'this_year': {
      return { from: `${today.getFullYear()}-01-01`, to: todayStr }
    }
    case 'custom': {
      return {
        from: customFrom ?? toLocalISO(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        to: customTo ?? todayStr,
      }
    }
  }
}

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [preset, setPreset] = useState<RangePreset>(() => {
    if (searchParams.get('from') && searchParams.get('to')) return 'custom'
    return 'last_month'
  })

  const urlFrom = searchParams.get('from') ?? undefined
  const urlTo = searchParams.get('to') ?? undefined
  const { from: dateFrom, to: dateTo } = computeRange(preset, urlFrom, urlTo)

  const [customFrom, setCustomFrom] = useState(dateFrom)
  const [customTo, setCustomTo] = useState(dateTo)

  const allEntries = useLiveQuery(() => db.timeEntries.toArray()) ?? []
  const entries = allEntries.filter(e => e.date >= dateFrom && e.date <= dateTo)
  const projects = useLiveQuery(() => db.projects.toArray()) ?? []
  const subProjects = useLiveQuery(() => db.subProjects.toArray()) ?? []
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  const isDark = document.documentElement.classList.contains('dark')
  const colors = isDark ? COLORS_DARK : COLORS

  // Adaptive chart data
  const fromDate = new Date(dateFrom + 'T00:00:00')
  const toDate = new Date(dateTo + 'T00:00:00')
  const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000)

  let chartData: { label: string; minutes: number }[]
  let chartTitle: string

  if (diffDays <= 14) {
    chartTitle = 'Stunden pro Tag'
    chartData = []
    const d = new Date(fromDate)
    while (d <= toDate) {
      const iso = toLocalISO(d)
      const mins = entries
        .filter(e => e.date === iso)
        .reduce((sum, e) => sum + e.durationMinutes, 0)
      chartData.push({ label: formatDateShort(iso), minutes: mins })
      d.setDate(d.getDate() + 1)
    }
  } else {
    chartTitle = 'Stunden pro Woche'
    chartData = []
    const d = new Date(fromDate)
    // Align to Monday
    const dayOfWeek = d.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    d.setDate(d.getDate() + mondayOffset)

    while (d <= toDate) {
      const weekDates = getWeekDates(d)
      const mins = entries
        .filter(e => e.date >= weekDates[0] && e.date <= weekDates[6])
        .reduce((sum, e) => sum + e.durationMinutes, 0)
      chartData.push({ label: `KW${getISOWeek(d)}`, minutes: mins })
      d.setDate(d.getDate() + 7)
    }
  }

  // Project distribution for pie chart
  const projectMinutes = new Map<number, number>()
  for (const e of entries) {
    if (e.projectId) {
      projectMinutes.set(e.projectId, (projectMinutes.get(e.projectId) ?? 0) + e.durationMinutes)
    }
  }
  const pieData = Array.from(projectMinutes.entries())
    .map(([id, mins]) => ({
      name: projects.find((p) => p.id === id)?.key ?? '?',
      value: mins,
    }))
    .sort((a, b) => b.value - a.value)

  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0)

  function selectPreset(p: RangePreset) {
    setPreset(p)
    if (p !== 'custom') {
      const { from, to } = computeRange(p)
      setSearchParams({ from, to }, { replace: true })
      setCustomFrom(from)
      setCustomTo(to)
    }
  }

  function updateCustomRange(from: string, to: string) {
    setCustomFrom(from)
    setCustomTo(to)
    setSearchParams({ from, to }, { replace: true })
  }

  const chartTextColor = isDark ? '#94a3b8' : undefined
  const tooltipStyle = isDark
    ? { borderRadius: 8, border: '1px solid #334155', fontSize: 12, backgroundColor: '#1e293b', color: '#e2e8f0' }
    : { borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {formatDuration(totalMinutes)} erfasst &middot; {entries.length} Einträge &middot;{' '}
          {formatDateShort(dateFrom)} – {formatDateShort(dateTo)}
        </p>
      </div>

      {/* Date Range Selection */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESET_LABELS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => selectPreset(key)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              preset === key
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => updateCustomRange(e.target.value, customTo)}
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-100/10"
            />
            <span className="text-slate-400 text-sm">–</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => updateCustomRange(customFrom, e.target.value)}
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-100/10"
            />
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <p className="text-lg">Keine Daten im gewählten Zeitraum.</p>
          <p className="text-sm mt-1">Wähle einen anderen Zeitraum oder erstelle Zeiteinträge.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">{chartTitle}</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartTextColor }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: chartTextColor }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${Math.round(v / 60)}h`}
                />
                <Tooltip
                  formatter={(value: number | undefined) => [formatDuration(value ?? 0), 'Dauer']}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="minutes" fill={isDark ? '#60a5fa' : '#0f172a'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Project Distribution Pie Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">Projektverteilung</h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number | undefined) => [formatDuration(value ?? 0), 'Dauer']}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  formatter={(value: string) => <span className="text-xs text-slate-600 dark:text-slate-400">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Project Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm lg:col-span-2">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Projekt-Übersicht</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50 dark:border-slate-800">
                  <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-6 py-3">Projekt</th>
                  <th className="text-right text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-6 py-3">Einträge</th>
                  <th className="text-right text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-6 py-3">Stunden</th>
                  <th className="text-right text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-6 py-3">Anteil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {pieData.map((row, i) => {
                  const project = projects.find((p) => p.key === row.name)
                  const projectEntries = entries.filter(
                    (e) => e.projectId === project?.id
                  )
                  const pct = totalMinutes > 0 ? Math.round((row.value / totalMinutes) * 100) : 0
                  const isExpanded = expandedProjects.has(row.name)
                  const projectSubs = subProjects.filter((s) => s.projectId === project?.id)
                  const hasSubData = projectSubs.length > 0

                  // Build sub-project breakdown
                  const subMinutes = new Map<number, number>()
                  let noSubMinutes = 0
                  if (isExpanded) {
                    for (const e of projectEntries) {
                      if (e.subProjectId) {
                        subMinutes.set(e.subProjectId, (subMinutes.get(e.subProjectId) ?? 0) + e.durationMinutes)
                      } else {
                        noSubMinutes += e.durationMinutes
                      }
                    }
                  }

                  return (
                    <Fragment key={row.name}>
                      <tr
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${hasSubData ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (!hasSubData) return
                          setExpandedProjects((prev) => {
                            const next = new Set(prev)
                            if (next.has(row.name)) next.delete(row.name)
                            else next.add(row.name)
                            return next
                          })
                        }}
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            {hasSubData && (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              >
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            )}
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">{projectEntries.length}</td>
                        <td className="px-6 py-3 text-right text-sm tabular-nums font-medium">{formatDuration(row.value)}</td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }}
                              />
                            </div>
                            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400 w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <>
                          {projectSubs
                            .filter((s) => subMinutes.has(s.id!))
                            .sort((a, b) => (subMinutes.get(b.id!) ?? 0) - (subMinutes.get(a.id!) ?? 0))
                            .map((sub) => {
                              const mins = subMinutes.get(sub.id!) ?? 0
                              const subEntries = projectEntries.filter((e) => e.subProjectId === sub.id)
                              const subPct = row.value > 0 ? Math.round((mins / row.value) * 100) : 0
                              return (
                                <tr key={`sub-${sub.id}`} className="bg-slate-50/50 dark:bg-slate-800/30">
                                  <td className="px-6 py-2 pl-14">
                                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{sub.key}</span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">{sub.name}</span>
                                  </td>
                                  <td className="px-6 py-2 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">{subEntries.length}</td>
                                  <td className="px-6 py-2 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">{formatDuration(mins)}</td>
                                  <td className="px-6 py-2 text-right">
                                    <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">{subPct}%</span>
                                  </td>
                                </tr>
                              )
                            })}
                          {noSubMinutes > 0 && (
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                              <td className="px-6 py-2 pl-14">
                                <span className="text-xs text-slate-400 dark:text-slate-500 italic">Ohne Unterprojekt</span>
                              </td>
                              <td className="px-6 py-2 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
                                {projectEntries.filter((e) => !e.subProjectId).length}
                              </td>
                              <td className="px-6 py-2 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">{formatDuration(noSubMinutes)}</td>
                              <td className="px-6 py-2 text-right">
                                <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
                                  {row.value > 0 ? Math.round((noSubMinutes / row.value) * 100) : 0}%
                                </span>
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
