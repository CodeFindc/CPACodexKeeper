import { NavLink, Outlet } from 'react-router-dom'
import { useLanguage } from '../i18n'

const NAV_ITEMS = [
  { id: 'status', key: 'nav.status', to: '/', icon: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z' },
  { id: 'account', key: 'nav.account', to: '/account', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-3.86 0-7 2.24-7 5v1h14v-1c0-2.76-3.14-5-7-5z' },
  { id: 'deleted', key: 'nav.deleted', to: '/deleted', icon: 'M9 3h6l1 2h4v2H4V5h4l1-2zm-3 6h12l-1 12H7L6 9zm3 2v8h2v-8H9zm4 0v8h2v-8h-2z' },
]

function topNavClass({ isActive }) {
  return [
    'group relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] transition-all duration-300',
    'border',
    isActive
      ? 'border-primary/40 bg-primary/10 text-primary shadow-hud'
      : 'border-zinc-200 bg-white text-zinc-700 hover:text-zinc-800 hover:border-zinc-300 hover:bg-zinc-100',
  ].join(' ')
}

function bottomNavClass({ isActive }) {
  return [
    'flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] transition',
    isActive ? 'bg-primary/10 text-primary shadow-hud' : 'text-zinc-700 hover:text-zinc-800',
  ].join(' ')
}

function NavIcon({ d }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
      <path d={d} />
    </svg>
  )
}

export default function StatusShell() {
  const { t, toggleLang } = useLanguage()

  return (
    <div className="relative min-h-screen overflow-x-hidden text-zinc-800">
      {/* ambient gradients */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 40% at 15% 0%, rgba(8,145,178,0.07), transparent 60%),' +
            'radial-gradient(50% 35% at 85% 0%, rgba(16,185,129,0.06), transparent 60%),' +
            'radial-gradient(60% 40% at 50% 110%, rgba(124,58,237,0.06), transparent 60%)',
        }}
      />

      {/* top frame */}
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="glass-panel mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl px-3 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-zinc-50/60">
              <span className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_70%)]" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-primary hud-pulse" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.32em] text-primary/80">
                <span className="hud-glow-primary">CODEX</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-700">v4.1</span>
              </div>
              <div className="mt-0.5 truncate font-display text-[15px] font-semibold tracking-tight text-zinc-900">
                CPACodexKeeper
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.id} to={item.to} end={item.to === '/'} className={topNavClass}>
                <NavIcon d={item.icon} />
                <span>{t(item.key)}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-hud-blink" />
              {t('shell.linkSecure')}
            </span>
            <span className="hud-mono hidden text-[10px] font-medium text-zinc-600 lg:inline">
              {t('shell.uplink')}
            </span>
            <button
              type="button"
              onClick={toggleLang}
              title={t('shell.langToggleHint')}
              aria-label={t('shell.langToggleHint')}
              className="hud-mono inline-flex h-8 min-w-[40px] items-center justify-center rounded-full border border-zinc-300 bg-white px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600 transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            >
              {t('shell.langToggle')}
            </button>
          </div>
        </div>
      </header>

      {/* main canvas */}
      <main className="relative z-[1] px-3 pb-32 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-12">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>

      {/* mobile bottom dock */}
      <div className="fixed inset-x-3 bottom-3 z-30 md:hidden">
        <div className="glass-panel rounded-2xl p-1.5">
          <div className="flex gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.id} to={item.to} end={item.to === '/'} className={bottomNavClass}>
                <NavIcon d={item.icon} />
                <span>{t(item.key)}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
