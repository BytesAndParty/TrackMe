import { useRef } from 'react'
import { type TimeEntry, type Project, type SubProject, type Item } from '../../db'
import { useGridState, type GridRowData } from '../../hooks/useGridState'
import { calculateDuration, formatDuration } from '../../lib/parser'
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
}

export default function EditableGrid({ date, entries, projects, subProjects, items, onItemClick }: EditableGridProps) {
  const { rows, updateCell, commitRow, deleteRow, markEditing, unmarkEditing } = useGridState(
    date,
    entries,
    projects,
    subProjects
  )

  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map())

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

  function handleCellKeyDown(e: React.KeyboardEvent, rowIndex: number, colIndex: number) {
    switch (e.key) {
      case 'Tab':
        e.preventDefault()
        if (e.shiftKey) {
          if (colIndex > 0) {
            focusCell(rowIndex, colIndex - 1)
          } else if (rowIndex > 0) {
            focusCell(rowIndex - 1, COLUMN_COUNT - 1)
          }
        } else {
          if (colIndex < COLUMN_COUNT - 1) {
            focusCell(rowIndex, colIndex + 1)
          } else {
            commitRow(rowIndex)
            focusCell(rowIndex + 1, 0)
          }
        }
        break

      case 'Enter':
        e.preventDefault()
        commitRow(rowIndex)
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

      case 'Delete':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          deleteRow(rowIndex)
        }
        break
    }
  }

  function handleRowBlur(rowIndex: number) {
    unmarkEditing(rowIndex)
    // Delay commit to allow focus to move to another cell in the same row
    setTimeout(() => {
      commitRow(rowIndex)
    }, 100)
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

  // Conflict detection: find rows with overlapping time ranges
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
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-700">
            <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-2.5 w-22">Start</th>
            <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-2.5 w-22">Ende</th>
            <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-2.5 w-32">Projekt</th>
            <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-2.5 w-32">Unterprojekt</th>
            <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-2.5 w-24">Item Nr</th>
            <th className="text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-2.5">Kommentar</th>
            <th className="text-right text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-2.5 w-20">Dauer</th>
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
                    ? 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10'
                    : 'border-slate-50 dark:border-slate-800'
                } ${isEmptyNew ? 'opacity-50' : ''}`}
                title={hasConflict ? 'Zeitüberschneidung mit anderem Eintrag' : undefined}
              >
                {/* Start */}
                <td className="grid-cell">
                  <TimeCell
                    value={row.startTime}
                    onChange={(v) => updateCell(rowIndex, 'startTime', v)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 0)}
                    inputRef={(el) => setCellRef(rowIndex, 0, el)}
                    onFocus={() => markEditing(rowIndex)}
                    onBlur={() => handleRowBlur(rowIndex)}
                  />
                </td>

                {/* Ende */}
                <td className="grid-cell">
                  <TimeCell
                    value={row.endTime}
                    onChange={(v) => updateCell(rowIndex, 'endTime', v)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 1)}
                    inputRef={(el) => setCellRef(rowIndex, 1, el)}
                    onFocus={() => markEditing(rowIndex)}
                    onBlur={() => handleRowBlur(rowIndex)}
                  />
                </td>

                {/* Projekt */}
                <td className="grid-cell">
                  <AutocompleteCell
                    value={row.project}
                    suggestions={projectSuggestions}
                    onChange={(v) => {
                      updateCell(rowIndex, 'project', v)
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
                        updateCell(rowIndex, 'subProject', '')
                      }
                    }}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 2)}
                    inputRef={(el) => setCellRef(rowIndex, 2, el)}
                    onFocus={() => markEditing(rowIndex)}
                    onBlur={() => handleRowBlur(rowIndex)}
                  />
                </td>

                {/* Unterprojekt */}
                <td className="grid-cell">
                  <AutocompleteCell
                    value={row.subProject}
                    suggestions={getSubProjectSuggestions(row.project)}
                    onChange={(v) => updateCell(rowIndex, 'subProject', v)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 3)}
                    inputRef={(el) => setCellRef(rowIndex, 3, el)}
                    onFocus={() => markEditing(rowIndex)}
                    onBlur={() => handleRowBlur(rowIndex)}
                  />
                </td>

                {/* Item Nr */}
                <td className="grid-cell">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <AutocompleteCell
                        value={row.itemNr}
                        suggestions={getItemSuggestions(row.project, row.subProject)}
                        onChange={(v) => updateCell(rowIndex, 'itemNr', v)}
                        onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 4)}
                        inputRef={(el) => setCellRef(rowIndex, 4, el)}
                        onFocus={() => markEditing(rowIndex)}
                        onBlur={() => handleRowBlur(rowIndex)}
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
                              title="In Azure DevOps öffnen"
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
                              title="Item öffnen"
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
                    onChange={(v) => updateCell(rowIndex, 'taskText', v)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 5)}
                    inputRef={(el) => setCellRef(rowIndex, 5, el)}
                    onFocus={() => markEditing(rowIndex)}
                    onBlur={() => handleRowBlur(rowIndex)}
                    placeholder="Beschreibung..."
                  />
                </td>

                {/* Duration (read-only) */}
                <td className="px-3 py-2 text-right">
                  <span className={`text-sm tabular-nums ${
                    hasConflict ? 'text-red-500 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {computeDuration(row)}
                  </span>
                </td>

                {/* Delete */}
                <td className="px-1 py-2">
                  {row._id && (
                    <button
                      type="button"
                      onClick={() => deleteRow(rowIndex)}
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
            <td colSpan={6} className="px-2 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Gesamt
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
