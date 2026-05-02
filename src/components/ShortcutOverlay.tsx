import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

export default function ShortcutOverlay() {
  const { t } = useTranslation()
  const location = useLocation()
  const [isVisible, setIsVisible] = useState(false)
  const [isHolding, setIsHolding] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Shift' && !isHolding) {
        setIsHolding(true)
        timer = setTimeout(() => {
          setIsVisible(true)
        }, 1500) // 1.5s instead of 2s for better UX, but close to user request
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === 'Shift') {
        setIsHolding(false)
        setIsVisible(false)
        if (timer) clearTimeout(timer)
      }
    }

    // Also hide if window loses focus
    function handleBlur() {
      setIsHolding(false)
      setIsVisible(false)
      if (timer) clearTimeout(timer)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      if (timer) clearTimeout(timer)
    }
  }, [isHolding])

  if (!isVisible) return null

  const isDayView = location.pathname === '/'
  const isItemsView = location.pathname.startsWith('/items')

  const shortcuts = [
    { key: 'Mod + S', label: t('common.save') },
    { key: 'Mod + K', label: t('layout.nav.projects') }, // Just an example, maybe add more
  ]

  if (isDayView) {
    shortcuts.push(
      { key: 'Alt + T', label: t('dayView.today') },
      { key: 'Alt + ← / →', label: t('dayView.navDay') },
      { key: 'Tab', label: t('dayView.nextCell') },
      { key: 'Enter', label: t('dayView.nextRow') },
      { key: 'Esc', label: t('dayView.cancel') },
      { key: 'Mod + Backspace', label: t('common.delete') }
    )
  }

  if (isItemsView) {
    shortcuts.push(
      { key: 'N', label: t('kanban.newItem') },
      { key: 'D', label: t('kanban.trash') }
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold">Shortcuts</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Halte Shift gedrückt, um diese Übersicht zu sehen.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">{s.label}</span>
              <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">TrackMe Pro Tip</span>
        </div>
      </div>
    </div>
  )
}
