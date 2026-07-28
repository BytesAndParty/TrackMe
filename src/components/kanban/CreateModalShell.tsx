import { type ReactNode } from 'react'

interface CreateModalShellProps {
  onClose: () => void
  onSave: () => void | Promise<void>
  children: ReactNode
}

export function CreateModalShell({ onClose, onSave, children }: CreateModalShellProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void onSave()
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {children}
      </form>
    </div>
  )
}

interface KeyNameFieldsProps {
  keyValue: string
  onKeyChange: (value: string) => void
  nameValue: string
  onNameChange: (value: string) => void
  keyLabel: string
  nameLabel: string
}

export function KeyNameFields({ keyValue, onKeyChange, nameValue, onNameChange, keyLabel, nameLabel }: KeyNameFieldsProps) {
  return (
    <div className="flex gap-3">
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{keyLabel}</label>
        <input
          autoFocus
          type="text"
          value={keyValue}
          onChange={(e) => onKeyChange(e.target.value)}
          className="w-28 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent"
        />
      </div>
      <div className="flex-1">
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{nameLabel}</label>
        <input
          type="text"
          value={nameValue}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent"
        />
      </div>
    </div>
  )
}

interface ModalFooterActionsProps {
  onCancel: () => void
  saveDisabled: boolean
  cancelLabel: string
  saveLabel: string
}

export function ModalFooterActions({ onCancel, saveDisabled, cancelLabel, saveLabel }: ModalFooterActionsProps) {
  return (
    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        disabled={saveDisabled}
        className="px-4 py-2 text-sm font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saveLabel}
      </button>
    </div>
  )
}
