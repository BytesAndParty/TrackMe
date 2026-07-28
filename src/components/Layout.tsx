import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useStoragePersistence } from '../hooks/useStoragePersistence'
import { useTranslation } from 'react-i18next'
import { useHotkey } from '@tanstack/react-hotkeys'
import ShortcutOverlay from './ShortcutOverlay'

const navItems = [
  { to: '/', key: 'layout.nav.day', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { to: '/items', key: 'layout.nav.items', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { to: '/todo', key: 'layout.nav.todo', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 11l2 2 4-4M9 17h6' },
  { to: '/projects', key: 'layout.nav.projects', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
  { to: '/data', key: 'layout.nav.data', icon: 'M4 4h16v16H4zM8 2v4m8-4v4M8 12h8m-8 4h5' },
]

const analyticsItems = [
  { to: '/week', key: 'layout.nav.week', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { to: '/month', key: 'layout.nav.month', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z' },
  { to: '/reports', key: 'layout.nav.reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
]

function TopNavLink({ to, end, icon, label }: { to: string; end?: boolean; icon: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? 'bg-white/15 text-white'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`
      }
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon} />
      </svg>
      <span className="hidden sm:inline">{label}</span>
    </NavLink>
  )
}

const themeIcons = {
  light: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  dark: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  ),
  system: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
}

export default function Layout() {
  const { theme, cycleTheme } = useTheme()
  const storageStatus = useStoragePersistence()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const nextLanguage = i18n.resolvedLanguage === 'en' ? 'de' : 'en'

  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const analyticsRef = useRef<HTMLDivElement>(null)
  const isAnalyticsActive = analyticsItems.some((item) => item.to === location.pathname)

  useHotkey('Mod+K', () => navigate('/projects'), { meta: { name: t('layout.nav.projects') } })

  // eslint-disable-next-line react-hooks/set-state-in-effect -- close dropdown on navigation
  useEffect(() => { setAnalyticsOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!analyticsOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (analyticsRef.current && !analyticsRef.current.contains(e.target as Node)) {
        setAnalyticsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [analyticsOpen])

  const themeLabels = {
    light: t('layout.theme.light'),
    dark: t('layout.theme.dark'),
    system: t('layout.theme.system'),
  }

  function toggleLanguage() {
    void i18n.changeLanguage(nextLanguage)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <header className="bg-slate-900 dark:bg-slate-800 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <span className="text-base font-bold tracking-tight">TrackMe</span>
            </div>
            <div className="flex items-center gap-1">
              <nav className="flex gap-0.5">
                {navItems.slice(0, 1).map((item) => (
                  <TopNavLink key={item.to} to={item.to} end={item.to === '/'} icon={item.icon} label={t(item.key)} />
                ))}

                <div className="relative" ref={analyticsRef}>
                  <button
                    type="button"
                    onClick={() => setAnalyticsOpen((v) => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isAnalyticsActive || analyticsOpen
                        ? 'bg-white/15 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="hidden sm:inline">{t('layout.nav.analytics')}</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${analyticsOpen ? 'rotate-180' : ''}`}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {analyticsOpen && (
                    <div className="absolute left-0 top-full mt-1 w-44 bg-slate-800 border border-white/10 rounded-lg shadow-lg py-1 z-50">
                      {analyticsItems.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={({ isActive }) =>
                            `flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                              isActive ? 'text-white bg-white/10' : 'text-slate-300 hover:text-white hover:bg-white/5'
                            }`
                          }
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d={item.icon} />
                          </svg>
                          {t(item.key)}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>

                {navItems.slice(1).map((item) => (
                  <TopNavLink key={item.to} to={item.to} icon={item.icon} label={t(item.key)} />
                ))}
              </nav>
              <div className="ml-2 border-l border-white/10 pl-2">
                <div className="flex items-center gap-1">
                  {storageStatus === 'persisted' && (
                    <span
                      className="flex items-center px-1.5 py-1.5 text-emerald-400"
                      title={t('storage.persisted')}
                      aria-label={t('storage.persisted')}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <polyline points="9 12 11 14 15 10" />
                      </svg>
                    </span>
                  )}
                  {storageStatus === 'best-effort' && (
                    <span
                      className="flex items-center px-1.5 py-1.5 text-amber-400"
                      title={t('storage.bestEffort')}
                      aria-label={t('storage.bestEffort')}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </span>
                  )}
                  <button
                    onClick={toggleLanguage}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs font-semibold tracking-wide"
                    title={t('layout.language.aria')}
                    aria-label={t('layout.language.aria')}
                  >
                    {i18n.resolvedLanguage === 'en' ? t('layout.language.en') : t('layout.language.de')}
                  </button>
                  <button
                    onClick={cycleTheme}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                    title={themeLabels[theme]}
                  >
                    {themeIcons[theme]}
                  </button>
                  <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                    title={t('layout.nav.settings')}
                    aria-label={t('layout.nav.settings')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                    </svg>
                  </NavLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>

      <ShortcutOverlay />
    </div>
  )
}
