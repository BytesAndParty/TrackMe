import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

function getEffectiveDark(theme: Theme): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) ?? 'system'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', getEffectiveDark(theme))
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => document.documentElement.classList.toggle('dark', mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  function cycleTheme() {
    setTheme((t) => {
      if (t === 'light') return 'dark'
      if (t === 'dark') return 'system'
      return 'light'
    })
  }

  return { theme, setTheme, cycleTheme, isDark: getEffectiveDark(theme) }
}
