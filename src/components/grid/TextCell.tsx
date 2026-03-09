import { useCallback } from 'react'
import { useGridContext } from './GridContext'
import { type EditableField } from '../../hooks/useGridRows'

interface TextCellProps {
  value: string
  rowKey: string
  col: number
  field: EditableField
  placeholder?: string
}

export default function TextCell({ value, rowKey, col, field, placeholder }: TextCellProps) {
  const { registerCellRef, updateCell, markEditing, unmarkEditing } = useGridContext()

  const setRef = useCallback((el: HTMLInputElement | null) => {
    registerCellRef(rowKey, col, el)
  }, [registerCellRef, rowKey, col])

  return (
    <input
      ref={setRef}
      type="text"
      value={value}
      onChange={(e) => updateCell(rowKey, field, e.target.value)}
      onFocus={(e) => {
        e.target.select()
        markEditing(rowKey)
      }}
      onBlur={() => unmarkEditing(rowKey)}
      placeholder={placeholder}
      className="w-full bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
    />
  )
}
