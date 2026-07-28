interface ColorPickerProps {
  colors: string[]
  value?: string
  onChange: (color: string) => void
  ringOffsetDarkClass?: string
}

export default function ColorPicker({ colors, value, onChange, ringOffsetDarkClass = 'dark:ring-offset-slate-900' }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(value === c ? '' : c)}
          className={`w-6 h-6 rounded-full transition-all ${
            value === c ? `ring-2 ring-offset-2 ring-offset-white ${ringOffsetDarkClass} ring-slate-900 dark:ring-slate-100 scale-110` : 'hover:scale-110'
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  )
}
