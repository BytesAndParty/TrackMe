import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { db, type Project, PROJECT_COLORS } from '../../db'
import CloseButton from './CloseButton'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface ProjectCreateModalProps {
  defaultKey?: string
  defaultName?: string
  onCreated: (project: Project) => void
  onClose: () => void
}

export default function ProjectCreateModal({ defaultKey, defaultName, onCreated, onClose }: ProjectCreateModalProps) {
  const { t } = useTranslation()
  const [key, setKey] = useState(defaultKey ?? '')
  const [name, setName] = useState(defaultName ?? '')
  const [color, setColor] = useState('')
  const [linkTemplate, setLinkTemplate] = useState('')

  useEscapeKey(onClose)

  const saveDisabled = !key.trim() || !name.trim()

  async function handleSave() {
    if (saveDisabled) return
    const newProject = {
      key: key.trim().toLowerCase(),
      name: name.trim(),
      active: true,
      color: color || undefined,
      linkTemplate: linkTemplate.trim() || undefined,
    }
    const id = await db.projects.add(newProject)
    // Note: closing is handled by the parent via onCreated (which clears the request);
    // onClose is reserved for cancel so it can revert the originating cell.
    onCreated({ ...newProject, id: id as number })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void handleSave()
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={onClose} />

      <form onSubmit={handleSubmit} className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('projectCreate.title')}</h2>
          <CloseButton onClick={onClose} />
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="flex gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('projects.shortcutLabel')}</label>
              <input
                autoFocus
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-28 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('projects.nameLabel')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{t('projects.projectColor')}</label>
            <div className="flex flex-wrap gap-1.5">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(color === c ? '' : c)}
                  className={`w-6 h-6 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-900 dark:ring-slate-100 scale-110' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t('projects.linkTemplate')} <span className="text-slate-400 dark:text-slate-500 font-normal">{t('projects.linkTemplateHint', { token: '{itemNr}' })}</span>
            </label>
            <input
              type="text"
              value={linkTemplate}
              onChange={(e) => setLinkTemplate(e.target.value)}
              placeholder={t('projects.linkTemplatePlaceholder')}
              className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saveDisabled}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('common.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
