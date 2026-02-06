import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { formatDuration, getWeekDates } from '../lib/parser'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1']

export default function Reports() {
  const [weeks] = useState(8)

  const entries = useLiveQuery(() => db.timeEntries.toArray()) ?? []
  const projects = useLiveQuery(() => db.projects.toArray()) ?? []

  // Weekly data for bar chart (last N weeks)
  const weeklyData: { label: string; minutes: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    const dates = getWeekDates(d)
    const mins = entries
      .filter((e) => e.date >= dates[0] && e.date <= dates[6])
      .reduce((sum, e) => sum + e.durationMinutes, 0)
    const label = `KW${getISOWeek(d)}`
    weeklyData.push({ label, minutes: mins })
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-slate-500 mt-1">
          {formatDuration(totalMinutes)} erfasst &middot; {entries.length} Einträge &middot; {projects.length} Projekte
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">Noch keine Daten vorhanden.</p>
          <p className="text-sm mt-1">Erstelle Zeiteinträge um Reports zu sehen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Hours Bar Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-medium text-slate-500 mb-4">Stunden pro Woche</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${Math.round(v / 60)}h`}
                />
                <Tooltip
                  formatter={(value: number | undefined) => [formatDuration(value ?? 0), 'Dauer']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="minutes" fill="#0f172a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Project Distribution Pie Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-medium text-slate-500 mb-4">Projektverteilung</h2>
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
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number | undefined) => [formatDuration(value ?? 0), 'Dauer']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Legend
                  formatter={(value: string) => <span className="text-xs text-slate-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Project Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-medium text-slate-500">Projekt-Übersicht</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Projekt</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Einträge</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Stunden</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Anteil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pieData.map((row, i) => {
                  const projectEntries = entries.filter(
                    (e) => projects.find((p) => p.id === e.projectId)?.key === row.name
                  )
                  const pct = totalMinutes > 0 ? Math.round((row.value / totalMinutes) * 100) : 0
                  return (
                    <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right text-sm tabular-nums text-slate-600">{projectEntries.length}</td>
                      <td className="px-6 py-3 text-right text-sm tabular-nums font-medium">{formatDuration(row.value)}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-slate-500 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
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

function getISOWeek(date: Date): number {
  const d = new Date(date.getTime())
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}
