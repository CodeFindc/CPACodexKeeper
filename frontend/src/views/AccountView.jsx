import { useCallback, useEffect, useMemo, useState } from 'react'
import AccountCard from '../components/AccountCard'
import { useT } from '../i18n'
import { accountPageSizeOptions, normalizeAccountPayload } from '../lib/accountContract'

function GlassCard({ className = '', children }) {
  return <div className={`glass-panel rounded-2xl ${className}`}>{children}</div>
}

const initialState = { status: 'loading', accounts: [], error: null }

export default function AccountView() {
  const t = useT()
  const [pageSize, setPageSize] = useState(12)
  const [pageIndex, setPageIndex] = useState(0)
  const [state, setState] = useState(initialState)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadAccounts = useCallback(async (signal) => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/accounts.json', signal ? { signal } : undefined)
      const payload = await response.json()
      if (!signal || !signal.aborted) {
        setState({ status: 'ready', accounts: normalizeAccountPayload(payload), error: null })
      }
    } catch (error) {
      if (!signal || !signal.aborted) {
        setState({ status: 'error', accounts: [], error: error instanceof Error ? error.message : 'Request failed' })
      }
    } finally {
      if (!signal || !signal.aborted) {
        setIsRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadAccounts(controller.signal)
    return () => controller.abort()
  }, [loadAccounts])

  const totalAccounts = state.accounts.length
  const totalPages = Math.max(1, Math.ceil(totalAccounts / pageSize))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)

  const { visibleAccounts, rangeStart, rangeEnd, disabledCount, enabledCount } = useMemo(() => {
    const start = safePageIndex * pageSize
    const slice = state.accounts.slice(start, start + pageSize)
    return {
      visibleAccounts: slice,
      rangeStart: totalAccounts === 0 ? 0 : start + 1,
      rangeEnd: totalAccounts === 0 ? 0 : start + slice.length,
      disabledCount: state.accounts.filter((a) => a.disabled).length,
      enabledCount: state.accounts.filter((a) => !a.disabled).length,
    }
  }, [pageSize, safePageIndex, totalAccounts, state.accounts])

  function handlePageSizeChange(event) {
    setPageSize(Number(event.target.value))
    setPageIndex(0)
  }

  function goToPreviousPage() {
    setPageIndex((current) => Math.max(current - 1, 0))
  }

  function goToNextPage() {
    setPageIndex((current) => Math.min(current + 1, totalPages - 1))
  }

  if (state.status === 'loading') {
    return (
      <GlassCard className="flex items-center gap-3 p-8 text-sm text-zinc-600">
        <span className="h-2 w-2 rounded-full bg-primary hud-pulse" />
        <span className="hud-mono uppercase tracking-[0.28em] text-zinc-600">Booting account feed...</span>
      </GlassCard>
    )
  }

  if (state.status === 'error') {
    return (
      <GlassCard className="border border-danger/40 p-8 text-sm text-danger hud-mono uppercase tracking-[0.2em]">
        ERROR · {state.error}
      </GlassCard>
    )
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* hero */}
      <GlassCard className="overflow-hidden">
        <div className="relative px-5 py-6 sm:px-8 sm:py-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(60% 70% at 100% 0%, rgba(124,58,237,0.08), transparent 60%),' +
                'radial-gradient(40% 60% at 0% 100%, rgba(8,145,178,0.07), transparent 60%)',
            }}
          />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="hud-mono inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 uppercase tracking-[0.28em] text-primary shadow-hud">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-hud-blink" />
                {t('account.channelOnline')}
              </span>
              <span className="hud-mono inline-flex rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 uppercase tracking-[0.28em] text-zinc-600">
                {t('account.nodes', { count: totalAccounts })}
              </span>
              <span className="hud-mono ml-auto inline-flex rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 uppercase tracking-[0.28em] text-secondary hud-glow-secondary">
                {t('account.statusOverview')}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="glass-tile rounded-2xl p-4">
                <div className="hud-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-600">{t('account.enabledNodes')}</div>
                <div className="mt-2 font-display text-3xl font-semibold tracking-tight text-primary hud-glow-primary">{enabledCount}</div>
                <div className="mt-1 text-xs leading-5 text-zinc-600">{t('account.routableHint')}</div>
              </div>
              <div className="glass-tile rounded-2xl p-4">
                <div className="hud-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-600">{t('account.disabledNodes')}</div>
                <div className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-800">{disabledCount}</div>
                <div className="mt-1 text-xs leading-5 text-zinc-600">{t('account.heldHint')}</div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* account grid · full width */}
      <section>
        <GlassCard>
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-hud" />
              <h2 className="hud-mono text-[11px] font-semibold uppercase tracking-[0.32em] text-zinc-700">{t('account.accountGrid')}</h2>
            </div>
            <span className="hud-mono inline-flex rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-secondary">
              {t('account.visible', { count: visibleAccounts.length })}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 px-5 py-5 sm:px-6 sm:py-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {visibleAccounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </GlassCard>
      </section>

      {/* footer · stacked vertically: account info on top, pagination + refresh below */}
      <GlassCard className="px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-y-3">
          {/* row 1 · account info */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="hud-mono inline-flex rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 uppercase tracking-[0.22em] text-zinc-600">
              {t('account.viewAccount')}
            </span>
            <span className="hud-mono inline-flex rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 uppercase tracking-[0.22em] text-zinc-600">
              {t('account.modeLive')}
            </span>
            <span className="hud-mono inline-flex rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 uppercase tracking-[0.22em] text-zinc-600">
              {t('account.visiblePill', { count: visibleAccounts.length })}
            </span>
            <span className="hud-mono inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 uppercase tracking-[0.22em] text-primary">
              {t('account.nodesPill', { count: totalAccounts })}
            </span>
          </div>

          {/* row 2 · pagination + page size + refresh */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-zinc-200 pt-3">
            {/* left · status pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="hud-mono inline-flex rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-zinc-600">
                {t('account.range', { start: rangeStart, end: rangeEnd, total: totalAccounts })}
              </span>
              <span className="hud-mono inline-flex rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
                {t('account.page', { current: safePageIndex + 1, total: totalPages })}
              </span>
            </div>

            {/* right · controls (prev / next / page size / refresh) */}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="glass-tile inline-flex items-center gap-1 rounded-full p-1">
                <button
                  type="button"
                  aria-label="Previous page"
                  title="Previous page"
                  onClick={goToPreviousPage}
                  disabled={safePageIndex === 0}
                  className="hud-mono inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-sm text-zinc-700 transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-zinc-600"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Next page"
                  title="Next page"
                  onClick={goToNextPage}
                  disabled={safePageIndex >= totalPages - 1}
                  className="hud-mono inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-sm text-zinc-700 transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-zinc-600"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>

              <label className="hud-mono inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-zinc-600 transition hover:border-primary/40 hover:text-primary">
                <span>{t('account.pageSize')}</span>
                <select
                  aria-label="Page size"
                  className="rounded-md border border-zinc-300 bg-white px-1.5 py-0.5 text-xs font-semibold text-zinc-800 outline-none transition focus:border-primary/50 focus:shadow-hud"
                  value={pageSize}
                  onChange={handlePageSizeChange}
                >
                  {accountPageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                aria-label="Reload accounts"
                title="Reload accounts"
                onClick={() => loadAccounts()}
                disabled={isRefreshing}
                className="hud-mono inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm text-primary shadow-hud transition hover:border-primary/60 hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                >
                  <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-7.7-4.4" />
                  <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 7.7 4.4" />
                  <path d="M21 3v5h-5" />
                  <path d="M3 21v-5h5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
