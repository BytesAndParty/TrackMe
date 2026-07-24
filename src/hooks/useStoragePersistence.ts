import { useState, useEffect } from 'react'

export type StoragePersistenceStatus = 'unknown' | 'persisted' | 'best-effort' | 'unsupported'

/**
 * Requests persistent storage on mount so the browser does not evict the
 * IndexedDB database under storage pressure. Returns the resulting status.
 * - 'persisted'    → data is protected from automatic eviction
 * - 'best-effort'  → request denied, browser may evict under pressure
 * - 'unsupported'  → Storage API not available
 */
export function useStoragePersistence(): StoragePersistenceStatus {
  const [status, setStatus] = useState<StoragePersistenceStatus>('unknown')

  useEffect(() => {
    let cancelled = false

    async function ensurePersistence() {
      if (!navigator.storage?.persist || !navigator.storage.persisted) {
        if (!cancelled) setStatus('unsupported')
        return
      }
      try {
        const granted = (await navigator.storage.persisted()) || (await navigator.storage.persist())
        if (!cancelled) setStatus(granted ? 'persisted' : 'best-effort')
      } catch {
        if (!cancelled) setStatus('unsupported')
      }
    }

    void ensurePersistence()
    return () => { cancelled = true }
  }, [])

  return status
}
