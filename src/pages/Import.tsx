import { useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { db } from '../db'

const sharedProjectSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  color: z.string().optional(),
  linkTemplate: z.string().optional(),
  subProjects: z
    .array(
      z.object({
        key: z.string().min(1),
        name: z.string().min(1),
      })
    )
    .optional(),
})

export default function Import() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const existingProjects = useLiveQuery(() => db.projects.toArray()) ?? []

  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(false)

  const { parsed, errorKey: parseErrorKey } = useMemo(() => {
    const data = searchParams.get('data')
    if (!data) return { parsed: null, errorKey: 'noDataError' as const }

    let json: unknown
    try {
      json = JSON.parse(atob(data))
    } catch {
      return { parsed: null, errorKey: 'decodeError' as const }
    }

    const result = sharedProjectSchema.safeParse(json)
    if (!result.success) return { parsed: null, errorKey: 'invalidDataError' as const }
    return { parsed: result.data, errorKey: null }
  }, [searchParams])

  const errorKey = importError ? 'importError' : parseErrorKey
  const duplicate = parsed
    ? existingProjects.some((project) => project.key.toLowerCase() === parsed.key.toLowerCase())
    : false

  async function handleImport() {
    if (!parsed || duplicate) return
    setImporting(true)
    try {
      const projectId = await db.projects.add({
        key: parsed.key,
        name: parsed.name,
        active: true,
        color: parsed.color,
        linkTemplate: parsed.linkTemplate,
      })
      if (parsed.subProjects) {
        for (const sub of parsed.subProjects) {
          await db.subProjects.add({
            projectId: projectId as number,
            key: sub.key,
            name: sub.name,
            active: true,
          })
        }
      }
      navigate('/projects')
    } catch {
      setImportError(true)
      setImporting(false)
    }
  }

  if (errorKey) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('import.title')}</h1>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{t(`import.${errorKey}`)}</p>
        </div>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          {t('import.backToProjects')}
        </button>
      </div>
    )
  }

  if (!parsed) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t('import.title')}</h1>

      {duplicate && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {t('import.duplicateBlocked', { key: parsed.key })}
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-3">
            {parsed.color && (
              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: parsed.color }} />
            )}
            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
              {parsed.key}
            </span>
            <span className="font-medium text-base">{parsed.name}</span>
          </div>

          {parsed.linkTemplate && (
            <div>
              <span className="text-xs text-slate-400 dark:text-slate-500">{t('import.linkTemplate')}</span>
              <span className="text-xs font-mono text-slate-600 dark:text-slate-400 ml-1.5">{parsed.linkTemplate}</span>
            </div>
          )}

          {parsed.subProjects && parsed.subProjects.length > 0 && (
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                {t('import.subProjects', { count: parsed.subProjects.length })}
              </span>
              <div className="space-y-1">
                {parsed.subProjects.map((sub, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                      {sub.key}
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{sub.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleImport}
          disabled={importing || duplicate}
          className="px-4 py-2 text-sm font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {importing ? t('import.importing') : t('import.import')}
        </button>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
