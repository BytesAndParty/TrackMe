export function minutesToHoursInput(minutes?: number): string {
  if (!minutes || minutes <= 0) return ''
  const hours = minutes / 60
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/\.?0+$/, '')
}

export function parseEstimatedMinutes(rawHours: string): number | undefined {
  const normalized = rawHours.trim().replace(',', '.')
  if (!normalized) return undefined
  const hours = Number(normalized)
  if (!Number.isFinite(hours) || hours <= 0) return undefined
  return Math.round(hours * 60)
}
