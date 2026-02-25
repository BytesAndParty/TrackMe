import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { db, type Project, PROJECT_COLORS } from '../db'

export default function Projects() {
  const { t } = useTranslation()
  const projects = useLiveQuery(() => db.projects.toArray()) ?? []
  const subProjects = useLiveQuery(() => db.subProjects.toArray()) ?? []

  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [subName, setSubName] = useState('')
  const [subKey, setSubKey] = useState('')
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  async function addProject(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !key.trim()) return
    await db.projects.add({ name: name.trim(), key: key.trim().toLowerCase(), active: true })
    setName('')
    setKey('')
  }

  async function saveField(id: number, field: string, value: string) {
    await db.projects.update(id, { [field]: value.trim() || undefined })
  }

  async function saveLinkTemplate(id: number, template: string) {
    await db.projects.update(id, { linkTemplate: template.trim() || undefined })
  }

  async function saveColor(id: number, color: string) {
    await db.projects.update(id, { color: color || undefined })
  }

  async function toggleActive(p: Project) {
    await db.projects.update(p.id!, { active: !p.active })
  }

  async function deleteProject(id: number) {
    await db.subProjects.where('projectId').equals(id).delete()
    await db.projects.delete(id)
  }

  async function addSubProject(e: React.FormEvent, projectId: number) {
    e.preventDefault()
    if (!subName.trim() || !subKey.trim()) return
    await db.subProjects.add({
      projectId,
      name: subName.trim(),
      key: subKey.trim().toLowerCase(),
    })
    setSubName('')
    setSubKey('')
  }

  async function deleteSubProject(id: number) {
    await db.subProjects.delete(id)
  }

  async function shareProject(p: Project) {
    const subs = subProjects.filter(s => s.projectId === p.id)
    const payload = {
      key: p.key,
      name: p.name,
      color: p.color,
      linkTemplate: p.linkTemplate,
      subProjects: subs.map(s => ({ key: s.key, name: s.name })),
    }
    const base64 = btoa(JSON.stringify(payload))
    const url = `${window.location.origin}/import?data=${base64}`
    await navigator.clipboard.writeText(url)
    setCopiedId(p.id!)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('projects.title')}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t('projects.subtitle')}</p>
      </div>

      {/* Add Project Form */}
      <form onSubmit={addProject} className="flex gap-3">
        <input
          type="text"
          placeholder={t('projects.shortcutPlaceholder')}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-40 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent transition-shadow"
        />
        <input
          type="text"
          placeholder={t('projects.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent transition-shadow"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-200 active:bg-slate-700 transition-colors"
        >
          {t('projects.add')}
        </button>
      </form>

      {/* Project List */}
      <div className="space-y-3">
        {projects.length === 0 && (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <p className="text-lg">{t('projects.emptyTitle')}</p>
            <p className="text-sm mt-1">{t('projects.emptyHint')}</p>
          </div>
        )}
        {projects.map((p) => {
          const subs = subProjects.filter((s) => s.projectId === p.id)
          const isExpanded = activeProjectId === p.id

          return (
            <div
              key={p.id}
              className={`bg-white dark:bg-slate-900 border rounded-xl overflow-hidden transition-all ${
                p.active ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800 opacity-60'
              }`}
            >
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                onClick={() => setActiveProjectId(isExpanded ? null : p.id!)}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`text-slate-400 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {p.color && (
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                )}
                <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                  {p.key}
                </span>
                <span className="font-medium text-sm flex-1">{p.name}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{t('projects.subProjectsCount', { count: subs.length })}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); shareProject(p) }}
                  className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors"
                >
                  {copiedId === p.id ? t('projects.copied') : t('projects.share')}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleActive(p) }}
                  className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors"
                >
                  {p.active ? t('projects.deactivate') : t('projects.activate')}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteProject(p.id!) }}
                  className="text-xs px-2 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>

              {/* Sub Projects */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3 space-y-3">
                  {/* Project Key & Name */}
                  <div className="flex gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('projects.shortcutLabel')}</label>
                      <input
                        type="text"
                        defaultValue={p.key}
                        onBlur={(e) => saveField(p.id!, 'key', e.target.value.toLowerCase())}
                        className="w-28 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('projects.nameLabel')}</label>
                      <input
                        type="text"
                        defaultValue={p.name}
                        onBlur={(e) => saveField(p.id!, 'name', e.target.value)}
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Project Color */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{t('projects.projectColor')}</label>
                    <div className="flex flex-wrap gap-1.5">
                      {PROJECT_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => saveColor(p.id!, p.color === c ? '' : c)}
                          className={`w-6 h-6 rounded-full transition-all ${
                            p.color === c ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-slate-900 dark:ring-slate-100 scale-110' : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Link Template */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      {t('projects.linkTemplate')} <span className="text-slate-400 dark:text-slate-500 font-normal">{t('projects.linkTemplateHint', { token: '{itemNr}' })}</span>
                    </label>
                    <input
                      type="text"
                      value={p.linkTemplate ?? ''}
                      onChange={(e) => saveLinkTemplate(p.id!, e.target.value)}
                      placeholder={t('projects.linkTemplatePlaceholder')}
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent"
                    />
                  </div>

                  {/* Sub Projects */}
                  {subs.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 py-1">
                      <span className="font-mono text-xs bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                        {s.key}
                      </span>
                      <span className="text-sm flex-1">{s.name}</span>
                      <button
                        onClick={() => deleteSubProject(s.id!)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        {t('projects.remove')}
                      </button>
                    </div>
                  ))}
                  <form onSubmit={(e) => addSubProject(e, p.id!)} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder={t('projects.shortcutLabel')}
                      value={subKey}
                      onChange={(e) => setSubKey(e.target.value)}
                      className="w-28 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder={t('projects.nameLabel')}
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
                    >
                      {t('projects.subProjectAdd')}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
