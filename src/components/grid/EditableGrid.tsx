import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { type TimeEntry, type Project, type SubProject, type Item } from '../../db'
import { useGridState, type GridRowData } from '../../hooks/useGridState'
import { calculateDuration, formatDuration } from '../../lib/parser'
import { useTranslation } from 'react-i18next'
import { GridProvider, type GridContextValue } from './GridContext'
import { GridRow } from './GridRow'

const COLUMN_COUNT = 7

interface EditableGridProps {
  date: string
  entries: TimeEntry[]
  projects: Project[]
  subProjects: SubProject[]
  items: Item[]
  onItemClick?: (item: Item) => void
  onCommitAllDirtyReady?: (commitAllDirty: () => Promise<boolean>) => void
  onRowsChange?: (rows: GridRowData[]) => void
}

export default function EditableGrid({
  date,
  entries,
  projects,
  subProjects,
  items,
  onItemClick,
  onCommitAllDirtyReady,
  onRowsChange,
}: EditableGridProps) {
  const { t } = useTranslation()
  const { rows, updateCell, commitRow, commitAllDirty, deleteRow, undoDelete, markEditing, unmarkEditing, saveStatus } = useGridState(
    date,
    entries,
    projects,
    subProjects,
    items
  )

  useEffect(() => {
    onRowsChange?.(rows)
  }, [rows, onRowsChange])

  const [showUndoToast, setShowUndoToast] = useState(false)
  const undoToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleDeleteRow(rowKey: string) {
    deleteRow(rowKey)
    // Show undo toast
    if (undoToastTimerRef.current) clearTimeout(undoToastTimerRef.current)
    setShowUndoToast(true)
    undoToastTimerRef.current = setTimeout(() => setShowUndoToast(false), 5000)
  }

  function handleUndo() {
    if (undoDelete()) {
      setShowUndoToast(false)
      if (undoToastTimerRef.current) clearTimeout(undoToastTimerRef.current)
    }
  }

  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const activeCellKey = useRef<string | null>(null)

  useEffect(() => {
    onCommitAllDirtyReady?.(commitAllDirty)
  }, [onCommitAllDirtyReady, commitAllDirty])

  function setCellRef(rowKey: string, col: number, el: HTMLInputElement | null) {
    const key = `${rowKey}-${col}`
    if (el) cellRefs.current.set(key, el)
    else cellRefs.current.delete(key)
  }

  function focusCell(rowKey: string, col: number) {
    const key = `${rowKey}-${col}`
    activeCellKey.current = key
    const el = cellRefs.current.get(key)
    if (el) {
      el.focus()
      el.select()
    } else {
      requestAnimationFrame(() => {
        const el = cellRefs.current.get(key)
        if (el) {
          el.focus()
          el.select()
        }
      })
    }
  }

  function focusCellAt(rowIndex: number, col: number) {
    const row = rows[rowIndex]
    if (row) focusCell(row._key, col)
  }

  // Event delegation: single keyboard handler on tbody
  function handleGridKeyDown(e: React.KeyboardEvent) {
    const td = (e.target as HTMLElement).closest('td[data-row-key]')
    if (!td) return
    const rowKey = (td as HTMLElement).dataset.rowKey!
    const col = Number((td as HTMLElement).dataset.col)
    const rowIndex = rows.findIndex(r => r._key === rowKey)
    if (rowIndex < 0) return

    switch (e.key) {
      case 'Tab':
        if (e.shiftKey) {
          if (col > 0) { e.preventDefault(); focusCell(rowKey, col - 1) }
          else if (rowIndex > 0) { e.preventDefault(); focusCellAt(rowIndex - 1, COLUMN_COUNT - 1) }
        } else {
          if (col < COLUMN_COUNT - 1) { e.preventDefault(); focusCell(rowKey, col + 1) }
          else { e.preventDefault(); void commitRow(rowKey); focusCellAt(rowIndex + 1, 0) }
        }
        break

      case 'Enter':
        e.preventDefault()
        void commitRow(rowKey)
        focusCellAt(rowIndex + 1, 0)
        break

      case 'Escape':
        (e.target as HTMLInputElement).blur()
        break

      case 'ArrowDown':
        if (!e.altKey) { e.preventDefault(); focusCellAt(rowIndex + 1, col) }
        break

      case 'ArrowUp':
        e.preventDefault()
        if (rowIndex > 0) focusCellAt(rowIndex - 1, col)
        break

      case 'ArrowLeft': {
        const input = e.target as HTMLInputElement
        if (input.selectionStart === 0 && input.selectionStart === input.selectionEnd && col > 0) {
          e.preventDefault()
          focusCell(rowKey, col - 1)
        }
        break
      }

      case 'ArrowRight': {
        const input = e.target as HTMLInputElement
        if (input.selectionStart === input.value.length && input.selectionStart === input.selectionEnd && col < COLUMN_COUNT - 1) {
          e.preventDefault()
          focusCell(rowKey, col + 1)
        }
        break
      }

      case 'Delete':
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); handleDeleteRow(rowKey) }
        break
    }
  }

  const gridContext: GridContextValue = useMemo(() => ({
    registerCellRef: setCellRef,
    focusCell,
    updateCell,
    markEditing,
    unmarkEditing,
  }), [updateCell, markEditing, unmarkEditing])

  const totalMinutes = rows
    .filter((r) => r.startTime && r.endTime)
    .reduce((sum, r) => {
      const d = calculateDuration(r.startTime, r.endTime)
      return sum + (d > 0 ? d : 0)
    }, 0)

  // Non-blocking overlap detection
  const conflictRows = new Set<number>()
  const validRows = rows
    .map((r, i) => ({ index: i, start: r.startTime, end: r.endTime }))
    .filter((r) => r.start && r.end && r.start < r.end)

  for (let i = 0; i < validRows.length; i++) {
    for (let j = i + 1; j < validRows.length; j++) {
      const a = validRows[i]
      const b = validRows[j]
      if (a.start < b.end && b.start < a.end) {
        conflictRows.add(a.index)
        conflictRows.add(b.index)
      }
    }
  }
  const overlapHintCount = conflictRows.size

  const projectSuggestions = projects
    .filter((p) => p.active)
    .map((p) => ({ key: p.key, name: p.name, id: p.id! }))

  const getSubProjectSuggestions = useCallback((projectKey: string) => {
    const project = projects.find((p) => p.key.toLowerCase() === projectKey.toLowerCase())
    if (!project) return []
    return subProjects
      .filter((s) => s.projectId === project.id)
      .map((s) => ({ key: s.key, name: s.name, id: s.id! }))
  }, [projects, subProjects])

  const getItemSuggestions = useCallback((projectKey: string, subProjectKey: string) => {
    if (!projectKey) {
      return items
        .filter((i) => i.status !== 'done')
        .map((item) => ({ key: item.itemNr, name: item.title, id: item.id! }))
    }
    const project = projects.find((p) => p.key.toLowerCase() === projectKey.toLowerCase())
    if (!project) {
      return items
        .filter((i) => i.status !== 'done')
        .map((item) => ({ key: item.itemNr, name: item.title, id: item.id! }))
    }
    const projectItems = items.filter((item) => item.projectId === project.id && item.status !== 'done')

    if (!subProjectKey) {
      return projectItems.map((item) => ({ key: item.itemNr, name: item.title, id: item.id! }))
    }

    const subProject = subProjects.find(
      (s) => s.projectId === project.id && s.key.toLowerCase() === subProjectKey.toLowerCase()
    )
    if (!subProject) {
      return projectItems.map((item) => ({ key: item.itemNr, name: item.title, id: item.id! }))
    }

    const subProjectItemNrs = new Set(
      entries
        .filter((e) => e.projectId === project.id && e.subProjectId === subProject.id && e.itemNr)
        .map((e) => e.itemNr)
    )

    const matching = projectItems.filter((item) => subProjectItemNrs.has(item.itemNr))
    const rest = projectItems.filter((item) => !subProjectItemNrs.has(item.itemNr))
    return [...matching, ...rest].map((item) => ({ key: item.itemNr, name: item.title, id: item.id! }))
  }, [items, projects, subProjects, entries])

  const getItemTitleSuggestions = useCallback((projectKey: string, subProjectKey: string) => {
    if (!projectKey) {
      return items
        .filter((i) => i.status !== 'done')
        .map((item) => ({ key: item.title, name: item.itemNr, id: item.id! }))
    }
    const project = projects.find((p) => p.key.toLowerCase() === projectKey.toLowerCase())
    if (!project) {
      return items
        .filter((i) => i.status !== 'done')
        .map((item) => ({ key: item.title, name: item.itemNr, id: item.id! }))
    }
    const projectItems = items.filter((item) => item.projectId === project.id && item.status !== 'done')

    if (!subProjectKey) {
      return projectItems.map((item) => ({ key: item.title, name: item.itemNr, id: item.id! }))
    }

    const subProject = subProjects.find(
      (s) => s.projectId === project.id && s.key.toLowerCase() === subProjectKey.toLowerCase()
    )
    if (!subProject) {
      return projectItems.map((item) => ({ key: item.title, name: item.itemNr, id: item.id! }))
    }

    const subProjectItemIds = new Set(
      entries
        .filter((e) => e.projectId === project.id && e.subProjectId === subProject.id && e.itemNr)
        .map((e) => {
          const item = items.find(i => i.projectId === project.id && i.itemNr === e.itemNr)
          return item?.id
        })
        .filter(Boolean)
    )

    const matching = projectItems.filter((item) => subProjectItemIds.has(item.id))
    const rest = projectItems.filter((item) => !subProjectItemIds.has(item.id))
    return [...matching, ...rest].map((item) => ({ key: item.title, name: item.itemNr, id: item.id! }))
  }, [items, projects, subProjects, entries])

  const findItem = useCallback((itemNr: string, projectKey: string): Item | undefined => {
    if (!itemNr.trim()) return undefined
    const project = projects.find((p) => p.key.toLowerCase() === projectKey.toLowerCase())
    if (project) {
      return items.find((i) => i.projectId === project.id && i.itemNr === itemNr.trim())
    }
    return items.find((i) => i.itemNr === itemNr.trim())
  }, [items, projects])

  const buildItemUrl = useCallback((itemNr: string, projectKey: string): string | null => {
    if (!itemNr.trim()) return null
    const project = projects.find((p) => p.key.toLowerCase() === projectKey.toLowerCase())
    if (!project?.linkTemplate) return null
    return project.linkTemplate.replace('{itemNr}', itemNr.trim())
  }, [projects])

  const handleProjectChange = useCallback((rowKey: string, value: string, currentSubProject: string) => {
    updateCell(rowKey, 'project', value)
    const currentProject = projects.find(
      (p) => p.key.toLowerCase() === value.toLowerCase()
    )
    const currentSub = subProjects.find(
      (s) =>
        s.projectId === currentProject?.id &&
        s.key.toLowerCase() === currentSubProject.toLowerCase()
    )
    if (!currentSub && currentSubProject) {
      updateCell(rowKey, 'subProject', '')
    }
  }, [updateCell, projects, subProjects])

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-clip overflow-y-visible">
      {overlapHintCount > 0 && (
        <div className="px-2 py-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/40">
          {t('grid.overlapHint', { count: overlapHintCount })} {t('grid.overlapExtra')}
        </div>
      )}
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-700">
            <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-2.5 w-22">{t('grid.start')}</th>
            <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-2.5 w-22">{t('grid.end')}</th>
            <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-2.5 w-32">{t('grid.project')}</th>
            <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-2.5 w-32">{t('grid.subProject')}</th>
            <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-2.5 w-24">{t('grid.itemNr')}</th>
            <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-2.5 w-48">{t('grid.itemTitle')}</th>
            <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-2.5">{t('grid.comment')}</th>
            <th className="text-right text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-2.5 w-20">{t('common.duration')}</th>
            <th className="w-10 py-2.5"></th>
          </tr>
        </thead>
        <GridProvider value={gridContext}>
          <tbody onKeyDown={handleGridKeyDown}>
            {rows.map((row, i) => (
              <GridRow
                key={row._key}
                row={row}
                hasConflict={conflictRows.has(i)}
                projectSuggestions={projectSuggestions}
                getSubProjectSuggestions={getSubProjectSuggestions}
                getItemSuggestions={getItemSuggestions}
                getItemTitleSuggestions={getItemTitleSuggestions}
                buildItemUrl={buildItemUrl}
                findItem={findItem}
                onItemClick={onItemClick}
                onDeleteRow={handleDeleteRow}
                onProjectChange={handleProjectChange}
              />
            ))}
          </tbody>
        </GridProvider>
        <tfoot>
          <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <td colSpan={7} className="px-2 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('common.total')}</span>

                {/* Save Status Indicator */}
                <div className="flex items-center gap-2 mr-4">
                  {saveStatus === 'saving' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                      <div className="w-1.5 h-1.5 border border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
                      {t('grid.saving')}
                    </div>
                  )}
                  {saveStatus === 'saved' && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {t('grid.saved')}
                    </div>
                  )}
                  {saveStatus === 'error' && (
                    <div className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 font-medium">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {t('grid.saveError')}
                    </div>
                  )}
                </div>
              </div>
            </td>
            <td className="px-3 py-2.5 text-right">
              <span className="text-sm tabular-nums font-bold">
                {totalMinutes > 0 ? formatDuration(totalMinutes) : '–'}
              </span>
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      {/* Undo delete toast */}
      {showUndoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-800 dark:bg-slate-700 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg animate-[fadeIn_150ms_ease-out]">
          <span>{t('dayView.rowDeleted')}</span>
          <button
            type="button"
            onClick={handleUndo}
            className="font-semibold text-blue-300 hover:text-blue-200 transition-colors"
          >
            {t('dayView.undoDelete')}
          </button>
        </div>
      )}
    </div>
  )
}
