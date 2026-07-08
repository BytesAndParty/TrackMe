import { useTranslation } from 'react-i18next'

interface ItemDetailFooterProps {
  showDelete?: boolean
  confirmDelete: boolean
  onConfirmDeleteChange: (value: boolean) => void
  onDelete: () => void
  onCancel: () => void
  onSave: () => void
  saveDisabled: boolean
  className?: string
}

export default function ItemDetailFooter({
  showDelete = true,
  confirmDelete,
  onConfirmDeleteChange,
  onDelete,
  onCancel,
  onSave,
  saveDisabled,
  className = '',
}: ItemDetailFooterProps) {
  const { t } = useTranslation()

  return (
    <div
      className={`px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between${
        className ? ` ${className}` : ''
      }`}
    >
      <div>
        {showDelete &&
          (confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600">{t('itemDetail.confirmDelete')}</span>
              <button
                type="button"
                onClick={onDelete}
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                {t('common.yes')}
              </button>
              <button
                type="button"
                onClick={() => onConfirmDeleteChange(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                {t('common.no')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onConfirmDeleteChange(true)}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              {t('common.delete')}
            </button>
          ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          className="px-4 py-2 text-sm font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('common.save')}
        </button>
      </div>
    </div>
  )
}
