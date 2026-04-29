import { useEffect, useState } from 'react'
import { useT } from '../i18n'

export function formatTimestamp(value, fallback = 'N/A') {
  if (!value) return fallback
  return value.replace('T', ' ').replace('Z', ' UTC')
}

function getResultTone(result, state) {
  if (state === 'snapshot-error' || result === 'failure') {
    return { dot: 'bg-danger', chip: 'border-danger/40 bg-danger/10 text-danger', glow: 'shadow-[0_0_18px_rgba(255,93,108,0.35)]' }
  }
  if (state === 'stale' || result === 'partial') {
    return { dot: 'bg-warn', chip: 'border-warn/40 bg-warn/10 text-warn', glow: 'shadow-[0_0_18px_rgba(255,181,71,0.3)]' }
  }
  return { dot: 'bg-primary', chip: 'border-primary/40 bg-primary/10 text-primary', glow: 'shadow-hud' }
}

function getAccent(accent) {
  if (accent === 'danger') {
    return { value: 'text-danger hud-glow-secondary', badge: 'border-danger/40 bg-danger/10 text-danger', bar: 'bg-gradient-to-r from-danger/80 to-rose-300' }
  }
  if (accent === 'warning') {
    return { value: 'text-warn', badge: 'border-warn/40 bg-warn/10 text-warn', bar: 'bg-gradient-to-r from-warn/80 to-yellow-300' }
  }
  if (accent === 'cyan') {
    return { value: 'text-secondary hud-glow-secondary', badge: 'border-secondary/40 bg-secondary/10 text-secondary', bar: 'bg-gradient-to-r from-secondary to-cyan-200' }
  }
  return { value: 'text-primary hud-glow-primary', badge: 'border-primary/40 bg-primary/10 text-primary', bar: 'bg-gradient-to-r from-primary to-emerald-200' }
}

function GlassCard({ className = '', children }) {
  return <div className={`glass-panel rounded-2xl ${className}`}>{children}</div>
}

function SectionHeader({ title, badge, badgeTone = 'primary' }) {
  const tones = {
    primary: 'border-primary/40 bg-primary/10 text-primary',
    cyan: 'border-secondary/40 bg-secondary/10 text-secondary',
    accent: 'border-accent/40 bg-accent/10 text-accent',
    warn: 'border-warn/40 bg-warn/10 text-warn',
  }
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 sm:px-6">
      <div className="flex items-center gap-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-hud" />
        <h2 className="hud-mono text-[11px] font-semibold uppercase tracking-[0.32em] text-zinc-700">{title}</h2>
      </div>
      {badge ? (
        <span className={`hud-mono inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${tones[badgeTone]}`}>
          {badge}
        </span>
      ) : null}
    </div>
  )
}

