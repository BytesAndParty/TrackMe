import { useRef } from 'react'
import { type TimeEntry, type Project, type SubProject } from '../../db'
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
}

export default function EditableGrid({ date, entries, projects, subProjects }: EditableGridProps) {
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

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-2 py-2.5 w-22">Start</th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-2 py-2.5 w-22">Ende</th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-2 py-2.5 w-32">Projekt</th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-2 py-2.5 w-32">Unterprojekt</th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-2 py-2.5 w-24">Item Nr</th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-2 py-2.5">Kommentar</th>
            <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-3 py-2.5 w-20">Dauer</th>
            <th className="w-10 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const isEmptyNew = row._isNew && !row._dirty
            return (
              <tr
                key={row._id ?? `new-${rowIndex}`}
                className={`group border-b border-slate-50 transition-colors ${
                  isEmptyNew ? 'opacity-50' : ''
                }`}
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
                  <TextCell
                    value={row.itemNr}
                    onChange={(v) => updateCell(rowIndex, 'itemNr', v)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 4)}
                    inputRef={(el) => setCellRef(rowIndex, 4, el)}
                    onFocus={() => markEditing(rowIndex)}
                    onBlur={() => handleRowBlur(rowIndex)}
                    placeholder="#"
                  />
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
                  <span className="text-sm tabular-nums text-slate-500">
                    {computeDuration(row)}
                  </span>
                </td>

                {/* Delete */}
                <td className="px-1 py-2">
                  {row._id && (
                    <button
                      type="button"
                      onClick={() => deleteRow(rowIndex)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all rounded"
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
          <tr className="border-t border-slate-200 bg-slate-50/50">
            <td colSpan={6} className="px-2 py-2.5 text-xs font-medium text-slate-500">
              Gesamt
            </td>
            <td className="px-3 py-2.5 text-right">
              <span className="text-sm tabular-nums font-bold text-slate-900">
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
