import { useCallback, useEffect, useState } from 'react'
import { db } from '../db'

const SETTINGS_KEY = 'backupDirectoryHandle'

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export async function ensureBackupFolderPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const descriptor = { mode: 'readwrite' as const }
  if ((await handle.queryPermission(descriptor)) === 'granted') return true
  return (await handle.requestPermission(descriptor)) === 'granted'
}

export async function writeBackupToFolder(handle: FileSystemDirectoryHandle, fileName: string, content: string): Promise<void> {
  const fileHandle = await handle.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

export function useBackupFolder() {
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void db.settings.get(SETTINGS_KEY).then((entry) => {
      if (cancelled) return
      setHandle((entry?.value as FileSystemDirectoryHandle | undefined) ?? null)
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  const chooseFolder = useCallback(async () => {
    const picked = await window.showDirectoryPicker({ mode: 'readwrite' })
    await db.settings.put({ key: SETTINGS_KEY, value: picked })
    setHandle(picked)
    return picked
  }, [])

  const clearFolder = useCallback(async () => {
    await db.settings.delete(SETTINGS_KEY)
    setHandle(null)
  }, [])

  return { handle, loaded, chooseFolder, clearFolder }
}
