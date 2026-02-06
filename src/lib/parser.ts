export interface ParsedEntry {
  startTime: string | null
  endTime: string | null
  projectKey: string | null
  subProjectKey: string | null
  workItemId: string | null
  taskText: string
}

const TIME_PATTERN = /\b(\d{1,2}):(\d{2})\b/g
const WORK_ITEM_PATTERN = /#(\d+)/
const QUOTED_TEXT_PATTERN = /"([^"]+)"/

export function parseQuickEntry(input: string): ParsedEntry {
  const result: ParsedEntry = {
    startTime: null,
    endTime: null,
    projectKey: null,
    subProjectKey: null,
    workItemId: null,
    taskText: '',
  }

  // Extract times
  const times: string[] = []
  let match: RegExpExecArray | null
  while ((match = TIME_PATTERN.exec(input)) !== null) {
    const h = match[1].padStart(2, '0')
    const m = match[2]
    times.push(`${h}:${m}`)
  }
  if (times.length >= 1) result.startTime = times[0]
  if (times.length >= 2) result.endTime = times[1]

  // Extract work item ID
  const itemMatch = input.match(WORK_ITEM_PATTERN)
  if (itemMatch) {
    result.workItemId = itemMatch[1]
  }

  // Extract quoted text as task description
  const quotedMatch = input.match(QUOTED_TEXT_PATTERN)
  if (quotedMatch) {
    result.taskText = quotedMatch[1]
  }

  // Remove known tokens to find project/subproject keys
  let remaining = input
    .replace(TIME_PATTERN, '')
    .replace(WORK_ITEM_PATTERN, '')
    .replace(QUOTED_TEXT_PATTERN, '')
    .trim()

  // Remaining tokens are project keys
  const tokens = remaining.split(/\s+/).filter(Boolean)
  if (tokens.length >= 1) result.projectKey = tokens[0].toLowerCase()
  if (tokens.length >= 2) result.subProjectKey = tokens[1].toLowerCase()

  // If no quoted text, use remaining tokens after project keys as task text
  if (!result.taskText && tokens.length > 2) {
    result.taskText = tokens.slice(2).join(' ')
  }

  return result
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

export function formatTime(time: string): string {
  return time
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getWeekDates(date: Date): string[] {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday as start
  const monday = new Date(date)
  monday.setDate(date.getDate() + diff)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export function formatDateShort(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' })
}

export function formatDateLong(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
