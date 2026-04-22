import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import AccountCard from '../components/AccountCard'
import { accountPageSizeOptions, normalizeAccountPayload } from '../lib/accountContract'

function GlassCard({ className = '', children }) {
  return (
    <div className={`rounded-[28px] border border-white/45 bg-white/48 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.34)] backdrop-blur-2xl ${className}`}>
      {children}
    </div>
  )
}

const initialState = {
  status: 'loading',
  accounts: [],
  error: null,
}

export default function AccountView() {
  const [pageSize, setPageSize] = useState(12)
  const [pageIndex, setPageIndex] = useState(0)
  const [state, setState] = useState(initialState)
  const { copy, locale } = useOutletContext()

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

  const { visibleAccounts, rangeStart, rangeEnd, disabledCount, enabledCount } = useMemo(() => {
    const start = safePageIndex * pageSize
    const visibleSlice = state.accounts.slice(start, start + pageSize)

    return {
      visibleAccounts: visibleSlice,
      rangeStart: totalAccounts === 0 ? 0 : start + 1,
      rangeEnd: totalAccounts === 0 ? 0 : start + visibleSlice.length,
      disabledCount: state.accounts.filter((account) => account.disabled).length,
      enabledCount: state.accounts.filter((account) => !account.disabled).length,
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
    return <GlassCard className="p-8 text-sm text-slate-700">{copy.shared.loadingAccounts}</GlassCard>
  }

  if (state.status === 'error') {
    return <GlassCard className="border-rose-200/80 bg-rose-100/70 p-8 text-sm text-rose-700">{state.error}</GlassCard>
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <GlassCard className="overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/62 px-3 py-1.5 text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_0_5px_rgba(186,230,253,0.45)]" />
            {copy.account.online}
          </span>
          <span className="inline-flex rounded-full border border-white/45 bg-white/58 px-3 py-1.5 text-sm text-slate-700">
            {copy.account.totalNodes}: {totalAccounts}
          </span>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)] xl:items-start">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">{copy.account.title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">{copy.account.description}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full border border-white/45 bg-white/58 px-3 py-2">{copy.account.range}: {rangeStart}-{rangeEnd}</span>
              <span className="rounded-full border border-white/45 bg-white/58 px-3 py-2">{copy.account.page}: {safePageIndex + 1}/{totalPages}</span>
              <span className="rounded-full border border-white/45 bg-white/58 px-3 py-2">{copy.account.pageSize}: {pageSize}</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[28px] border border-white/40 bg-white/40 p-5 backdrop-blur-2xl">
              <div className="text-xs text-slate-500">{copy.account.enabledNodes}</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-emerald-700">{enabledCount}</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">{copy.account.enabledDescription}</div>
            </div>
            <div className="rounded-[28px] border border-white/40 bg-white/40 p-5 backdrop-blur-2xl">
              <div className="text-xs text-slate-500">{copy.account.disabledNodes}</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{disabledCount}</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">{copy.account.disabledDescription}</div>
            </div>
          </div>
        </div>
      </GlassCard>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)] xl:items-start">
        <div className="space-y-6">
          <GlassCard className="p-6 sm:p-7">
            <div className="flex flex-col gap-5 border-b border-white/40 pb-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">{copy.account.gridTitle}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{copy.account.gridDescription}</p>
              </div>
              <span className="inline-flex rounded-full border border-white/45 bg-white/58 px-3 py-2 text-sm text-slate-700">
                {copy.account.visible}: {visibleAccounts.length}
              </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/38 bg-white/34 px-4 py-4">
                  <div className="text-xs text-slate-500">{copy.account.range}</div>
                  <div className="mt-2 text-sm font-medium text-slate-900">{rangeStart}-{rangeEnd} / {totalAccounts}</div>
                </div>
                <div className="rounded-[24px] border border-white/38 bg-white/34 px-4 py-4">
                  <div className="text-xs text-slate-500">{copy.account.page}</div>
                  <div className="mt-2 text-sm font-medium text-slate-900">{safePageIndex + 1} / {totalPages}</div>
                </div>
                <label className="rounded-[24px] border border-white/38 bg-white/34 px-4 py-4">
                  <div className="text-xs text-slate-500">{copy.account.pageSize}</div>
                  <select
                    aria-label={copy.account.pageSize}
                    className="mt-2 w-full rounded-2xl border border-white/45 bg-white/72 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-300/70"
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

              <div className="rounded-[28px] border border-white/38 bg-white/34 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className="flex items-center justify-between rounded-[22px] border border-white/45 bg-white/66 px-4 py-4 text-left text-sm text-slate-900 transition hover:bg-white/78 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={goToPreviousPage}
                    disabled={safePageIndex === 0}
                  >
                    <span>{copy.shared.previous}</span>
                    <span className="text-xs text-slate-500">←</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-between rounded-[22px] border border-white/45 bg-white/66 px-4 py-4 text-left text-sm text-slate-900 transition hover:bg-white/78 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={goToNextPage}
                    disabled={safePageIndex >= totalPages - 1}
                  >
                    <span>{copy.shared.next}</span>
                    <span className="text-xs text-slate-500">→</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {visibleAccounts.map((account) => (
                <AccountCard key={account.id} account={account} copy={copy} locale={locale} />
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">{copy.account.controlsTitle}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{copy.account.controlsDescription}</p>
              </div>
              <span className="rounded-full border border-white/45 bg-white/56 px-2.5 py-1 text-xs text-slate-700">{copy.account.controlBadge}</span>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-[24px] border border-white/38 bg-white/34 px-4 py-4">
                <div className="text-xs text-slate-500">{copy.account.defaultCapacity}</div>
                <div className="mt-2 text-sm font-medium text-slate-900">12</div>
              </div>
              <div className="rounded-[24px] border border-white/38 bg-white/34 px-4 py-4">
                <div className="text-xs text-slate-500">{copy.account.gridRhythm}</div>
                <div className="mt-2 text-sm font-medium text-slate-900">4*N</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between gap-3 border-b border-white/40 pb-4">
              <span className="text-sm text-slate-600">{copy.account.liveTitle}</span>
              <span className="rounded-full border border-white/45 bg-white/56 px-2.5 py-1 text-xs text-slate-700">{copy.account.liveBadge}</span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-[24px] border border-white/38 bg-white/34 px-4 py-4">
                <div className="text-xs text-slate-500">{copy.account.liveEnabledSurface}</div>
                <div className="mt-2 text-sm font-medium text-slate-900">{copy.account.liveEnabledSurfaceValue}</div>
              </div>
              <div className="rounded-[24px] border border-white/38 bg-white/34 px-4 py-4">
                <div className="text-xs text-slate-500">{copy.account.liveQuotaTracking}</div>
                <div className="mt-2 text-sm font-medium text-slate-900">{copy.account.liveQuotaTrackingValue}</div>
              </div>
              <div className="rounded-[24px] border border-white/38 bg-white/34 px-4 py-4">
                <div className="text-xs text-slate-500">{copy.account.liveTokenValidity}</div>
                <div className="mt-2 text-sm font-medium text-slate-900">{copy.account.liveTokenValidityValue}</div>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      <GlassCard className="px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="rounded-full border border-white/45 bg-white/56 px-3 py-2">{copy.account.footerView}: {copy.account.footerViewValue}</span>
            <span className="rounded-full border border-white/45 bg-white/56 px-3 py-2">{copy.account.footerMode}: {copy.account.footerModeValue}</span>
            <span className="rounded-full border border-white/45 bg-white/56 px-3 py-2">{copy.account.footerVisible}: {visibleAccounts.length}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="rounded-full border border-white/45 bg-white/56 px-3 py-2">{copy.account.footerReady}</span>
            <span className="rounded-full border border-white/45 bg-white/56 px-3 py-2">{copy.account.footerStable}</span>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
