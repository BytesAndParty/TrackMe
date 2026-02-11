import { useState } from 'react'
import { parseTimeInput } from '../../lib/parser'

interface TimeCellProps {
  value: string
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  inputRef: (el: HTMLInputElement | null) => void
  onFocus: () => void
  onBlur: () => void
}

export default function TimeCell({
  value,
  onChange,
  onKeyDown,
  inputRef,
  onFocus,
  onBlur,
}: TimeCellProps) {
  const [rawInput, setRawInput] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)

  const displayValue = rawInput !== null ? rawInput : value

  function handleChange(raw: string) {
    setRawInput(raw)
    setInvalid(false)
  }

  function commitRawInput(): boolean {
    if (rawInput === null) return true

    if (rawInput.trim() === '') {
      onChange('')
      setInvalid(false)
      setRawInput(null)
      return true
    }

    const parsed = parseTimeInput(rawInput)
    if (parsed) {
      onChange(parsed)
      setInvalid(false)
      setRawInput(null)
      return true
    }

    setInvalid(true)
    return false
  }

  function handleBlur() {
    commitRawInput()
    onBlur()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // On Tab/Enter, format before navigation
    if (e.key === 'Tab' || e.key === 'Enter') {
      const ok = commitRawInput()
      if (!ok) {
        e.preventDefault()
        return
      }
    }
    onKeyDown(e)
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={displayValue}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={(e) => {
        e.target.select()
        setInvalid(false)
        onFocus()
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
