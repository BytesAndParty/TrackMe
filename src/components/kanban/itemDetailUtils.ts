import { db, type SubProject } from '../../db'

export function minutesToHoursInput(minutes?: number): string {
  if (!minutes || minutes <= 0) return ''
  const hours = minutes / 60
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/\.?0+$/, '')
}

function parseEstimatedMinutes(rawHours: string): number | undefined {
  const normalized = rawHours.trim().replace(',', '.')
  if (!normalized) return undefined
  const hours = Number(normalized)
  if (!Number.isFinite(hours) || hours <= 0) return undefined
  return Math.round(hours * 60)
}

function findDuplicateItemNr(projectId: number, itemNr: string, excludeId: number | undefined) {
  return db.items
    .where('projectId')
    .equals(projectId)
    .filter((candidate) => candidate.id !== excludeId && candidate.itemNr === itemNr)
    .first()
}

export type ItemSaveValidation =
  | { ok: true; normalizedItemNr: string; estimatedMinutes: number | undefined }
  | { ok: false }

export async function validateItemSave(
  projectId: number,
  itemNr: string,
  estimatedHours: string,
  excludeId: number | undefined
): Promise<ItemSaveValidation> {
  const normalizedItemNr = itemNr.trim()
  if (normalizedItemNr) {
    const duplicate = await findDuplicateItemNr(projectId, normalizedItemNr, excludeId)
    if (duplicate) return { ok: false }
  }
  return { ok: true, normalizedItemNr, estimatedMinutes: parseEstimatedMinutes(estimatedHours) }
}

export function createProjectIdChangeHandler(
  subProjects: SubProject[],
  subProjectId: number | '',
  setSubProjectId: (value: number | '') => void,
  setProjectId: (value: number | '') => void
) {
  return (value: number | '') => {
    setProjectId(value)
    const stillValid = subProjects.some((s) => s.id === subProjectId && s.projectId === value)
    if (!stillValid) setSubProjectId('')
  }
}
