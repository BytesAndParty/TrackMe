import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const DISMISSED_KEY = 'trackme-onboarding-dismissed'

interface WelcomeBannerProps {
  projectCount: number
  itemCount: number
  entryCount: number
}

export default function WelcomeBanner({ projectCount, itemCount, entryCount }: WelcomeBannerProps) {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1',
  )

  const allDone = projectCount > 0 && itemCount > 0 && entryCount > 0
  if (dismissed || allDone) return null

  const steps = [
    {
      done: projectCount > 0,
      title: t('welcome.step1Title'),
      desc: t('welcome.step1Desc'),
      action: t('welcome.step1Action'),
      doneLabel: t('welcome.step1Done'),
      to: '/projects',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      done: itemCount > 0,
      title: t('welcome.step2Title'),
      desc: t('welcome.step2Desc'),
      action: t('welcome.step2Action'),
      doneLabel: t('welcome.step2Done'),
      to: '/items',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      done: entryCount > 0,
      title: t('welcome.step3Title'),
      desc: t('welcome.step3Desc'),
      doneLabel: t('welcome.step3Done'),
      to: undefined,
      action: undefined,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ]

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{t('welcome.title')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('welcome.subtitle')}</p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          {t('welcome.dismiss')}
        </button>
      </div>

      <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`rounded-lg border p-4 flex flex-col gap-3 transition-colors ${
              step.done
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`${step.done ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`}>
                {step.done ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                ) : (
                  step.icon
                )}
              </div>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                {i + 1}/3
              </span>
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-semibold">{step.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
            </div>

            {step.done ? (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {step.doneLabel}
              </span>
            ) : step.to ? (
              <Link
                to={step.to}
                className="inline-flex items-center justify-center text-xs font-medium px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
              >
                {step.action}
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
