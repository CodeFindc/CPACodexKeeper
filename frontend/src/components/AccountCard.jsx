function formatExpiry(value) {
  if (!value) return 'NO EXPIRY'
  return value.replace('T', ' ').replace('Z', ' UTC')
}

function getQuotaLabel(quota) {
  if (quota.activeWindowLabel === 'week' && quota.secondaryUsedPercent !== null) {
    return `WEEK · ${quota.secondaryUsedPercent}%`
  }
  return `5H · ${quota.primaryUsedPercent}%`
}

function getUsageTone(value) {
  if (value >= 85) {
    return { badge: 'border-danger/40 bg-danger/10 text-danger', bar: 'bg-gradient-to-r from-danger to-rose-300', glow: 'shadow-[0_0_20px_rgba(255,93,108,0.25)]' }
  }
  if (value >= 60) {
    return { badge: 'border-warn/40 bg-warn/10 text-warn', bar: 'bg-gradient-to-r from-warn to-yellow-300', glow: '' }
  }
  return { badge: 'border-primary/40 bg-primary/10 text-primary', bar: 'bg-gradient-to-r from-primary to-secondary', glow: 'shadow-hud' }
}

export default function AccountCard({ account }) {
  const tone = getUsageTone(account.quota.primaryUsedPercent)
  const statusLabel = account.disabled ? 'DISABLED' : 'ENABLED'
  const statusClass = account.disabled
    ? 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300'
    : 'border-primary/40 bg-primary/10 text-primary shadow-hud'

  return (
    <article
      data-testid="account-card"
      className="group relative overflow-hidden rounded-2xl glass-panel p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-hud"
    >
      {/* corner ticks */}
      <span className="pointer-events-none absolute left-2 top-2 h-2 w-2 border-l border-t border-primary/40" />
      <span className="pointer-events-none absolute right-2 top-2 h-2 w-2 border-r border-t border-primary/40" />
      <span className="pointer-events-none absolute bottom-2 left-2 h-2 w-2 border-b border-l border-primary/40" />
      <span className="pointer-events-none absolute bottom-2 right-2 h-2 w-2 border-b border-r border-primary/40" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="hud-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">NODE</div>
          <h2 className="mt-2 truncate font-display text-lg font-semibold tracking-tight text-zinc-50">{account.name}</h2>
        </div>
        <span className={`hud-mono inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className={`mt-4 glass-tile rounded-xl p-3.5 ${tone.glow}`}>
        <div className="mb-2 flex items-center justify-between">
          <span className="hud-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-400">PRIMARY QUOTA</span>
          <span className={`hud-mono inline-flex rounded-full border px-2 py-0.5 text-[10px] tracking-[0.18em] ${tone.badge}`}>
            {account.quota.primaryUsedPercent}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${account.quota.primaryUsedPercent}%` }} />
        </div>
      </div>

      <dl className="mt-4 grid gap-2.5">
        <div className="glass-tile rounded-xl px-3.5 py-3">
          <dt className="hud-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-500">ACTIVE WINDOW</dt>
          <dd className="mt-1.5 hud-mono text-sm font-medium text-zinc-100">{getQuotaLabel(account.quota)}</dd>
        </div>
        <div className="glass-tile rounded-xl px-3.5 py-3">
          <dt className="hud-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-500">TOKEN EXPIRY</dt>
          <dd className="mt-1.5 hud-mono break-words text-xs font-medium text-zinc-100">{formatExpiry(account.expiresAt)}</dd>
        </div>
      </dl>
    </article>
  )
}
