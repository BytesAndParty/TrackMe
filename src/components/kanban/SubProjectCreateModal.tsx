import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { db, type SubProject } from '../../db'
import CloseButton from './CloseButton'
import { CreateModalShell, KeyNameFields, ModalFooterActions } from './CreateModalShell'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface SubProjectCreateModalProps {
  projectId: number
  projectName?: string
  defaultKey?: string
  defaultName?: string
  onCreated: (subProject: SubProject) => void
  onClose: () => void
}

export default function SubProjectCreateModal({
  projectId,
  projectName,
  defaultKey,
  defaultName,
  onCreated,
  onClose,
}: SubProjectCreateModalProps) {
  const { t } = useTranslation()
  const [key, setKey] = useState(defaultKey ?? '')
  const [name, setName] = useState(defaultName ?? '')

  useEscapeKey(onClose)

  const saveDisabled = !key.trim() || !name.trim()

  async function handleSave() {
    if (saveDisabled) return
    const newSubProject = {
      projectId,
      key: key.trim().toLowerCase(),
      name: name.trim(),
      active: true,
    }
    const id = await db.subProjects.add(newSubProject)
    // Note: closing is handled by the parent via onCreated (which clears the request);
    // onClose is reserved for cancel so it can revert the originating cell.
    onCreated({ ...newSubProject, id: id as number })
  }

  return (
    <CreateModalShell onClose={onClose} onSave={handleSave}>
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-bold">
          {t('subProjectCreate.title')}
          {projectName && (
            <span className="ml-2 text-sm font-normal text-slate-400 dark:text-slate-500">
              {t('subProjectCreate.forProject', { project: projectName })}
            </span>
          )}
        </h2>
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
      </div>

      <ModalFooterActions onCancel={onClose} saveDisabled={saveDisabled} cancelLabel={t('common.cancel')} saveLabel={t('common.save')} />
    </CreateModalShell>
  )
}
