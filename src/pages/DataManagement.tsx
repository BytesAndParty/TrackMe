import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as XLSX from 'xlsx'
import { useTranslation } from 'react-i18next'
import { db } from '../db'
import { createBackup, createTimeEntryTransferRows, createTimeEntryWorkbook, parseBackup, readTimeEntryFile, type TimeEntryImportResult, type TrackMeBackup } from '../lib/dataTransfer'
import { calculateDuration } from '../lib/parser'

function download(content: BlobPart, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function fileDate() {
  return new Date().toISOString().slice(0, 10)
}

function entryKey(entry: { date: string; startTime: string; endTime: string; projectId?: number; subProjectId?: number; itemNr: string; taskText: string; notes: string }) {
  return [entry.date, entry.startTime, entry.endTime, entry.projectId ?? '', entry.subProjectId ?? '', entry.itemNr, entry.taskText, entry.notes].join('|')
}

export default function DataManagement() {
  const { t } = useTranslation()
  const projects = useLiveQuery(() => db.projects.toArray()) ?? []
  const subProjects = useLiveQuery(() => db.subProjects.toArray()) ?? []
  const entries = useLiveQuery(() => db.timeEntries.toArray()) ?? []
  const backupInput = useRef<HTMLInputElement>(null)
  const importInput = useRef<HTMLInputElement>(null)
  const [backup, setBackup] = useState<TrackMeBackup | null>(null)
  const [importResult, setImportResult] = useState<TimeEntryImportResult | null>(null)
  const [message, setMessage] = useState('')
  const [confirmRestore, setConfirmRestore] = useState(false)

  async function currentBackup() {
    return createBackup({
      projects: await db.projects.toArray(), subProjects: await db.subProjects.toArray(),
      workItemLinks: await db.workItemLinks.toArray(), timeEntries: await db.timeEntries.toArray(),
      items: await db.items.toArray(), todoTasks: await db.todoTasks.toArray(),
    })
  }

  async function exportBackup() {
    download(JSON.stringify(await currentBackup(), null, 2), `trackme-backup-${fileDate()}.json`, 'application/json')
  }

  function exportEntries(format: 'csv' | 'xlsx') {
    const workbook = createTimeEntryWorkbook(createTimeEntryTransferRows(entries, projects, subProjects))
    const name = `trackme-zeiten-${fileDate()}`
    if (format === 'xlsx') XLSX.writeFile(workbook, `${name}.xlsx`)
    else download(XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]), `${name}.csv`, 'text/csv;charset=utf-8')
  }

  async function selectBackup(file?: File) {
    if (!file) return
    try {
      setBackup(parseBackup(await file.text()))
      setConfirmRestore(false)
      setMessage('')
    } catch {
      setBackup(null)
      setMessage(t('data.invalidBackup'))
    }
  }

  async function restore() {
    if (!backup) return
    if (!confirmRestore) { setConfirmRestore(true); return }
    try {
      download(JSON.stringify(await currentBackup(), null, 2), `trackme-before-restore-${fileDate()}.json`, 'application/json')
      await db.transaction('rw', [db.projects, db.subProjects, db.workItemLinks, db.timeEntries, db.items, db.todoTasks], async () => {
        await Promise.all([db.todoTasks.clear(), db.items.clear(), db.timeEntries.clear(), db.workItemLinks.clear(), db.subProjects.clear(), db.projects.clear()])
        if (backup.data.projects.length) await db.projects.bulkAdd(backup.data.projects)
        if (backup.data.subProjects.length) await db.subProjects.bulkAdd(backup.data.subProjects)
        if (backup.data.workItemLinks.length) await db.workItemLinks.bulkAdd(backup.data.workItemLinks)
        if (backup.data.timeEntries.length) await db.timeEntries.bulkAdd(backup.data.timeEntries)
        if (backup.data.items.length) await db.items.bulkAdd(backup.data.items)
        if (backup.data.todoTasks.length) await db.todoTasks.bulkAdd(backup.data.todoTasks)
      })
      setBackup(null); setConfirmRestore(false); setMessage(t('data.restoreSuccess'))
    } catch { setMessage(t('data.restoreError')) }
  }

  async function selectImport(file?: File) {
    if (!file) return
    try { setImportResult(await readTimeEntryFile(file)); setMessage('') }
    catch { setImportResult(null); setMessage(t('data.invalidTimeFile')) }
  }

  async function importEntries() {
    if (!importResult?.rows.length) return
    let imported = 0; let skipped = 0
    await db.transaction('rw', db.projects, db.subProjects, db.timeEntries, async () => {
      const projectMap = new Map((await db.projects.toArray()).map((project) => [project.key.toLowerCase(), project]))
      const subProjectMap = new Map((await db.subProjects.toArray()).map((subProject) => [`${subProject.projectId}|${subProject.key.toLowerCase()}`, subProject]))
      const keys = new Set((await db.timeEntries.toArray()).map(entryKey))
      for (const row of importResult.rows) {
        let projectId: number | undefined; let subProjectId: number | undefined
        if (row.projectKey) {
          let project = projectMap.get(row.projectKey)
          if (!project) { const id = await db.projects.add({ key: row.projectKey, name: row.projectKey, active: true }) as number; project = { id, key: row.projectKey, name: row.projectKey, active: true }; projectMap.set(row.projectKey, project) }
          projectId = project.id
          if (row.subProjectKey && projectId) {
            const mapKey = `${projectId}|${row.subProjectKey}`
            let subProject = subProjectMap.get(mapKey)
            if (!subProject) { const id = await db.subProjects.add({ projectId, key: row.subProjectKey, name: row.subProjectKey, active: true }) as number; subProject = { id, projectId, key: row.subProjectKey, name: row.subProjectKey, active: true }; subProjectMap.set(mapKey, subProject) }
            subProjectId = subProject.id
          }
        }
        const entry = { date: row.date, startTime: row.startTime, endTime: row.endTime, durationMinutes: calculateDuration(row.startTime, row.endTime), projectId, subProjectId, itemNr: row.itemNr, taskText: row.taskText, notes: row.notes }
        const key = entryKey(entry)
        if (keys.has(key)) { skipped += 1; continue }
        await db.timeEntries.add(entry); keys.add(key); imported += 1
      }
    })
    setImportResult(null)
    setMessage(t('data.importSummary', { imported, skipped }))
  }

  return <div className="space-y-8">
    <div><h1 className="text-2xl font-bold tracking-tight">{t('data.title')}</h1><p className="mt-1 text-slate-500 dark:text-slate-400">{t('data.subtitle')}</p></div>
    <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><h2 className="font-semibold">{t('data.backupTitle')}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('data.backupDescription')}</p><div className="mt-4 flex gap-2"><button onClick={() => void exportBackup()} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900">{t('data.exportBackup')}</button><button onClick={() => backupInput.current?.click()} className="rounded-lg border px-3 py-2 text-sm">{t('data.chooseBackup')}</button><input ref={backupInput} className="hidden" type="file" accept=".json,application/json" onChange={(event) => void selectBackup(event.target.files?.[0])} /></div>{backup && <div className="mt-4 text-sm"><p>{t('data.backupPreview', { projects: backup.data.projects.length, entries: backup.data.timeEntries.length, items: backup.data.items.length, todos: backup.data.todoTasks.length })}</p><button onClick={() => void restore()} className="mt-2 font-medium text-red-600">{confirmRestore ? t('data.confirmRestore') : t('data.restoreBackup')}</button></div>}</section>
    <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><h2 className="font-semibold">{t('data.timeTitle')}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('data.timeDescription')}</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => exportEntries('csv')} className="rounded-lg border px-3 py-2 text-sm">{t('data.exportCsv')}</button><button onClick={() => exportEntries('xlsx')} className="rounded-lg border px-3 py-2 text-sm">{t('data.exportXlsx')}</button><button onClick={() => importInput.current?.click()} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900">{t('data.chooseTimeFile')}</button><input ref={importInput} className="hidden" type="file" accept=".csv,.xlsx,.xls" onChange={(event) => void selectImport(event.target.files?.[0])} /></div>{importResult && <div className="mt-4 text-sm"><p>{t('data.timePreview', { valid: importResult.rows.length, invalid: importResult.issues.length })}</p>{importResult.issues.map((issue) => <p key={`${issue.row}-${issue.message}`} className="text-amber-700">{t('data.rowIssue', { row: issue.row, message: issue.message })}</p>)}{importResult.rows.length > 0 && <button onClick={() => void importEntries()} className="mt-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white">{t('data.importTimes')}</button>}</div>}</section>
    {message && <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}
  </div>
}
