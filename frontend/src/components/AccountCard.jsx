function formatExpiry(value) {
  if (!value) {
    return 'NO_EXPIRY'
  }

  return value.replace('T', ' ').replace('Z', ' UTC')
}

function getQuotaLabel(quota) {
  if (quota.activeWindowLabel === 'week' && quota.secondaryUsedPercent !== null) {
    return `WEEK ${quota.secondaryUsedPercent}%`
  }

  return `5H ${quota.primaryUsedPercent}%`
}

export default function AccountCard({ account }) {
  return (
    <article className="rounded-sm border border-primary/20 bg-surface p-5 shadow-hud" data-testid="account-card">
      <div className="flex items-start justify-between gap-4 border-b border-primary/10 pb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-muted">ACCOUNT NODE</div>
          <h2 className="mt-3 text-lg font-semibold uppercase tracking-[0.18em] text-primary">{account.name}</h2>
        </div>
        <span className="border border-primary/20 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-muted">
          {account.disabled ? 'DISABLED' : 'ENABLED'}
        </span>
      </div>

      <div className="mt-4 space-y-3 text-[11px] uppercase tracking-[0.22em] text-muted">
        <div className="flex items-center justify-between border border-primary/10 px-3 py-3">
          <span>STATUS</span>
          <span className="text-primary">{account.disabled ? 'DISABLED' : 'ENABLED'}</span>
        </div>
        <div className="flex items-center justify-between border border-primary/10 px-3 py-3">
          <span>PRIMARY QUOTA</span>
          <span className="text-primary">{account.quota.primaryUsedPercent}%</span>
        </div>
        <div className="flex items-center justify-between border border-primary/10 px-3 py-3">
          <span>ACTIVE WINDOW</span>
          <span className="text-primary">{getQuotaLabel(account.quota)}</span>
        </div>
        <div className="flex items-center justify-between border border-primary/10 px-3 py-3">
          <span>TOKEN EXPIRY</span>
          <span className="text-primary">{formatExpiry(account.expiresAt)}</span>
        </div>
      </div>
    </article>
  )
}
