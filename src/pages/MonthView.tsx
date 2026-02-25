import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { db } from '../db'
import { formatDuration, toLocalISO, getISOWeek, getMondayOfWeek } from '../lib/parser'

interface WeekRow {
  weekNumber: number
  mondayDate: string
  days: (string | null)[]
}

function getDayLabels(locale: string): string[] {
  const monday = new Date(Date.UTC(2024, 0, 1))
  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
      new Date(monday.getTime() + index * 86400000)
    )
  )
}

function getMonthWeeks(year: number, month: number): WeekRow[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const allDays: (string | null)[] = []
  for (let i = 0; i < startOffset; i++) allDays.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    allDays.push(iso)
  }
  while (allDays.length % 7 !== 0) allDays.push(null)

  const weeks: WeekRow[] = []
  for (let i = 0; i < allDays.length; i += 7) {
    const days = allDays.slice(i, i + 7)
    const anyDay = days.find(d => d !== null)!
    const dt = new Date(anyDay + 'T12:00:00')
    const mondayDt = getMondayOfWeek(dt)
    weeks.push({
      weekNumber: getISOWeek(dt),
      mondayDate: toLocalISO(mondayDt),
      days,
    })
  }
  return weeks
}

export default function MonthView() {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'de-DE'
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(year, month, 1))
  const dayLabels = getDayLabels(locale)

  const firstISO = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`

  const entries = useLiveQuery(
    () => db.timeEntries.where('date').between(firstISO, lastISO, true, true).toArray(),
    [firstISO, lastISO]
  ) ?? []

  const dayMinutes = new Map<string, number>()
  for (const e of entries) {
    dayMinutes.set(e.date, (dayMinutes.get(e.date) ?? 0) + e.durationMinutes)
  }

  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0)
  const daysWorked = dayMinutes.size
  const avgPerDay = daysWorked > 0 ? Math.round(totalMinutes / daysWorked) : 0

  const weeks = getMonthWeeks(year, month)
  const todayStr = toLocalISO(now)

  function navigateMonth(offset: number) {
    let m = month + offset
    let y = year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setMonth(m)
    setYear(y)
  }

  function maxMinutes() {
    return Math.max(...Array.from(dayMinutes.values()), 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{monthLabel}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {t('monthView.summary', {
                total: formatDuration(totalMinutes),
                days: daysWorked,
                avg: formatDuration(avgPerDay),
              })}
            </p>
          </div>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        {(year !== now.getFullYear() || month !== now.getMonth()) && (
          <button
            onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }}
            className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
          >
            {t('monthView.currentMonth')}
          </button>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div className="grid grid-cols-8 gap-1">
          {/* Header row */}
          <div className="text-center text-xs font-medium text-slate-300 dark:text-slate-600 uppercase tracking-wider py-2">
            {t('monthView.weekHeader')}
          </div>
          {dayLabels.map((label) => (
            <div key={label} className="text-center text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider py-2">
              {label}
            </div>
          ))}

          {/* Week rows */}
          {weeks.map((week) => (
            <div key={`week-${week.weekNumber}-${week.mondayDate}`} className="contents">
              {/* Week number cell */}
              <div
                onClick={() => nav(`/week?date=${week.mondayDate}`)}
                className="flex items-center justify-center aspect-square rounded-lg text-xs font-medium text-slate-300 dark:text-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
              >
                {week.weekNumber}
              </div>
              {/* Day cells */}
              {week.days.map((date, i) => {
                if (!date) return <div key={`empty-${week.weekNumber}-${i}`} />

                const mins = dayMinutes.get(date) ?? 0
                const intensity = mins > 0 ? Math.max(0.15, mins / maxMinutes()) : 0
                const isToday = date === todayStr
                const dayNum = new Date(date + 'T00:00:00').getDate()

                return (
                  <div
                    key={date}
                    onClick={() => nav(`/?date=${date}`)}
                    className={`relative aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer hover:ring-2 hover:ring-blue-300 dark:hover:ring-blue-500 ${
                      isToday
                        ? 'ring-2 ring-slate-900 dark:ring-slate-100 ring-offset-1 dark:ring-offset-slate-900'
                        : ''
                    }`}
                    style={mins > 0 ? {
                      backgroundColor: `rgba(16, 185, 129, ${intensity})`,
                    } : undefined}
                  >
                    <span className={`text-xs font-medium ${
                      isToday ? 'text-slate-900 dark:text-slate-100' : mins > 0 ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {dayNum}
                    </span>
                    {mins > 0 && (
                      <span className="text-[10px] font-medium text-emerald-800 dark:text-emerald-200">
                        {formatDuration(mins)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
