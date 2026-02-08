import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Project, PROJECT_COLORS } from '../db'

export default function Projects() {
  const projects = useLiveQuery(() => db.projects.toArray()) ?? []
  const subProjects = useLiveQuery(() => db.subProjects.toArray()) ?? []

  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editKey, setEditKey] = useState('')
  const [editLinkTemplate, setEditLinkTemplate] = useState('')
  const [editColor, setEditColor] = useState('')

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

  async function startEdit(p: Project) {
    setEditingId(p.id!)
    setEditName(p.name)
    setEditKey(p.key)
    setEditLinkTemplate(p.linkTemplate ?? '')
    setEditColor(p.color ?? '')
  }

  async function saveEdit(id: number) {
    await db.projects.update(id, { name: editName.trim(), key: editKey.trim().toLowerCase(), color: editColor || undefined, linkTemplate: editLinkTemplate.trim() || undefined })
    setEditingId(null)
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
        <h1 className="text-2xl font-bold tracking-tight">Projekte</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Verwalte deine Projekte und Unterprojekte.</p>
      </div>

      {/* Add Project Form */}
      <form onSubmit={addProject} className="flex gap-3">
        <input
          type="text"
          placeholder="Projektkürzel (z.B. urb)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-40 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent transition-shadow"
        />
        <input
          type="text"
          placeholder="Projektname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent transition-shadow"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-200 active:bg-slate-700 transition-colors"
        >
          Hinzufügen
        </button>
      </form>

      {/* Project List */}
      <div className="space-y-3">
        {projects.length === 0 && (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <p className="text-lg">Noch keine Projekte angelegt.</p>
            <p className="text-sm mt-1">Erstelle dein erstes Projekt oben.</p>
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
              <div className="flex items-center gap-3 px-4 py-3">
                {editingId === p.id ? (
                  <>
                    <input
                      value={editKey}
                      onChange={(e) => setEditKey(e.target.value)}
                      className="w-24 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded text-sm font-mono bg-white dark:bg-slate-800"
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(p.id!)}
                    />
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-800"
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(p.id!)}
                    />
                    <input
                      value={editLinkTemplate}
                      onChange={(e) => setEditLinkTemplate(e.target.value)}
                      placeholder="Link-Template: https://.../{itemNr}"
                      className="w-72 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 font-mono text-xs"
                    />
                    <button
                      onClick={() => saveEdit(p.id!)}
                      className="text-xs px-3 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
                    >
                      Speichern
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs px-3 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                      Abbrechen
                    </button>
                  </>
                ) : (
                  <>
                    {p.color && (
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    )}
                    <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                      {p.key}
                    </span>
                    <span className="font-medium text-sm flex-1">{p.name}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{subs.length} Unterprojekte</span>
                    <button
                      onClick={() => setActiveProjectId(isExpanded ? null : p.id!)}
                      className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors"
                    >
                      {isExpanded ? 'Zuklappen' : 'Aufklappen'}
                    </button>
                    <button
                      onClick={() => shareProject(p)}
                      className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors"
                    >
                      {copiedId === p.id ? 'Kopiert!' : 'Teilen'}
                    </button>
                    <button
                      onClick={() => startEdit(p)}
                      className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => toggleActive(p)}
                      className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors"
                    >
                      {p.active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button
                      onClick={() => deleteProject(p.id!)}
                      className="text-xs px-2 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      Löschen
                    </button>
                  </>
                )}
              </div>

              {/* Sub Projects */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3 space-y-3">
                  {/* Project Color */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Projektfarbe</label>
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
                      Link-Template <span className="text-slate-400 dark:text-slate-500 font-normal">({'{itemNr}'} wird durch die Item-Nr ersetzt)</span>
                    </label>
                    <input
                      type="text"
                      value={p.linkTemplate ?? ''}
                      onChange={(e) => saveLinkTemplate(p.id!, e.target.value)}
                      placeholder="z.B. https://dev.azure.com/org/project/_workitems/edit/{itemNr}"
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
                        Entfernen
                      </button>
                    </div>
                  ))}
                  <form onSubmit={(e) => addSubProject(e, p.id!)} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Kürzel"
                      value={subKey}
                      onChange={(e) => setSubKey(e.target.value)}
                      className="w-28 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Name"
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
                    >
                      + Unterprojekt
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
