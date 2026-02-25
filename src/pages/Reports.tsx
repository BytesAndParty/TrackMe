import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, lightenColor } from '../db'
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
    const saved = localStorage.getItem('reportPreset') as RangePreset | null
    if (saved && PRESET_LABELS.some(([k]) => k === saved)) return saved
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

  const isDark = document.documentElement.classList.contains('dark')

  // Adaptive chart data
  const fromDate = new Date(dateFrom + 'T00:00:00')
  const toDate = new Date(dateTo + 'T00:00:00')
  const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000)

  const fallbackColors = isDark ? COLORS_DARK : COLORS

  // Build chart segments: one per sub-project (or project if no sub-projects)
  type ChartSegment = { key: string; label: string; color: string }
  const chartSegments: ChartSegment[] = []
  const projectIds = [...new Set(entries.filter(e => e.projectId).map(e => e.projectId!))]

  projectIds.sort((a, b) => {
    const aMin = entries.filter(e => e.projectId === a).reduce((s, e) => s + e.durationMinutes, 0)
    const bMin = entries.filter(e => e.projectId === b).reduce((s, e) => s + e.durationMinutes, 0)
    return bMin - aMin
  })

  for (const projId of projectIds) {
    const proj = projects.find(p => p.id === projId)
    const baseColor = proj?.color ?? fallbackColors[chartSegments.length % fallbackColors.length]
    const projEntries = entries.filter(e => e.projectId === projId)
    const subIds = [...new Set(projEntries.filter(e => e.subProjectId).map(e => e.subProjectId!))]
    const hasNoSub = projEntries.some(e => !e.subProjectId)

    if (subIds.length === 0) {
      chartSegments.push({ key: `proj-${projId}`, label: proj?.key ?? '?', color: baseColor })
    } else {
      if (hasNoSub) {
        chartSegments.push({ key: `proj-${projId}`, label: proj?.key ?? '?', color: baseColor })
      }
      subIds.sort((a, b) => {
        const aMin = projEntries.filter(e => e.subProjectId === a).reduce((s, e) => s + e.durationMinutes, 0)
        const bMin = projEntries.filter(e => e.subProjectId === b).reduce((s, e) => s + e.durationMinutes, 0)
        return bMin - aMin
      })
      subIds.forEach((subId, i) => {
        const sub = subProjects.find(s => s.id === subId)
        const offset = hasNoSub ? i + 1 : i
        chartSegments.push({
          key: `sub-${subId}`,
          label: `${proj?.key ?? '?'} / ${sub?.key ?? '?'}`,
          color: offset === 0 ? baseColor : lightenColor(baseColor, offset * 0.15),
        })
      })
    }
  }

  if (entries.some(e => !e.projectId)) {
    chartSegments.push({
      key: 'no-project',
      label: 'Ohne Projekt',
      color: fallbackColors[chartSegments.length % fallbackColors.length],
    })
  }

  function matchSegment(e: { projectId?: number; subProjectId?: number }, segKey: string): boolean {
    if (segKey === 'no-project') return !e.projectId
    if (segKey.startsWith('sub-')) return e.subProjectId === Number(segKey.slice(4))
    return e.projectId === Number(segKey.slice(5)) && !e.subProjectId
  }

  let chartData: Record<string, string | number>[]
  let chartTitle: string

  if (diffDays <= 14) {
    chartTitle = 'Stunden pro Tag'
    chartData = []
    const d = new Date(fromDate)
    while (d <= toDate) {
      const iso = toLocalISO(d)
      const dayEntries = entries.filter(e => e.date === iso)
      const point: Record<string, string | number> = { label: formatDateShort(iso) }
      for (const seg of chartSegments) {
        point[seg.key] = dayEntries.filter(e => matchSegment(e, seg.key)).reduce((sum, e) => sum + e.durationMinutes, 0)
      }
      chartData.push(point)
      d.setDate(d.getDate() + 1)
    }
  } else {
    chartTitle = 'Stunden pro Woche'
    chartData = []
    const d = new Date(fromDate)
    const dayOfWeek = d.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    d.setDate(d.getDate() + mondayOffset)

    while (d <= toDate) {
      const weekDates = getWeekDates(d)
      const weekEntries = entries.filter(e => e.date >= weekDates[0] && e.date <= weekDates[6])
      const point: Record<string, string | number> = { label: `KW${getISOWeek(d)}` }
      for (const seg of chartSegments) {
        point[seg.key] = weekEntries.filter(e => matchSegment(e, seg.key)).reduce((sum, e) => sum + e.durationMinutes, 0)
      }
      chartData.push(point)
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
    .map(([id, mins], i) => {
      const proj = projects.find((p) => p.id === id)
      return {
        name: proj?.key ?? '?',
        value: mins,
        color: proj?.color ?? fallbackColors[i % fallbackColors.length],
      }
    })
    .sort((a, b) => b.value - a.value)

  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0)

  function formatHoursDecimal(minutes: number): string {
    return (minutes / 60).toFixed(2).replace('.', ',')
  }

  // Text listing: aggregate by project → sub-project
  type ProjectSummary = {
    projectId: number | null
    projectKey: string
    totalMinutes: number
    subProjects: { subProjectKey: string; minutes: number }[]
  }

  const projectSummaryMap = new Map<number | null, { projectKey: string; minutes: number; subs: Map<number | null, { subKey: string; minutes: number }> }>()
  for (const entry of entries) {
    const projId = entry.projectId ?? null
    const project = projId ? projects.find(p => p.id === projId) : undefined
    const projKey = project?.key ?? 'Ohne Projekt'

    if (!projectSummaryMap.has(projId)) {
      projectSummaryMap.set(projId, { projectKey: projKey, minutes: 0, subs: new Map() })
    }
    const projGroup = projectSummaryMap.get(projId)!
    projGroup.minutes += entry.durationMinutes

    const subId = entry.subProjectId ?? null
    if (subId) {
      const sub = subProjects.find(s => s.id === subId)
      const subKey = sub?.key ?? '?'
      if (!projGroup.subs.has(subId)) {
        projGroup.subs.set(subId, { subKey, minutes: 0 })
      }
      projGroup.subs.get(subId)!.minutes += entry.durationMinutes
    }
  }

  const projectSummaries: ProjectSummary[] = Array.from(projectSummaryMap.entries())
    .map(([projectId, data]) => ({
      projectId,
      projectKey: data.projectKey,
      totalMinutes: data.minutes,
      subProjects: Array.from(data.subs.values())
        .map(s => ({ subProjectKey: s.subKey, minutes: s.minutes }))
        .sort((a, b) => b.minutes - a.minutes),
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes)

  function selectPreset(p: RangePreset) {
    setPreset(p)
    localStorage.setItem('reportPreset', p)
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

  // Tab / Shift+Tab to cycle presets (only when no input is focused)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      const keys = PRESET_LABELS.map(([k]) => k)
      const idx = keys.indexOf(preset)
      if (e.shiftKey) {
        selectPreset(keys[(idx - 1 + keys.length) % keys.length])
      } else {
        selectPreset(keys[(idx + 1) % keys.length])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [preset])

  const chartTextColor = isDark ? '#94a3b8' : undefined
  const tooltipStyle = isDark
    ? { borderRadius: 8, border: '1px solid #334155', fontSize: 12, backgroundColor: '#1e293b', color: '#e2e8f0' }
    : { borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, backgroundColor: '#ffffff', color: '#0f172a' }
  const tooltipLabelStyle = isDark ? { color: '#e2e8f0' } : { color: '#0f172a' }
  const tooltipItemStyle = isDark ? { color: '#cbd5e1' } : { color: '#334155' }

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
            <ResponsiveContainer width="100%" height={chartSegments.length > 3 ? 300 : 260}>
              <BarChart data={chartData}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartTextColor }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: chartTextColor }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${Math.round(v / 60)}h`}
                />
                <Tooltip
                  formatter={(value: number | undefined, name?: string) => {
                    const seg = chartSegments.find(s => s.key === name)
                    return [formatDuration(value ?? 0), seg?.label ?? name ?? '']
                  }}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                />
                {chartSegments.length > 1 && (
                  <Legend
                    formatter={(value: string) => {
                      const seg = chartSegments.find(s => s.key === value)
                      return <span className="text-xs text-slate-600 dark:text-slate-400">{seg?.label ?? value}</span>
                    }}
                  />
                )}
                {chartSegments.map(seg => (
                  <Bar key={seg.key} dataKey={seg.key} name={seg.key} fill={seg.color} stackId="hours" />
                ))}
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
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number | undefined) => [formatDuration(value ?? 0), 'Dauer']}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Legend
                  formatter={(value: string) => <span className="text-xs text-slate-600 dark:text-slate-400">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Project / SubProject Text Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm lg:col-span-2">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Auflistung nach Projekt</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Stunden pro Projekt und Unterprojekt im gewählten Zeitraum.
              </p>
            </div>
            <div className="p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                    <th className="pb-2 font-medium">Projekt / Unterprojekt</th>
                    <th className="pb-2 font-medium text-right">Dauer</th>
                    <th className="pb-2 font-medium text-right">Dezimal</th>
                  </tr>
                </thead>
                <tbody>
                  {projectSummaries.map((proj) => (
                    <>
                      <tr key={`proj-${proj.projectId}`} className="border-b border-slate-100 dark:border-slate-700 font-medium">
                        <td className="py-2 text-slate-800 dark:text-slate-200">{proj.projectKey}</td>
                        <td className="py-2 text-right text-slate-600 dark:text-slate-300 tabular-nums">{formatDuration(proj.totalMinutes)}</td>
                        <td className="py-2 text-right text-slate-600 dark:text-slate-300 font-mono tabular-nums">{formatHoursDecimal(proj.totalMinutes)}</td>
                      </tr>
                      {proj.subProjects.map((sub) => (
                        <tr key={`sub-${proj.projectId}-${sub.subProjectKey}`} className="border-b border-slate-50 dark:border-slate-800">
                          <td className="py-1.5 pl-6 text-slate-500 dark:text-slate-400">{sub.subProjectKey}</td>
                          <td className="py-1.5 text-right text-slate-500 dark:text-slate-400 tabular-nums">{formatDuration(sub.minutes)}</td>
                          <td className="py-1.5 text-right text-slate-500 dark:text-slate-400 font-mono tabular-nums">{formatHoursDecimal(sub.minutes)}</td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 dark:border-slate-700 font-bold">
                    <td className="pt-3 text-slate-800 dark:text-slate-200">Gesamt</td>
                    <td className="pt-3 text-right text-slate-800 dark:text-slate-200 tabular-nums">{formatDuration(totalMinutes)}</td>
                    <td className="pt-3 text-right text-slate-800 dark:text-slate-200 font-mono tabular-nums">{formatHoursDecimal(totalMinutes)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
