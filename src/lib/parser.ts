/**
 * Smart time input parser. Accepts various formats:
 * - "0900" / "900"  → "09:00"
 * - "9:00" / "09:00" → "09:00"
 * - "18,5" / "18.5" → "18:30" (decimal hours)
 * - "8,25" → "08:15"
 */
export function parseTimeInput(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  // Decimal hours: 18,5 or 18.5 or 8,25
  const decimalMatch = s.match(/^(\d{1,2})[,.](\d{1,2})$/)
  if (decimalMatch) {
    const hours = parseInt(decimalMatch[1])
    const decPart = decimalMatch[2]
    const fraction = parseInt(decPart) / Math.pow(10, decPart.length)
    const minutes = Math.round(fraction * 60)
    if (hours > 23 || minutes > 59) return null
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  // Standard HH:mm or H:mm
  const colonMatch = s.match(/^(\d{1,2}):(\d{2})$/)
  if (colonMatch) {
    const hours = parseInt(colonMatch[1])
    const minutes = parseInt(colonMatch[2])
    if (hours > 23 || minutes > 59) return null
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  // Compact digits: 0900, 900, 1730
  const compactMatch = s.match(/^(\d{3,4})$/)
  if (compactMatch) {
    const padded = compactMatch[1].padStart(4, '0')
    const hours = parseInt(padded.slice(0, 2))
    const minutes = parseInt(padded.slice(2, 4))
    if (hours > 23 || minutes > 59) return null
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  // Single/double digit: 8 → "08:00", 14 → "14:00"
  const hourMatch = s.match(/^(\d{1,2})$/)
  if (hourMatch) {
    const hours = parseInt(hourMatch[1])
    if (hours > 23) return null
    return `${String(hours).padStart(2, '0')}:00`
  }

  return null
}

export function calculateDuration(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em) - (sh * 60 + sm)
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

export function toLocalISO(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO(): string {
  return toLocalISO(new Date())
}

export function getWeekDates(date: Date): string[] {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday as start
  const monday = new Date(date)
  monday.setDate(date.getDate() + diff)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return toLocalISO(d)
  })
}

// English 3-letter names, independent of the UI language. Indexed like Date#getDay() / Date#getMonth().
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatDateShort(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

// Same character count for every date (zero-padded day, 3-letter weekday and month), so the
// day navigation does not shift when stepping through days. Render with a monospace font.
export function formatDateFixedWidth(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  const day = String(d.getDate()).padStart(2, '0')
  return `${WEEKDAYS_SHORT[d.getDay()]} ${day} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

export function getISOWeek(date: Date): number {
  const d = new Date(date.getTime())
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}
