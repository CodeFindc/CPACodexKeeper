import { useCallback, useEffect, useMemo, useState } from 'react'
import { useT } from '../i18n'
import { normalizeDeletedAccountPayload } from '../lib/deletedAccountContract'

function GlassCard({ className = '', children }) {
  return <div className={`glass-panel rounded-2xl ${className}`}>{children}</div>
}

const initialState = { status: 'loading', records: [], error: null }

function formatTimestamp(value) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString()
}

export default function DeletedAccountsView() {
  const t = useT()
  const [state, setState] = useState(initialState)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const load = useCallback(async (signal) => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/deleted-accounts.json', signal ? { signal } : undefined)
      const payload = await response.json()
      if (!signal || !signal.aborted) {
        setState({ status: 'ready', records: normalizeDeletedAccountPayload(payload), error: null })
      }
    } catch (error) {
      if (!signal || !signal.aborted) {
        setState({
          status: 'error',
          records: [],
          error: error instanceof Error ? error.message : 'Request failed',
        })
      }
    } finally {
      if (!signal || !signal.aborted) {
        setIsRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const totalRecords = state.records.length
  const latestAt = useMemo(() => state.records[0]?.deletedAt ?? null, [state.records])

  if (state.status === 'loading') {
    return (
      <GlassCard className="flex items-center gap-3 p-8 text-sm text-zinc-600">
        <span className="h-2 w-2 rounded-full bg-primary hud-pulse" />
        <span className="hud-mono uppercase tracking-[0.28em] text-zinc-600">
          {t('deleted.booting')}
        </span>
      </GlassCard>
    )
  }

  if (state.status === 'error') {
    return (
      <GlassCard className="border border-danger/40 p-8 text-sm text-danger hud-mono uppercase tracking-[0.2em]">
        {t('status.error', { message: state.error })}
      </GlassCard>
    )
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <GlassCard className="overflow-hidden">
        <div className="relative px-5 py-6 sm:px-8 sm:py-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(60% 70% at 0% 0%, rgba(220,38,38,0.08), transparent 60%),' +
                'radial-gradient(40% 60% at 100% 100%, rgba(124,58,237,0.06), transparent 60%)',
            }}
          />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="hud-mono inline-flex items-center gap-2 rounded-full border border-danger/40 bg-danger/10 px-3 py-1 uppercase tracking-[0.28em] text-danger shadow-hud">
                <span className="h-1.5 w-1.5 rounded-full bg-danger animate-hud-blink" />
                {t('deleted.channelArchive')}
              </span>
              <span className="hud-mono inline-flex rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 uppercase tracking-[0.28em] text-zinc-600">
                {t('deleted.records', { count: totalRecords })}
              </span>
              <span className="hud-mono ml-auto inline-flex rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 uppercase tracking-[0.28em] text-secondary hud-glow-secondary">
                {t('deleted.lastAt', { time: formatTimestamp(latestAt) })}
              </span>
            </div>
            <div className="mt-4 text-xs leading-5 text-zinc-600">
              {t('deleted.subtitle')}
            </div>
          </div>
        </div>
      </GlassCard>

      <section>
        <GlassCard>
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-danger shadow-hud" />
              <h2 className="hud-mono text-[11px] font-semibold uppercase tracking-[0.32em] text-zinc-700">
                {t('deleted.tableTitle')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => load()}
              disabled={isRefreshing}
              className="hud-mono inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm text-primary shadow-hud transition hover:border-primary/60 hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t('deleted.refresh')}
              title={t('deleted.refresh')}
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

          {totalRecords === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-zinc-500 hud-mono uppercase tracking-[0.22em]">
              {t('deleted.empty')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                    <th className="px-4 py-3">{t('deleted.col.deletedAt')}</th>
                    <th className="px-4 py-3">{t('deleted.col.name')}</th>
                    <th className="px-4 py-3">{t('deleted.col.email')}</th>
                    <th className="px-4 py-3">{t('deleted.col.expiresAt')}</th>
                    <th className="px-4 py-3">{t('deleted.col.disabled')}</th>
                    <th className="px-4 py-3">{t('deleted.col.reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {state.records.map((record, index) => (
                    <tr
                      key={`${record.name}-${record.deletedAt}-${index}`}
                      className="border-t border-zinc-100 align-top text-zinc-700"
                    >
                      <td className="px-4 py-3 hud-mono text-xs text-zinc-600">
                        {formatTimestamp(record.deletedAt)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-zinc-900">{record.name || '-'}</td>
                      <td className="px-4 py-3 text-zinc-700">{record.email || '-'}</td>
                      <td className="px-4 py-3 hud-mono text-xs text-zinc-600">
                        {formatTimestamp(record.expiresAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            'hud-mono inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]',
                            record.disabled
                              ? 'border-zinc-300 bg-zinc-100 text-zinc-600'
                              : 'border-primary/30 bg-primary/10 text-primary',
                          ].join(' ')}
                        >
                          {record.disabled ? t('card.disabled') : t('card.enabled')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">{record.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </section>
    </div>
  )
}
