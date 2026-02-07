interface TextCellProps {
  value: string
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  inputRef: (el: HTMLInputElement | null) => void
  onFocus: () => void
  onBlur: () => void
  placeholder?: string
}

export default function TextCell({
  value,
  onChange,
  onKeyDown,
  inputRef,
  onFocus,
  onBlur,
  placeholder,
}: TextCellProps) {
  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onFocus={(e) => {
        e.target.select()
        onFocus()
      }}
      onBlur={onBlur}
      placeholder={placeholder}
      className="w-full bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-300"
    />
  )
}
