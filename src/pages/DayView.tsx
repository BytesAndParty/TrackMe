import { useState, useRef, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type TimeEntry } from '../db'
import {
  parseQuickEntry,
  calculateDuration,
  formatDuration,
  todayISO,
  formatDateLong,
} from '../lib/parser'

export default function DayView() {
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState<Partial<TimeEntry>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  const entries = useLiveQuery(
    () => db.timeEntries.where('date').equals(selectedDate).sortBy('startTime'),
    [selectedDate]
  ) ?? []

  const projects = useLiveQuery(() => db.projects.toArray()) ?? []
  const subProjects = useLiveQuery(() => db.subProjects.toArray()) ?? []

  const totalMinutes = entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [selectedDate])

  function getProjectName(projectId?: number) {
    if (!projectId) return ''
    return projects.find((p) => p.id === projectId)?.key ?? ''
  }

  function getSubProjectName(subProjectId?: number) {
    if (!subProjectId) return ''
    return subProjects.find((s) => s.id === subProjectId)?.key ?? ''
  }

  async function handleQuickEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return

    const parsed = parseQuickEntry(input)
    if (!parsed.startTime || !parsed.endTime) return

    const duration = calculateDuration(parsed.startTime, parsed.endTime)
    if (duration <= 0) return

    const project = parsed.projectKey
      ? projects.find((p) => p.key === parsed.projectKey)
      : undefined

    const subProject = parsed.subProjectKey && project
      ? subProjects.find((s) => s.projectId === project.id && s.key === parsed.subProjectKey)
      : undefined

    await db.timeEntries.add({
      date: selectedDate,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      durationMinutes: duration,
      projectId: project?.id,
      subProjectId: subProject?.id,
      taskText: parsed.taskText,
      notes: '',
    })

    setInput('')
    inputRef.current?.focus()
  }

  function startEdit(entry: TimeEntry) {
    setEditingId(entry.id!)
    setEditData({ ...entry })
  }

  async function saveEdit() {
    if (!editingId || !editData.startTime || !editData.endTime) return
    const duration = calculateDuration(editData.startTime, editData.endTime)
    await db.timeEntries.update(editingId, {
      ...editData,
      durationMinutes: duration,
    })
    setEditingId(null)
    setEditData({})
  }

  async function deleteEntry(id: number) {
    await db.timeEntries.delete(id)
  }

  function navigateDay(offset: number) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + offset)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateDay(-1)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{formatDateLong(selectedDate)}</h1>
            <p className="text-slate-500 text-sm">
              {entries.length} {entries.length === 1 ? 'Eintrag' : 'Einträge'} &middot; {formatDuration(totalMinutes)} gesamt
            </p>
          </div>
          <button
            onClick={() => navigateDay(1)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        {selectedDate !== todayISO() && (
          <button
            onClick={() => setSelectedDate(todayISO())}
            className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors font-medium"
          >
            Heute
          </button>
        )}
      </div>

      {/* Quick Entry */}
      <form onSubmit={handleQuickEntry} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='09:00 11:30 urb retro "Daily Meeting"'
          className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-mono placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent shadow-sm transition-shadow hover:shadow-md"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <kbd className="hidden sm:inline text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
            Enter
          </kbd>
        </div>
      </form>

      {/* Time Entries Table */}
      {entries.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Zeit</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Dauer</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Projekt</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Unterprojekt</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Beschreibung</th>
                <th className="w-20 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {entries.map((entry) =>
                editingId === entry.id ? (
                  <tr key={entry.id} className="bg-slate-50/50">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          value={editData.startTime ?? ''}
                          onChange={(e) => setEditData({ ...editData, startTime: e.target.value })}
                          className="w-16 px-1.5 py-1 border border-slate-200 rounded text-xs font-mono"
                        />
                        <span className="text-slate-300">–</span>
                        <input
                          value={editData.endTime ?? ''}
                          onChange={(e) => setEditData({ ...editData, endTime: e.target.value })}
                          className="w-16 px-1.5 py-1 border border-slate-200 rounded text-xs font-mono"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-400">
                      {editData.startTime && editData.endTime
                        ? formatDuration(calculateDuration(editData.startTime, editData.endTime))
                        : '–'}
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editData.projectId ?? ''}
                        onChange={(e) => setEditData({ ...editData, projectId: e.target.value ? Number(e.target.value) : undefined })}
                        className="px-1.5 py-1 border border-slate-200 rounded text-xs"
                      >
                        <option value="">–</option>
                        {projects.filter((p) => p.active).map((p) => (
                          <option key={p.id} value={p.id}>{p.key}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editData.subProjectId ?? ''}
                        onChange={(e) => setEditData({ ...editData, subProjectId: e.target.value ? Number(e.target.value) : undefined })}
                        className="px-1.5 py-1 border border-slate-200 rounded text-xs"
                      >
                        <option value="">–</option>
                        {subProjects
                          .filter((s) => s.projectId === editData.projectId)
                          .map((s) => (
                            <option key={s.id} value={s.id}>{s.key}</option>
                          ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editData.taskText ?? ''}
                        onChange={(e) => setEditData({ ...editData, taskText: e.target.value })}
                        className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={saveEdit}
                          className="text-[10px] px-2 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-[10px] px-2 py-1 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          Esc
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={entry.id}
                    className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onDoubleClick={() => startEdit(entry)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">
                        {entry.startTime}
                        <span className="text-slate-300 mx-1">–</span>
                        {entry.endTime}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600 tabular-nums">
                        {formatDuration(entry.durationMinutes)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.projectId ? (
                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {getProjectName(entry.projectId)}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {entry.subProjectId ? (
                        <span className="font-mono text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                          {getSubProjectName(entry.subProjectId)}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700">{entry.taskText || <span className="text-slate-300">–</span>}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(entry)}
                          className="text-[10px] px-2 py-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteEntry(entry.id!)}
                          className="text-[10px] px-2 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50/50">
                <td className="px-4 py-3 text-xs font-medium text-slate-500">Gesamt</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-900 tabular-nums">
                  {formatDuration(totalMinutes)}
                </td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-20">
            <svg className="mx-auto" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <p className="text-slate-400">Noch keine Einträge für diesen Tag.</p>
          <p className="text-slate-300 text-sm mt-1">Nutze die Schnellzeile oben um loszulegen.</p>
        </div>
      )}
    </div>
  )
}
