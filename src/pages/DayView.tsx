import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { db } from '../db'
import { todayISO, toLocalISO, formatDateLong, formatDuration } from '../lib/parser'
import EditableGrid from '../components/grid/EditableGrid'

export default function DayView() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const commitAllDirtyRef = useRef<null | (() => Promise<boolean>)>(null)
  const [isNavigatingDate, setIsNavigatingDate] = useState(false)
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

  // Transfer groups: aggregate entries by sub-project (or project if no sub-project)
  const itemTitleByProjectAndNr = new Map<string, string>()
  for (const item of items) {
    itemTitleByProjectAndNr.set(`${item.projectId}-${item.itemNr}`, item.title.trim())
  }

  type TransferGroup = {
    key: string
    label: string
    minutes: number
    itemsText: string
    hoursDecimal: string
  }

  function formatHoursDecimal(minutes: number): string {
    return (minutes / 60).toFixed(2)
  }

  const transferGroupMap = new Map<string, { label: string; entries: typeof entries; minutes: number }>()
  for (const entry of entries) {
    const project = projects.find((p) => p.id === entry.projectId)
    const subProject = subProjects.find((s) => s.id === entry.subProjectId)

    let key = 'no-project'
    let label = t('dayView.noProject')

    if (subProject) {
      key = `sub-${subProject.id}`
      label = `${project?.key ?? '?'} / ${subProject.key}`
    } else if (project) {
      key = `proj-${project.id}`
      label = project.key
    }

    const group = transferGroupMap.get(key)
    if (group) {
      group.entries.push(entry)
      group.minutes += entry.durationMinutes
    } else {
      transferGroupMap.set(key, {
        label,
        entries: [entry],
        minutes: entry.durationMinutes,
      })
    }
  }

  const transferGroups: TransferGroup[] = Array.from(transferGroupMap.entries())
    .map(([key, group]) => {
      const byItem = new Map<string, { label: string; texts: Set<string> }>()
      for (const entry of group.entries) {
        const itemNr = entry.itemNr.trim()
        const itemKey = itemNr || '__none__'
        const itemTitle = entry.projectId
          ? itemTitleByProjectAndNr.get(`${entry.projectId}-${itemNr}`)
          : undefined
        const itemLabel = itemNr
          ? itemTitle
            ? `${itemNr} ${itemTitle}`
            : `${itemNr}`
          : ''

        if (!byItem.has(itemKey)) {
          byItem.set(itemKey, { label: itemLabel, texts: new Set() })
        }

        const taskText = entry.taskText.trim()
        const notes = entry.notes.trim()
        if (taskText) byItem.get(itemKey)!.texts.add(taskText)
        if (notes && notes !== taskText) byItem.get(itemKey)!.texts.add(notes)
      }

      const itemLines = Array.from(byItem.values()).map((item) => {
        const descriptions = Array.from(item.texts)
        if (!item.label && descriptions.length === 0) return ''
        if (!item.label) return descriptions.join(' | ')
        if (descriptions.length === 0) return item.label
        return `${item.label}: ${descriptions.join(' | ')}`
      }).filter(Boolean)

      return {
        key,
        label: group.label,
        minutes: group.minutes,
        itemsText: itemLines.join(', '),
        hoursDecimal: formatHoursDecimal(group.minutes),
      }
    })
    .sort((a, b) => b.minutes - a.minutes)

  useEffect(() => {
    const current = searchParams.get('date')
    if (selectedDate === todayISO()) {
      if (current) setSearchParams({}, { replace: true })
    } else if (current !== selectedDate) {
      setSearchParams({ date: selectedDate }, { replace: true })
    }
  }, [selectedDate])

  const registerCommitAllDirty = useCallback((commitAllDirty: () => Promise<boolean>) => {
    commitAllDirtyRef.current = commitAllDirty
  }, [])

  async function changeDate(nextDate: string) {
    if (nextDate === selectedDate || isNavigatingDate) return

    setIsNavigatingDate(true)
    try {
      const saved = commitAllDirtyRef.current ? await commitAllDirtyRef.current() : true
      if (!saved) return
      setSelectedDate(nextDate)
    } finally {
      setIsNavigatingDate(false)
    }
  }

  async function navigateDay(offset: number) {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + offset)
    await changeDate(toLocalISO(d))
  }

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex items-center justify-between sticky top-14 z-20 bg-slate-50 dark:bg-slate-950 -mx-4 px-4 sm:-mx-6 sm:px-6 -mt-6 pt-6 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => void navigateDay(-1)}
            aria-label={t('dayView.prevDayAria')}
            disabled={isNavigatingDate}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{formatDateLong(selectedDate)}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {t('dayView.entriesCount', { count: entries.length })} &middot;{' '}
              {t('dayView.total', { duration: formatDuration(totalMinutes) })}
            </p>
          </div>
          <button
            onClick={() => void navigateDay(1)}
            aria-label={t('dayView.nextDayAria')}
            disabled={isNavigatingDate}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {selectedDate !== todayISO() && (
          <button
            onClick={() => void changeDate(todayISO())}
            aria-label={t('dayView.today')}
            disabled={isNavigatingDate}
            className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
          >
            {t('dayView.today')}
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
        onCommitAllDirtyReady={registerCommitAllDirty}
        onItemClick={(item) =>
          navigate(`/items/${item.id}`, {
            state: { returnTo: `${location.pathname}${location.search}` },
          })
        }
      />

      {/* Daily Transfer by SubProject */}
      {transferGroups.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('dayView.dailyOverviewTitle')}</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {t('dayView.dailyOverviewSubtitle')}
            </p>
          </div>
          <div className="p-6 space-y-4">
            {transferGroups.map((group) => (
              <div
                key={group.key}
                className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3 bg-slate-50/40 dark:bg-slate-800/20"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                    {group.label}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDuration(group.minutes)}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                      {t('dayView.itemsDescriptionLabel')}
                    </label>
                    <textarea
                      readOnly
                      value={group.itemsText || t('dayView.noItemDescription')}
                      rows={Math.max(3, group.itemsText.split('\n').length)}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 resize-y"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                      {t('dayView.hoursTotalDecimalLabel')}
                    </label>
                    <input
                      readOnly
                      value={group.hoursDecimal}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard hint */}
      <div className="flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
        <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px]">Tab</kbd> {t('dayView.nextCell')}</span>
        <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px]">Enter</kbd> {t('dayView.nextRow')}</span>
        <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px]">Esc</kbd> {t('dayView.cancel')}</span>
        <span>{t('dayView.timeInput')}: <code className="text-slate-500 dark:text-slate-400">0900</code> <code className="text-slate-500 dark:text-slate-400">9:00</code> <code className="text-slate-500 dark:text-slate-400">18,5</code></span>
      </div>
    </div>
  )
}
