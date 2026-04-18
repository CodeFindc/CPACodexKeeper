import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { label: 'STATUS', to: '/' },
  { label: 'ACCOUNT', to: '/account' },
]

function getDesktopNavClassName({ isActive }) {
  return isActive ? 'border-b-2 border-primary pb-1 text-primary' : 'text-muted'
}

function getMobileNavClassName({ isActive }) {
  return `flex-1 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.24em] ${
    isActive ? 'border-t-2 border-primary bg-primary/10 text-primary' : 'text-muted'
  }`
}

export default function StatusShell() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,255,65,0.12),_transparent_38%),linear-gradient(rgba(0,255,65,0.03)_1px,transparent_1px)] bg-[length:100%_100%,100%_3px]" />

      <header className="sticky top-0 z-10 border-b border-primary/20 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_rgba(0,255,65,0.8)]" />
            <div>
              <div className="font-display text-lg font-bold uppercase tracking-[0.18em] text-primary">SYSTEM_OPERATOR_V4.01</div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-muted">CORE STATUS CONSOLE</div>
            </div>
          </div>

          <nav className="hidden gap-5 text-xs font-semibold uppercase tracking-[0.24em] md:flex">
            {navItems.map((item) => (
              <NavLink key={item.label} to={item.to} end={item.to === '/'} className={getDesktopNavClassName}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative z-[1] px-6 pb-24 pt-10">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-primary/20 bg-background/90 backdrop-blur md:hidden">
        {navItems.map((item) => (
          <NavLink key={item.label} to={item.to} end={item.to === '/'} className={getMobileNavClassName}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
