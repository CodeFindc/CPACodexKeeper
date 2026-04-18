import { useEffect, useMemo, useState } from 'react'
import AccountCard from '../components/AccountCard'
import { accountPageSizeOptions, normalizeAccountPayload } from '../lib/accountContract'

const initialState = {
  status: 'loading',
  accounts: [],
  error: null,
}

export default function AccountView() {
  const [pageSize, setPageSize] = useState(12)
  const [pageIndex, setPageIndex] = useState(0)
  const [state, setState] = useState(initialState)

  useEffect(() => {
    let cancelled = false

    async function loadAccounts() {
      try {
        const response = await fetch('/api/accounts.json')
        const payload = await response.json()
        if (!cancelled) {
          setState({ status: 'ready', accounts: normalizeAccountPayload(payload), error: null })
        }
      } catch (error) {
        if (!cancelled) {
          setState({ status: 'error', accounts: [], error: error instanceof Error ? error.message : 'Request failed' })
        }
      }
    }

    loadAccounts()
    return () => {
      cancelled = true
    }
  }, [])

  const totalAccounts = state.accounts.length
  const totalPages = Math.max(1, Math.ceil(totalAccounts / pageSize))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)

  const { visibleAccounts, rangeStart, rangeEnd } = useMemo(() => {
    const start = safePageIndex * pageSize
    const visibleSlice = state.accounts.slice(start, start + pageSize)

    return {
      visibleAccounts: visibleSlice,
      rangeStart: totalAccounts === 0 ? 0 : start + 1,
      rangeEnd: totalAccounts === 0 ? 0 : start + visibleSlice.length,
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
    return <div className="p-8 text-sm uppercase tracking-[0.2em] text-primary">Loading accounts...</div>
  }

  if (state.status === 'error') {
    return <div className="p-8 text-sm uppercase tracking-[0.2em] text-danger">{state.error}</div>
  }

  return (
    <div className="space-y-8">
      <section className="border-l-4 border-primary pl-6">
        <div className="mb-3 flex items-center gap-3 text-[11px] uppercase tracking-[0.34em] text-primary">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(0,255,65,0.9)]" />
          Account Channel Online
        </div>
        <h1 className="font-display text-4xl font-black uppercase tracking-tight md:text-6xl">Account status overview</h1>
        <div className="mt-4 max-w-3xl text-sm uppercase tracking-[0.22em] text-muted">
          Unified account monitoring surface for operator health, routing visibility, and fleet readiness.
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="rounded-sm border border-primary/20 bg-surface p-6 shadow-hud">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-primary/10 pb-4 text-[10px] uppercase tracking-[0.26em] text-muted">
            <span>ACCOUNT GRID</span>
            <span className="text-primary">{totalAccounts} TOTAL NODES</span>
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border border-primary/15 bg-surface-strong/30 px-4 py-4 text-[11px] uppercase tracking-[0.22em] text-muted">
            <div className="space-y-2">
              <div>
                RANGE {rangeStart}-{rangeEnd} / {totalAccounts}
              </div>
              <div>
                PAGE {safePageIndex + 1} / {totalPages}
              </div>
            </div>

            <label className="flex items-center gap-3">
              <span>PAGE SIZE</span>
              <select
                aria-label="Page size"
                className="border border-primary/20 bg-surface px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-primary outline-none"
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
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visibleAccounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-sm border border-primary/20 bg-surface shadow-hud">
            <div className="flex items-center justify-between border-b border-primary/20 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">PAGE CONTROL</h2>
              </div>
              <span className="text-[10px] uppercase tracking-[0.24em] text-muted">ACCOUNT_NODE</span>
            </div>
            <div className="space-y-4 px-5 py-5 text-[11px] uppercase tracking-[0.24em] text-muted">
              <button
                type="button"
                className="flex w-full items-center justify-between border border-primary/10 px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-40"
                onClick={goToPreviousPage}
                disabled={safePageIndex === 0}
              >
                <span>Previous</span>
                <span className="text-primary">PAGE_BACK</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between border border-primary/10 px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-40"
                onClick={goToNextPage}
                disabled={safePageIndex >= totalPages - 1}
              >
                <span>Next</span>
                <span className="text-primary">PAGE_FORWARD</span>
              </button>
              <div className="border border-primary/10 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span>DEFAULT CAPACITY</span>
                  <span className="text-primary">12</span>
                </div>
              </div>
              <div className="border border-primary/10 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span>GRID RHYTHM</span>
                  <span className="text-primary">4*N</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-primary/20 bg-surface p-5 shadow-hud text-[11px] uppercase tracking-[0.22em] text-muted">
            <div className="flex items-center justify-between border-b border-primary/10 pb-4">
              <span>LIVE SIGNAL</span>
              <span className="text-primary">HUD_SYNC_STABLE</span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between border border-primary/10 px-3 py-3">
                <span>ENABLED SURFACE</span>
                <span className="text-primary">NAME_ONLY</span>
              </div>
              <div className="flex items-center justify-between border border-primary/10 px-3 py-3">
                <span>QUOTA TRACKING</span>
                <span className="text-primary">PRIMARY + ACTIVE WINDOW</span>
              </div>
              <div className="flex items-center justify-between border border-primary/10 px-3 py-3">
                <span>TOKEN VALIDITY</span>
                <span className="text-primary">LIVE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-primary/10 pt-4 text-[11px] uppercase tracking-[0.24em] text-muted">
        <div className="flex flex-wrap gap-6">
          <span>VIEW: ACCOUNT</span>
          <span>MODE: LIVE_OVERVIEW</span>
          <span>VISIBLE: {visibleAccounts.length}</span>
        </div>
        <div className="flex items-center gap-4 text-primary/70">
          <span>ACCOUNT_CHANNEL_READY</span>
          <span>HUD_SYNC_STABLE</span>
        </div>
      </footer>
    </div>
  )
}
