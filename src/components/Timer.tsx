import { useState, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { todayISO } from '../lib/parser'

export default function Timer() {
  const [running, setRunning] = useState(false)
  const [startTime, setStartTime] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [projectId, setProjectId] = useState<number | undefined>()
  const [taskText, setTaskText] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const projects = useLiveQuery(() => db.projects.where('active').equals(1).toArray()) ?? []

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((e) => e + 1)
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  function formatElapsed(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function nowTime(): string {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }

  function handleStart() {
    setStartTime(nowTime())
    setElapsed(0)
    setRunning(true)
  }

  async function handleStop() {
    setRunning(false)
    if (!startTime) return

    const endTime = nowTime()
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const duration = (eh * 60 + em) - (sh * 60 + sm)

    if (duration > 0) {
      await db.timeEntries.add({
        date: todayISO(),
        startTime,
        endTime,
        durationMinutes: duration,
        projectId,
        taskText,
        notes: '',
      })
    }

    setStartTime(null)
    setElapsed(0)
    setTaskText('')
    setProjectId(undefined)
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all ${
      running
        ? 'bg-emerald-50 border-emerald-200 shadow-sm shadow-emerald-100'
        : 'bg-white border-slate-200'
    }`}>
      <button
        onClick={running ? handleStop : handleStart}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          running
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm'
            : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
        }`}
      >
        {running ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><rect x="1" y="1" width="10" height="10" rx="1"/></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><polygon points="2,0 12,6 2,12"/></svg>
        )}
      </button>

      <span className={`font-mono text-lg tabular-nums tracking-tight ${
        running ? 'text-emerald-700' : 'text-slate-400'
      }`}>
        {formatElapsed(elapsed)}
      </span>

      {running && (
        <>
          <select
            value={projectId ?? ''}
            onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-2 py-1 border border-emerald-200 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Projekt...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.key}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Was machst du?"
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            className="flex-1 px-2 py-1 border border-emerald-200 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-emerald-300"
          />
        </>
      )}

      {!running && (
        <span className="text-xs text-slate-400">Timer starten</span>
      )}
    </div>
  )
}
