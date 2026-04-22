function formatExpiry(value, fallbackLabel) {
  if (!value) {
    return fallbackLabel
  }

  return value.replace('T', ' ').replace('Z', ' UTC')
}

function getQuotaLabel(quota, locale) {
  if (quota.activeWindowLabel === 'week' && quota.secondaryUsedPercent !== null) {
    return locale === 'zh' ? `每周 ${quota.secondaryUsedPercent}%` : `Week ${quota.secondaryUsedPercent}%`
  }

  return locale === 'zh' ? `5 小时 ${quota.primaryUsedPercent}%` : `5h ${quota.primaryUsedPercent}%`
}

function getUsageTone(value) {
  if (value >= 85) {
    return {
      badge: 'border-rose-200/80 bg-rose-100/80 text-rose-700',
      progress: 'bg-rose-400',
    }
  }

  if (value >= 60) {
    return {
      badge: 'border-amber-200/80 bg-amber-100/80 text-amber-700',
      progress: 'bg-amber-400',
    }
  }

  return {
    badge: 'border-emerald-200/80 bg-emerald-100/80 text-emerald-700',
    progress: 'bg-emerald-400',
  }
}

export default function AccountCard({ account, copy, locale }) {
  const usageTone = getUsageTone(account.quota.primaryUsedPercent)
  const statusLabel = account.disabled ? copy.shared.disabled : copy.shared.enabled
  const statusClassName = account.disabled
    ? 'border-slate-200/80 bg-slate-100/80 text-slate-700'
    : 'border-emerald-200/80 bg-emerald-100/80 text-emerald-700'

  return (
    <article
      className="group overflow-hidden rounded-[28px] border border-white/45 bg-white/48 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.34)] backdrop-blur-2xl transition duration-200 hover:bg-white/56"
      data-testid="account-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-slate-500">{copy.account.card.node}</div>
          <h2 className="mt-3 truncate text-xl font-semibold tracking-tight text-slate-950">{account.name}</h2>
        </div>
        <span className={`inline-flex shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${statusClassName}`}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-5 rounded-[24px] border border-white/40 bg-white/34 p-4">
        <div className="mb-3 flex items-center justify-between gap-3 text-sm text-slate-500">
          <span>{copy.account.card.primaryQuota}</span>
          <span className={`rounded-full border px-2.5 py-1 text-xs ${usageTone.badge}`}>{account.quota.primaryUsedPercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
          <div className={`h-full rounded-full ${usageTone.progress}`} style={{ width: `${account.quota.primaryUsedPercent}%` }} />
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <div className="rounded-[24px] border border-white/35 bg-white/32 px-4 py-3.5">
          <div className="text-xs text-slate-500">{copy.account.card.status}</div>
          <div className="mt-2 text-sm font-medium text-slate-900">{statusLabel}</div>
        </div>
        <div className="rounded-[24px] border border-white/35 bg-white/32 px-4 py-3.5">
          <div className="text-xs text-slate-500">{copy.account.card.activeWindow}</div>
          <div className="mt-2 text-sm font-medium text-slate-900">{getQuotaLabel(account.quota, locale)}</div>
        </div>
        <div className="rounded-[24px] border border-white/35 bg-white/32 px-4 py-3.5">
          <div className="text-xs text-slate-500">{copy.account.card.tokenExpiry}</div>
          <div className="mt-2 break-words text-sm font-medium text-slate-900">{formatExpiry(account.expiresAt, copy.shared.noExpiry)}</div>
        </div>
      </div>
    </article>
  )
}