function StatCard({ label, value, accent = 'primary', subtitle, progressWidth = '100%', cellId }) {
  const a = getAccent(accent)
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="hud-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-600">{label}</span>
        {cellId ? (
          <span className={`hud-mono inline-flex rounded-full border px-2 py-0.5 text-[10px] tracking-[0.18em] ${a.badge}`}>{cellId}</span>
        ) : null}
      </div>
      <div className={`mt-5 font-display text-5xl font-semibold tracking-tight sm:text-6xl ${a.value}`}>{value}</div>
      {subtitle ? <div className="mt-2 text-xs leading-5 text-zinc-600">{subtitle}</div> : null}
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-full rounded-full ${a.bar}`} style={{ width: progressWidth }} />
      </div>
    </GlassCard>
  )
}

function TelemetryBar({ label, value, total, tone = 'primary', valueLabel, totalLabel }) {
  const a = getAccent(tone)
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
  return (
    <div className="glass-tile rounded-xl px-4 py-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="hud-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-600">{label}</span>
        <span className={`hud-mono text-[11px] font-semibold ${a.value.split(' ')[0]}`}>{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-full rounded-full ${a.bar}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-zinc-600">
        <span>{valueLabel} {value}</span>
        <span>{totalLabel} {total}</span>
      </div>
    </div>
  )
}

function LogRow({ label, value, status }) {
  return (
    <tr className="border-b border-zinc-200 last:border-b-0">
      <td className="px-4 py-3 text-xs text-zinc-600 hud-mono uppercase tracking-[0.2em]">{label}</td>
      <td className="px-4 py-3 text-sm text-zinc-700">{value}</td>
      <td className="px-4 py-3 text-right">
        <span className="hud-mono inline-flex rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-secondary">
          {status}
        </span>
      </td>
    </tr>
  )
}

const initialState = { status: 'loading', payload: null, error: null }

export default function StatusView() {
  const t = useT()
  const [state, setState] = useState(initialState)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const response = await fetch('/api/status.json')
        const payload = await response.json()
        if (!cancelled) setState({ status: 'ready', payload, error: null })
      } catch (error) {
        if (!cancelled) setState({ status: 'error', payload: null, error: error instanceof Error ? error.message : 'Request failed' })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (state.status === 'loading') {
    return (
      <GlassCard className="flex items-center gap-3 p-8 text-sm text-zinc-600">
        <span className="h-2 w-2 rounded-full bg-primary hud-pulse" />
        <span className="hud-mono uppercase tracking-[0.28em] text-zinc-600">{t('status.bootingFeed')}</span>
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

  const payload = state.payload
  const summary = payload.summary ?? {
    total: 0, alive: 0, dead: 0, disabled: 0, enabled: 0, refreshed: 0, skipped: 0, network_error: 0,
  }

  const tone = getResultTone(payload.result, payload.state)
  const tickerStatus = payload.message ? t('common.notice') : t('common.standby')

  const logRows = [
    ['STARTED_AT', formatTimestamp(payload.started_at), 'INIT_OK'],
    ['UPDATED_AT', formatTimestamp(payload.updated_at), payload.result === 'success' ? 'SYNC_OK' : 'SYNC_ACTIVE'],
    ['MODE', payload.mode, payload.mode === 'daemon' ? 'ACTIVE' : 'ONCE'],
    ['RESULT', payload.result, String(payload.result).toUpperCase()],
    ['INTERVAL', payload.interval_seconds ?? 'N/A', 'TIMER'],
    ['MESSAGE', payload.message ?? 'Awaiting next refresh...', payload.message ? 'NOTICE' : 'STANDBY'],
  ]

  const localTime = formatTimestamp(payload.updated_at)

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
                'radial-gradient(60% 70% at 90% 0%, rgba(8,145,178,0.08), transparent 60%),' +
                'radial-gradient(40% 60% at 0% 100%, rgba(16,185,129,0.07), transparent 60%)',
            }}
          />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 hud-mono uppercase tracking-[0.28em] ${tone.chip} ${tone.glow}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${tone.dot} animate-hud-blink`} />
                {t('common.live')}
              </span>
              <span className="hud-mono inline-flex rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 uppercase tracking-[0.28em] text-zinc-600">
                CH · {payload.code ?? 'NO_CODE'}
              </span>
              <span className="hud-mono inline-flex rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 uppercase tracking-[0.28em] text-zinc-600">
                MODE · {payload.mode}
              </span>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.95fr)] xl:items-start">
              <div>
                <h1 className="sr-only">CPACodexKeeper status · {payload.state}</h1>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="glass-tile rounded-xl px-3 py-3">
                    <div className="hud-mono text-[10px] uppercase tracking-[0.24em] text-zinc-600">{t('status.updated')}</div>
                    <div className="mt-1.5 text-xs text-zinc-700">{formatTimestamp(payload.updated_at)}</div>
                  </div>
                  <div className="glass-tile rounded-xl px-3 py-3">
                    <div className="hud-mono text-[10px] uppercase tracking-[0.24em] text-zinc-600">{t('status.started')}</div>
                    <div className="mt-1.5 text-xs text-zinc-700">{formatTimestamp(payload.started_at)}</div>
                  </div>
                  <div className="glass-tile rounded-xl px-3 py-3">
                    <div className="hud-mono text-[10px] uppercase tracking-[0.24em] text-zinc-600">{t('status.interval')}</div>
                    <div className="mt-1.5 text-xs text-zinc-700">{t('status.intervalSeconds', { value: payload.interval_seconds ?? 'N/A' })}</div>
                  </div>
                  <div className="glass-tile rounded-xl px-3 py-3">
                    <div className="hud-mono text-[10px] uppercase tracking-[0.24em] text-zinc-600">{t('status.result')}</div>
                    <div className={`mt-1.5 text-xs font-semibold ${tone.chip.split(' ').slice(-1)[0]}`}>{String(payload.result).toUpperCase()}</div>
                  </div>
                </div>
              </div>

              <div className="glass-tile rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="hud-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-600">{t('status.signal')}</span>
                  <span className={`hud-mono inline-flex rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.22em] ${tone.chip}`}>
                    {tickerStatus}
                  </span>
                </div>
                <div className="mt-4 grid gap-4">
                  <div>
                    <div className="hud-mono text-[10px] uppercase tracking-[0.24em] text-zinc-600">{t('status.lastFinish')}</div>
                    <div className="mt-1 text-sm text-zinc-800">{formatTimestamp(payload.finished_at)}</div>
                  </div>
                  <div>
                    <div className="hud-mono text-[10px] uppercase tracking-[0.24em] text-zinc-600">{t('status.currentNotice')}</div>
                    <div className="mt-1 break-words text-sm leading-6 text-zinc-800">
                      {payload.message ?? t('status.awaiting')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* stat grid */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('stat.total')} value={summary.total} subtitle={t('stat.totalSubtitle')} cellId="CELL_01" progressWidth="100%" />
        <StatCard label={t('stat.healthy')} value={summary.alive} subtitle={t('stat.healthySubtitle')} cellId="CELL_02" accent="cyan" progressWidth={summary.total ? `${Math.round((summary.alive / summary.total) * 100)}%` : '0%'} />
        <StatCard label={t('stat.offline')} value={summary.dead} subtitle={t('stat.offlineSubtitle')} accent="danger" cellId="CELL_03" progressWidth={summary.total ? `${Math.round((summary.dead / summary.total) * 100)}%` : '0%'} />
        <StatCard label={t('stat.disabled')} value={summary.disabled} subtitle={t('stat.disabledSubtitle')} accent="warning" cellId="CELL_04" progressWidth={summary.total ? `${Math.round((summary.disabled / summary.total) * 100)}%` : '0%'} />
      </section>

      {/* telemetry + activity + logs */}
      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)]">
        <div className="space-y-5">
          <GlassCard>
            <SectionHeader title={t('status.systemTelemetry')} badge="FLOW_RATE_V2" badgeTone="cyan" />
            <div className="space-y-3 px-5 py-5 sm:px-6">
              <TelemetryBar label={t('status.refreshed')} value={summary.refreshed} total={summary.total} tone="primary" valueLabel={t('telemetry.value')} totalLabel={t('telemetry.total')} />
              <TelemetryBar label={t('status.skipped')} value={summary.skipped} total={summary.total} tone="warning" valueLabel={t('telemetry.value')} totalLabel={t('telemetry.total')} />
              <TelemetryBar label={t('status.networkError')} value={summary.network_error} total={summary.total} tone="danger" valueLabel={t('telemetry.value')} totalLabel={t('telemetry.total')} />
            </div>
          </GlassCard>

          <GlassCard>
            <SectionHeader title={t('status.activityGrid')} badge="GRID_SCAN_24" badgeTone="accent" />
            <div className="grid grid-cols-6 gap-2 px-5 py-5 sm:px-6">
              {Array.from({ length: 24 }, (_, index) => {
                const active = index % 5 === 0
                const warn = index % 7 === 0 && !active
                return (
                  <div
                    key={index}
                    className={`h-10 rounded-lg border ${
                      active
                        ? 'border-primary/50 bg-gradient-to-br from-primary/40 to-secondary/30 shadow-hud'
                        : warn
                          ? 'border-warn/40 bg-warn/10'
                          : 'border-zinc-200 bg-zinc-50'
                    }`}
                  />
                )
              })}
            </div>
          </GlassCard>
        </div>

        <GlassCard className="overflow-hidden">
          <SectionHeader title={t('status.chronicleLogs')} badge="TRACE_MATRIX" badgeTone="primary" />
          <div className="overflow-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/60">
                  <th className="hud-mono px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-600">{t('status.parameter')}</th>
                  <th className="hud-mono px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-600">{t('status.value')}</th>
                  <th className="hud-mono px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-600">{t('status.state')}</th>
                </tr>
              </thead>
              <tbody>
                {logRows.map(([label, value, status]) => (
                  <LogRow key={label} label={label} value={value} status={status} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 bg-zinc-50/60 px-5 py-3 text-[11px] sm:px-6">
            <span className="hud-mono inline-flex rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-0.5 font-semibold uppercase tracking-[0.22em] text-zinc-600">
              TRACE_OK
            </span>
            <span className="hud-mono uppercase tracking-[0.22em] text-zinc-600">{t('status.entries', { count: logRows.length, time: formatTimestamp(payload.updated_at) })}</span>
          </div>
        </GlassCard>
      </section>

      {/* footer pill bar */}
      <GlassCard className="px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="hud-mono inline-flex rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 uppercase tracking-[0.22em] text-zinc-600">
              {t('status.localTime')} <span className="ml-1 text-zinc-800">{localTime}</span>
            </span>
            <span className="hud-mono inline-flex rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 uppercase tracking-[0.22em] text-zinc-600">
              {t('status.intervalPill', { value: payload.interval_seconds ?? 'N/A' })}
            </span>
            <span className="hud-mono inline-flex rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 uppercase tracking-[0.22em] text-zinc-600">
              {t('status.enabledPill', { count: summary.enabled })}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="hud-mono inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 uppercase tracking-[0.22em] text-primary">
              SCAN_SYNC
            </span>
            <span className="hud-mono inline-flex rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1.5 uppercase tracking-[0.22em] text-secondary">
              SYS_FOOTER_LINK
            </span>
            <span className="hud-mono inline-flex rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 uppercase tracking-[0.22em] text-zinc-600">
              {t('status.uiVersion')}
            </span>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
