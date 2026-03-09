import { useRef, useCallback } from 'react'

export function useGridEditing() {
  const editingRows = useRef(new Map<string, number>())

  const markEditing = useCallback((rowKey: string) => {
    editingRows.current.set(rowKey, (editingRows.current.get(rowKey) ?? 0) + 1)
  }, [])

  const unmarkEditing = useCallback((rowKey: string) => {
    const count = (editingRows.current.get(rowKey) ?? 0) - 1
    if (count <= 0) {
      editingRows.current.delete(rowKey)
    } else {
      editingRows.current.set(rowKey, count)
    }
  }, [])

  return { editingRows, markEditing, unmarkEditing }
}
