import { useState, useCallback } from 'react'
import { parseTimeInput } from '../../lib/parser'
import { useGridContext } from './GridContext'
import { type EditableField } from '../../hooks/useGridRows'

interface TimeCellProps {
  value: string
  rowKey: string
  col: number
  field: EditableField
}

export default function TimeCell({ value, rowKey, col, field }: TimeCellProps) {
  const { registerCellRef, updateCell, markEditing, unmarkEditing } = useGridContext()
  const [rawInput, setRawInput] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)

  const displayValue = rawInput !== null ? rawInput : value

  const setRef = useCallback((el: HTMLInputElement | null) => {
    registerCellRef(rowKey, col, el)
  }, [registerCellRef, rowKey, col])

  function handleChange(raw: string) {
    setRawInput(raw)
    setInvalid(false)
  }

  function commitRawInput(): boolean {
    if (rawInput === null) return true

    if (rawInput.trim() === '') {
      updateCell(rowKey, field, '')
      setInvalid(false)
      setRawInput(null)
      return true
    }

    const parsed = parseTimeInput(rawInput)
    if (parsed) {
      updateCell(rowKey, field, parsed)
      setInvalid(false)
      setRawInput(null)
      return true
    }

    setInvalid(true)
    return false
  }

  function handleBlur() {
    commitRawInput()
    unmarkEditing(rowKey)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Tab' || e.key === 'Enter') {
      const ok = commitRawInput()
      if (!ok) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      // let event bubble to grid handler for navigation
    }
    // all other keys: bubble to grid handler
  }

  return (
    <input
      ref={setRef}
      type="text"
      value={displayValue}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={(e) => {
        e.target.select()
        setInvalid(false)
        markEditing(rowKey)
      }}
      onBlur={handleBlur}
      placeholder="00:00"
      maxLength={6}
      className={`w-full bg-transparent px-2 py-2 text-sm font-mono outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 ${
        invalid ? 'text-red-500' : ''
      }`}
    />
  )
}
