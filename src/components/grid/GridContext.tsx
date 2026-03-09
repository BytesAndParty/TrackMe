import { createContext, useContext } from 'react'
import { type EditableField } from '../../hooks/useGridRows'

export interface GridContextValue {
  registerCellRef: (rowKey: string, col: number, el: HTMLInputElement | null) => void
  focusCell: (rowKey: string, col: number) => void
  updateCell: (rowKey: string, field: EditableField, value: string) => void
  markEditing: (rowKey: string) => void
  unmarkEditing: (rowKey: string) => void
}

const GridContext = createContext<GridContextValue | null>(null)

export const GridProvider = GridContext.Provider

export function useGridContext(): GridContextValue {
  const ctx = useContext(GridContext)
  if (!ctx) throw new Error('useGridContext must be used within GridProvider')
  return ctx
}
