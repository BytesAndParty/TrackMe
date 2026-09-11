import { useState, useEffect, useRef, useCallback, type RefObject } from 'react'
import { useDebouncedCallback } from './useDebouncedCallback'
import { type GridRowData } from './useGridRows'

export type SaveStatus = 'saved' | 'saving' | 'error'

export function useAutoSave(
  commitAllDirty: (setSaveStatus: (s: SaveStatus) => void) => Promise<boolean>,
  rowsRef: RefObject<GridRowData[]>
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')

  // commitAllDirty hängt an projects/subProjects aus useLiveQuery und bekommt bei jedem
  // Dexie-Write eine neue Identität. Über das Ref bleiben die Effects unten stabil - sonst
  // würde jeder Schreibvorgang ihr Cleanup auslösen und mitten im Tippen erneut speichern.
  const commitRef = useRef(commitAllDirty)
  useEffect(() => {
    commitRef.current = commitAllDirty
  }, [commitAllDirty])

  const doCommit = useCallback(() => {
    void commitRef.current(setSaveStatus)
  }, [])

  const { debounced: triggerDebouncedSave, cancel: cancelDebouncedSave } = useDebouncedCallback(doCommit, 500)

  // Save on unmount
  useEffect(() => {
    return () => {
      cancelDebouncedSave()
      void commitRef.current(setSaveStatus)
    }
  }, [cancelDebouncedSave])

  // Save when tab becomes hidden (fires reliably before browser freezes the page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cancelDebouncedSave()
        void commitRef.current(setSaveStatus)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [cancelDebouncedSave])

  // Handle browser close/refresh (last-resort safety net)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasDirty = rowsRef.current.some(r => r._dirty && r.startTime)
      if (hasDirty) {
        cancelDebouncedSave()
        void commitRef.current(setSaveStatus)
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [cancelDebouncedSave, rowsRef])

  return { saveStatus, setSaveStatus, triggerDebouncedSave, cancelDebouncedSave }
}
