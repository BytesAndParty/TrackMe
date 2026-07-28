import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { db, type Project, PROJECT_COLORS } from '../../db'
import CloseButton from './CloseButton'
import ColorPicker from './ColorPicker'
import { CreateModalShell, KeyNameFields, ModalFooterActions } from './CreateModalShell'
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

  return (
    <CreateModalShell onClose={onClose} onSave={handleSave}>
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-bold">{t('projectCreate.title')}</h2>
        <CloseButton onClick={onClose} />
      </div>

      <div className="px-6 py-4 space-y-4">
        <KeyNameFields
          keyValue={key}
          onKeyChange={setKey}
          nameValue={name}
          onNameChange={setName}
          keyLabel={t('projects.shortcutLabel')}
          nameLabel={t('projects.nameLabel')}
        />

        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{t('projects.projectColor')}</label>
          <ColorPicker colors={PROJECT_COLORS} value={color} onChange={setColor} />
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

      <ModalFooterActions onCancel={onClose} saveDisabled={saveDisabled} cancelLabel={t('common.cancel')} saveLabel={t('common.save')} />
    </CreateModalShell>
  )
}
