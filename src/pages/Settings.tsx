import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ensureBackupFolderPermission, isFileSystemAccessSupported, useBackupFolder } from '../hooks/useBackupFolder'

export default function Settings() {
  const { t } = useTranslation()
  const { handle, loaded, chooseFolder, clearFolder } = useBackupFolder()
  const [error, setError] = useState('')
  const supported = isFileSystemAccessSupported()

  async function handleChoose() {
    setError('')
    try {
      const picked = await chooseFolder()
      await ensureBackupFolderPermission(picked)
    } catch {
      setError(t('settings.folderError'))
    }
  }

  return <div className="space-y-8">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h1>
      <p className="mt-1 text-slate-500 dark:text-slate-400">{t('settings.subtitle')}</p>
    </div>
    <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="font-semibold">{t('settings.backupFolderTitle')}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('settings.backupFolderDescription')}</p>

      {!supported && (
        <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">{t('settings.folderUnsupported')}</p>
      )}

      {supported && loaded && (
        <div className="mt-4 space-y-2">
          <p className="text-sm">
            {handle
              ? t('settings.currentFolder', { folder: handle.name })
              : t('settings.noFolder')}
          </p>
          <div className="flex gap-2">
            <button onClick={() => void handleChoose()} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900">
              {t('settings.chooseFolder')}
            </button>
            {handle && (
              <button onClick={() => void clearFolder()} className="rounded-lg border px-3 py-2 text-sm">
                {t('settings.removeFolder')}
              </button>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </section>
  </div>
}
