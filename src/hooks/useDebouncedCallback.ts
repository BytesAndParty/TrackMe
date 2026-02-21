import { useCallback, useEffect, useRef } from 'react'

export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delayMs: number
) {
  const callbackRef = useRef(callback)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const cancel = useCallback(() => {
    if (!timerRef.current) return
    clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const debounced = useCallback((...args: Parameters<T>) => {
    cancel()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      callbackRef.current(...args)
    }, delayMs)
  }, [cancel, delayMs])

  useEffect(() => cancel, [cancel])

  return {
    debounced,
    cancel,
  }
}
