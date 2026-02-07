import { useState, useRef, useEffect } from 'react'

export interface Suggestion {
  key: string
  name: string
  id: number
}

interface AutocompleteCellProps {
  value: string
  suggestions: Suggestion[]
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  inputRef: (el: HTMLInputElement | null) => void
  onFocus: () => void
  onBlur: () => void
}

export default function AutocompleteCell({
  value,
  suggestions,
  onChange,
  onKeyDown,
  inputRef,
  onFocus,
  onBlur,
}: AutocompleteCellProps) {
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filtered = value
    ? suggestions
        .filter(
          (s) =>
            s.key.toLowerCase().includes(value.toLowerCase()) ||
            s.name.toLowerCase().includes(value.toLowerCase())
        )
        .sort((a, b) => {
          const q = value.toLowerCase()
          const rank = (s: Suggestion) => {
            if (s.key.toLowerCase().startsWith(q)) return 0
            if (s.name.toLowerCase().startsWith(q)) return 1
            if (s.key.toLowerCase().includes(q)) return 2
            return 3
          }
          return rank(a) - rank(b)
        })
    : suggestions

  useEffect(() => {
    setHighlightIndex(0)
  }, [value])

  function selectItem(item: Suggestion) {
    onChange(item.key)
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Tab auto-completion works regardless of dropdown open state
    if (e.key === 'Tab' && !e.shiftKey) {
      if (filtered.length > 0 && value.length > 0) {
        const exactMatch = filtered.find(
          (s) => s.key.toLowerCase() === value.toLowerCase()
        )
        if (!exactMatch) {
          // Partial match: auto-complete to top suggestion, stay in field
          e.preventDefault()
          const idx = Math.min(highlightIndex, filtered.length - 1)
          onChange(filtered[idx].key)
          setOpen(false)
          return
        }
        // Exact match: normalize casing and navigate
        onChange(exactMatch.key)
      }
      setOpen(false)
      onKeyDown(e)
      return
    }

    if (open && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        selectItem(filtered[highlightIndex])
        return
      }
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
    }
    onKeyDown(e)
  }

  function handleBlur() {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      setOpen(false)
      onBlur()
    }, 150)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
          e.target.select()
          setOpen(true)
          onFocus()
        }}
        onBlur={handleBlur}
        placeholder="–"
        className="w-full bg-transparent px-2 py-2 text-sm font-mono outline-none placeholder:text-slate-300"
      />
      {open && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full mt-0.5 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
        >
          {filtered.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors ${
                i === highlightIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
              onMouseDown={(e) => {
                e.preventDefault()
                selectItem(item)
              }}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                {item.key}
              </span>
              <span className="text-slate-500 truncate">{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
