import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

function createNavItems(copy) {
  return [
    { label: copy.shell.navStatus, to: '/' },
    { label: copy.shell.navAccount, to: '/account' },
  ]
}

function getDesktopNavClassName({ isActive }) {
  return [
    'rounded-full border px-4 py-2.5 text-sm font-medium transition',
    isActive
      ? 'border-sky-300/45 bg-white/60 text-slate-900 shadow-[0_10px_25px_-18px_rgba(15,23,42,0.55)] backdrop-blur-xl'
      : 'border-white/35 bg-white/22 text-slate-700 hover:border-white/50 hover:bg-white/28',
  ].join(' ')
}

function getMobileNavClassName({ isActive }) {
  return [
    'flex-1 rounded-full px-4 py-3 text-center text-sm font-medium transition',
    isActive ? 'bg-white/70 text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/30 hover:text-slate-800',
  ].join(' ')
}

export default function StatusShell({ dictionaries }) {
  const [locale, setLocale] = useState(() => {
    if (typeof window === 'undefined') {
      return 'zh'
    }

    return window.localStorage.getItem('cpacodexkeeper-locale') ?? 'zh'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cpacodexkeeper-locale', locale)
      window.document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    }
  }, [locale])

  const copy = dictionaries[locale] ?? dictionaries.zh
  const navItems = useMemo(() => createNavItems(copy), [copy])

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-slate-900">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.72),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(191,219,254,0.7),_transparent_30%),radial-gradient(circle_at_50%_110%,_rgba(196,181,253,0.34),_transparent_34%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.35),rgba(255,255,255,0.08))]" />

      <header className="sticky top-0 z-20 px-4 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-[28px] border border-white/45 bg-white/46 px-4 py-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] backdrop-blur-2xl sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/55 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(191,219,254,0.65))] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <div className="h-3 w-3 rounded-full bg-sky-400 shadow-[0_0_0_6px_rgba(186,230,253,0.35)]" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold tracking-tight text-slate-900">{copy.shell.productName}</div>
              <div className="mt-0.5 truncate text-sm text-slate-500">{copy.shell.productSubtitle}</div>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <nav className="flex items-center gap-2 rounded-full border border-white/35 bg-white/18 p-1.5 backdrop-blur-xl">
              {navItems.map((item) => (
                <NavLink key={item.label} to={item.to} end={item.to === '/'} className={getDesktopNavClassName}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-1 rounded-full border border-white/35 bg-white/20 p-1.5 backdrop-blur-xl">
              <button
                type="button"
                className={`rounded-full px-3 py-2 text-sm font-medium transition ${locale === 'zh' ? 'bg-white/75 text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                onClick={() => setLocale('zh')}
              >
                {copy.languageToggle.zh}
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-2 text-sm font-medium transition ${locale === 'en' ? 'bg-white/75 text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                onClick={() => setLocale('en')}
              >
                {copy.languageToggle.en}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-[1] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-12">
        <div className="mx-auto max-w-7xl">
          <Outlet context={{ copy, locale }} />
        </div>
      </main>

      <div className="fixed bottom-4 left-4 right-4 z-20 space-y-3 md:hidden">
        <div className="rounded-[26px] border border-white/40 bg-white/46 p-2 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] backdrop-blur-2xl">
          <div className="flex gap-2">
            {navItems.map((item) => (
              <NavLink key={item.label} to={item.to} end={item.to === '/'} className={getMobileNavClassName}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="rounded-[26px] border border-white/40 bg-white/46 p-2 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] backdrop-blur-2xl">
          <div className="flex gap-2">
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-3 text-sm font-medium transition ${locale === 'zh' ? 'bg-white/75 text-slate-900 shadow-sm' : 'text-slate-600'}`}
              onClick={() => setLocale('zh')}
            >
              {copy.languageToggle.zh}
            </button>
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-3 text-sm font-medium transition ${locale === 'en' ? 'bg-white/75 text-slate-900 shadow-sm' : 'text-slate-600'}`}
              onClick={() => setLocale('en')}
            >
              {copy.languageToggle.en}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
