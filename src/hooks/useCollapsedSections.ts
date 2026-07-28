import { useState } from 'react'

const INFO_COLLAPSED_KEY = 'itemDetailInfoCollapsed'

export function useCollapsedSections(initialNotesCollapsed: boolean) {
  const [infoCollapsed, setInfoCollapsed] = useState(() => localStorage.getItem(INFO_COLLAPSED_KEY) === 'true')
  const [notesCollapsed, setNotesCollapsed] = useState(initialNotesCollapsed)

  function toggleInfoCollapsed() {
    setInfoCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(INFO_COLLAPSED_KEY, String(next))
      return next
    })
  }

  function toggleNotesCollapsed() {
    setNotesCollapsed((prev) => !prev)
  }

  return { infoCollapsed, toggleInfoCollapsed, notesCollapsed, setNotesCollapsed, toggleNotesCollapsed }
}
