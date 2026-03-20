import { useState, useEffect, useCallback, type RefObject } from 'react'
import { useDebouncedCallback } from './useDebouncedCallback'
import { type GridRowData } from './useGridRows'

export type SaveStatus = 'saved' | 'saving' | 'error'

export function useAutoSave(
  commitAllDirty: (setSaveStatus: (s: SaveStatus) => void) => Promise<boolean>,
  rowsRef: RefObject<GridRowData[]>
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')

  const doCommit = useCallback(() => {
    void commitAllDirty(setSaveStatus)
  }, [commitAllDirty])

  const { debounced: triggerDebouncedSave, cancel: cancelDebouncedSave } = useDebouncedCallback(doCommit, 500)

  // Save on unmount
  useEffect(() => {
    return () => {
      cancelDebouncedSave()
      void commitAllDirty(setSaveStatus)
    }
  }, [cancelDebouncedSave, commitAllDirty])

  // Save when tab becomes hidden (fires reliably before browser freezes the page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cancelDebouncedSave()
        void commitAllDirty(setSaveStatus)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [cancelDebouncedSave, commitAllDirty])

  // Handle browser close/refresh (last-resort safety net)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasDirty = rowsRef.current.some(r => r._dirty && r.startTime)
      if (hasDirty) {
        cancelDebouncedSave()
        void commitAllDirty(setSaveStatus)
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [cancelDebouncedSave, commitAllDirty, rowsRef])

  return { saveStatus, setSaveStatus, triggerDebouncedSave, cancelDebouncedSave }
}
