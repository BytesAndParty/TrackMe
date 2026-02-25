import { useEffect, useRef } from 'react'
import { type TimeEntry, type Project, type SubProject, type Item } from '../../db'
import { useGridState, type GridRowData } from '../../hooks/useGridState'
import { calculateDuration, formatDuration } from '../../lib/parser'
import { useTranslation } from 'react-i18next'
import TimeCell from './TimeCell'
import AutocompleteCell from './AutocompleteCell'
import TextCell from './TextCell'

const COLUMN_COUNT = 6

interface EditableGridProps {
  date: string
  entries: TimeEntry[]
  projects: Project[]
  subProjects: SubProject[]
  items: Item[]
  onItemClick?: (item: Item) => void
  onCommitAllDirtyReady?: (commitAllDirty: () => Promise<boolean>) => void
}

export default function EditableGrid({
  date,
  entries,
  projects,
  subProjects,
  items,
  onItemClick,
  onCommitAllDirtyReady,
}: EditableGridProps) {
  const { t } = useTranslation()
  const { rows, updateCell, commitRow, commitAllDirty, deleteRow, markEditing, unmarkEditing, saveStatus } = useGridState(
    date,
    entries,
    projects,
    subProjects
  )

  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  useEffect(() => {
    onCommitAllDirtyReady?.(commitAllDirty)
  }, [onCommitAllDirtyReady, commitAllDirty])

  function setCellRef(row: number, col: number, el: HTMLInputElement | null) {
    const key = `${row}-${col}`
    if (el) cellRefs.current.set(key, el)
    else cellRefs.current.delete(key)
  }

  function focusCell(row: number, col: number) {
    const key = `${row}-${col}`
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

  function handleCellKeyDown(e: React.KeyboardEvent, rowIndex: number, colIndex: number, rowKey: string) {
    switch (e.key) {
      case 'Tab':
        if (e.shiftKey) {
          if (colIndex > 0) {
            e.preventDefault()
            focusCell(rowIndex, colIndex - 1)
          } else if (rowIndex > 0) {
            e.preventDefault()
            focusCell(rowIndex - 1, COLUMN_COUNT - 1)
          }
        } else {
          if (colIndex < COLUMN_COUNT - 1) {
            e.preventDefault()
            focusCell(rowIndex, colIndex + 1)
          } else {
            e.preventDefault()
            void commitRow(rowKey)
            focusCell(rowIndex + 1, 0)
          }
        }
        break

      case 'Enter':
        e.preventDefault()
        void commitRow(rowKey)
        focusCell(rowIndex + 1, colIndex)
        break

      case 'Escape':
        ;(e.target as HTMLInputElement).blur()
        break

      case 'ArrowDown':
        if (!e.altKey) {
          e.preventDefault()
          focusCell(rowIndex + 1, colIndex)
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        if (rowIndex > 0) {
          focusCell(rowIndex - 1, colIndex)
        }
        break

      case 'ArrowLeft': {
        const input = e.currentTarget as HTMLInputElement
        if (input.selectionStart === 0 && input.selectionStart === input.selectionEnd && colIndex > 0) {
          e.preventDefault()
          focusCell(rowIndex, colIndex - 1)
        }
        break
      }

      case 'ArrowRight': {
        const input = e.currentTarget as HTMLInputElement
        if (input.selectionStart === input.value.length && input.selectionStart === input.selectionEnd && colIndex < COLUMN_COUNT - 1) {
          e.preventDefault()
          focusCell(rowIndex, colIndex + 1)
        }
        break
      }

      case 'Delete':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          void deleteRow(rowKey)
        }
        break
    }
  }

  function handleRowBlur(rowKey: string) {
    unmarkEditing(rowKey)
    // Removed immediate commitRow here. 
    // The debounced save in useGridState will handle it.
  }

  function computeDuration(row: GridRowData): string {
    if (!row.startTime || !row.endTime) return '–'
    const mins = calculateDuration(row.startTime, row.endTime)
    if (mins <= 0) return '–'
    return formatDuration(mins)
  }

  const totalMinutes = rows
    .filter((r) => r.startTime && r.endTime)
    .reduce((sum, r) => {
      const d = calculateDuration(r.startTime, r.endTime)
      return sum + (d > 0 ? d : 0)
    }, 0)

  // Non-blocking overlap detection: show hints only, never auto-adjust or block saving
  const conflictRows = new Set<number>()
  const validRows = rows
    .map((r, i) => ({ index: i, start: r.startTime, end: r.endTime }))
    .filter((r) => r.start && r.end && r.start < r.end)

  for (let i = 0; i < validRows.length; i++) {
    for (let j = i + 1; j < validRows.length; j++) {
      const a = validRows[i]
      const b = validRows[j]
      // Overlap: a.start < b.end AND b.start < a.end
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

  function getSubProjectSuggestions(projectKey: string) {
    const project = projects.find((p) => p.key.toLowerCase() === projectKey.toLowerCase())
    if (!project) return []
    return subProjects
      .filter((s) => s.projectId === project.id)
      .map((s) => ({ key: s.key, name: s.name, id: s.id! }))
  }

  function getItemSuggestions(projectKey: string, subProjectKey: string) {
    if (!projectKey) {
      return items.map((item) => ({ key: item.itemNr, name: item.title, id: item.id! }))
    }
    const project = projects.find((p) => p.key.toLowerCase() === projectKey.toLowerCase())
    if (!project) {
      return items.map((item) => ({ key: item.itemNr, name: item.title, id: item.id! }))
    }
    const projectItems = items.filter((item) => item.projectId === project.id)

    if (!subProjectKey) {
      return projectItems.map((item) => ({ key: item.itemNr, name: item.title, id: item.id! }))
    }

    // Find subproject and filter items by entries that match both project + subproject
    const subProject = subProjects.find(
      (s) => s.projectId === project.id && s.key.toLowerCase() === subProjectKey.toLowerCase()
    )
    if (!subProject) {
      return projectItems.map((item) => ({ key: item.itemNr, name: item.title, id: item.id! }))
    }

    // Get itemNrs that have entries with this subproject
    const subProjectItemNrs = new Set(
      entries
        .filter((e) => e.projectId === project.id && e.subProjectId === subProject.id && e.itemNr)
        .map((e) => e.itemNr)
    )

    // Items matching subproject first, then remaining project items
    const matching = projectItems.filter((item) => subProjectItemNrs.has(item.itemNr))
    const rest = projectItems.filter((item) => !subProjectItemNrs.has(item.itemNr))
    return [...matching, ...rest].map((item) => ({ key: item.itemNr, name: item.title, id: item.id! }))
  }

  function findItem(itemNr: string, projectKey: string): Item | undefined {
    if (!itemNr.trim()) return undefined
    const project = projects.find((p) => p.key.toLowerCase() === projectKey.toLowerCase())
    if (project) {
      return items.find((i) => i.projectId === project.id && i.itemNr === itemNr.trim())
    }
    return items.find((i) => i.itemNr === itemNr.trim())
  }

  function buildItemUrl(itemNr: string, projectKey: string): string | null {
    if (!itemNr.trim()) return null
    const project = projects.find((p) => p.key.toLowerCase() === projectKey.toLowerCase())
    if (!project?.linkTemplate) return null
    return project.linkTemplate.replace('{itemNr}', itemNr.trim())
  }

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
            <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-2.5">{t('grid.comment')}</th>
            <th className="text-right text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-2.5 w-20">{t('common.duration')}</th>
            <th className="w-10 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const isEmptyNew = row._isNew && !row._dirty
            const hasConflict = conflictRows.has(rowIndex)
            return (
                <tr
                  key={row._key}
                  className={`group border-b transition-colors ${
                    hasConflict
                      ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/10'
                      : 'border-slate-50 dark:border-slate-800'
                  } ${isEmptyNew ? 'opacity-50' : ''}`}
                  title={hasConflict ? t('grid.overlapTitle') : undefined}
                >
                {/* Start */}
                <td className="grid-cell">
                  <TimeCell
                    value={row.startTime}
                    onChange={(v) => updateCell(row._key, 'startTime', v)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 0, row._key)}
                    inputRef={(el) => setCellRef(rowIndex, 0, el)}
                    onFocus={() => markEditing(row._key)}
                    onBlur={() => handleRowBlur(row._key)}
                  />
                </td>

                {/* Ende */}
                <td className="grid-cell">
                  <TimeCell
                    value={row.endTime}
                    onChange={(v) => updateCell(row._key, 'endTime', v)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 1, row._key)}
                    inputRef={(el) => setCellRef(rowIndex, 1, el)}
                    onFocus={() => markEditing(row._key)}
                    onBlur={() => handleRowBlur(row._key)}
                  />
                </td>

                {/* Projekt */}
                <td className="grid-cell">
                  <AutocompleteCell
                    value={row.project}
                    suggestions={projectSuggestions}
                    onChange={(v) => {
                      updateCell(row._key, 'project', v)
                      // Clear subproject if project changes
                      const currentProject = projects.find(
                        (p) => p.key.toLowerCase() === v.toLowerCase()
                      )
                      const currentSub = subProjects.find(
                        (s) =>
                          s.projectId === currentProject?.id &&
                          s.key.toLowerCase() === row.subProject.toLowerCase()
                      )
                      if (!currentSub && row.subProject) {
                        updateCell(row._key, 'subProject', '')
                      }
                    }}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 2, row._key)}
                    inputRef={(el) => setCellRef(rowIndex, 2, el)}
                    onFocus={() => markEditing(row._key)}
                    onBlur={() => handleRowBlur(row._key)}
                  />
                </td>

                {/* Unterprojekt */}
                <td className="grid-cell">
                  <AutocompleteCell
                    value={row.subProject}
                    suggestions={getSubProjectSuggestions(row.project)}
                    onChange={(v) => updateCell(row._key, 'subProject', v)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 3, row._key)}
                    inputRef={(el) => setCellRef(rowIndex, 3, el)}
                    onFocus={() => markEditing(row._key)}
                    onBlur={() => handleRowBlur(row._key)}
                  />
                </td>

                {/* Item Nr */}
                <td className="grid-cell">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <AutocompleteCell
                        value={row.itemNr}
                        suggestions={getItemSuggestions(row.project, row.subProject)}
                        onChange={(v) => updateCell(row._key, 'itemNr', v)}
                        onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 4, row._key)}
                        inputRef={(el) => setCellRef(rowIndex, 4, el)}
                        onFocus={() => markEditing(row._key)}
                        onBlur={() => handleRowBlur(row._key)}
                      />
                    </div>
                    {(() => {
                      const itemUrl = buildItemUrl(row.itemNr, row.project)
                      const item = findItem(row.itemNr, row.project)
                      return (
                        <>
                          {itemUrl && (
                            <a
                              href={itemUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 transition-all shrink-0"
                              tabIndex={-1}
                              title={t('grid.openInAzure')}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </a>
                          )}
                          {item && onItemClick && !itemUrl && (
                            <button
                              type="button"
                              onClick={() => onItemClick(item)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 dark:text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shrink-0"
                              tabIndex={-1}
                              title={t('grid.openItem')}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </button>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </td>

                {/* Kommentar */}
                <td className="grid-cell">
                  <TextCell
                    value={row.taskText}
                    onChange={(v) => updateCell(row._key, 'taskText', v)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 5, row._key)}
                    inputRef={(el) => setCellRef(rowIndex, 5, el)}
                    onFocus={() => markEditing(row._key)}
                    onBlur={() => handleRowBlur(row._key)}
                    placeholder={t('grid.descriptionPlaceholder')}
                  />
                </td>

                {/* Duration (read-only) */}
                <td className="px-3 py-2 text-right">
                  <span className={`text-sm tabular-nums ${hasConflict ? 'text-amber-700 dark:text-amber-300 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                    {computeDuration(row)}
                  </span>
                  {hasConflict && (
                    <div className="text-[10px] leading-3 mt-0.5 text-amber-700 dark:text-amber-300">
                      {t('grid.hint')}
                    </div>
                  )}
                </td>

                {/* Delete */}
                <td className="px-1 py-2">
                  {row._id && (
                    <button
                      type="button"
                      onClick={() => void deleteRow(row._key)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-all rounded"
                      tabIndex={-1}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <td colSpan={6} className="px-2 py-2.5">
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
    </div>
  )
}
