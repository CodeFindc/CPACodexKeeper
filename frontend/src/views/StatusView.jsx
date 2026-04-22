import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

export function formatTimestamp(value, fallbackLabel = 'N/A') {
  if (!value) {
    return fallbackLabel
  }
  return value.replace('T', ' ').replace('Z', ' UTC')
}

function getStatusTone(result, state) {
  if (state === 'snapshot-error' || result === 'failure') {
    return 'border-rose-200/70 bg-rose-100/70 text-rose-700'
  }
  if (state === 'stale' || result === 'partial') {
    return 'border-amber-200/80 bg-amber-100/75 text-amber-700'
  }
  return 'border-emerald-200/80 bg-emerald-100/80 text-emerald-700'
}

function getAccentClasses(accent) {
  if (accent === 'danger') {
    return {
      value: 'text-rose-700',
      badge: 'border-rose-200/80 bg-rose-100/75 text-rose-700',
      progress: 'bg-rose-400',
    }
  }

  if (accent === 'warning') {
    return {
      value: 'text-amber-700',
      badge: 'border-amber-200/80 bg-amber-100/75 text-amber-700',
      progress: 'bg-amber-400',
    }
  }

  return {
    value: 'text-slate-900',
    badge: 'border-sky-200/80 bg-sky-100/80 text-sky-700',
    progress: 'bg-sky-400',
  }
}

function GlassCard({ className = '', children }) {
  return (
    <div className={`rounded-[28px] border border-white/45 bg-white/48 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.34)] backdrop-blur-2xl ${className}`}>
      {children}
    </div>
  )
}

function StatCard({ label, value, accent = 'primary', subtitle, progressWidth = '100%', cellId }) {
  const accentClasses = getAccentClasses(accent)

  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 text-sm text-slate-500">
        <span>{label}</span>
        {cellId ? <span className={`rounded-full border px-2.5 py-1 text-xs ${accentClasses.badge}`}>{cellId}</span> : null}
      </div>
      <div className={`mt-5 text-4xl font-semibold tracking-tight sm:text-5xl ${accentClasses.value}`}>{value}</div>
      {subtitle ? <div className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</div> : null}
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200/80">
        <div className={`h-full rounded-full ${accentClasses.progress}`} style={{ width: progressWidth }} />
      </div>
    </GlassCard>
  )
}

function TelemetryBar({ label, value, total, accent = 'bg-sky-400', textTone = 'text-slate-700' }) {
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0

  return (
    <div className="rounded-3xl border border-white/35 bg-white/36 px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <span className={textTone}>{label}</span>
        <span className="text-slate-500">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
        <div className={`h-full rounded-full ${accent}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function LogRow({ label, value, status }) {
  return (
    <tr className="border-b border-white/35 last:border-b-0">
      <td className="px-4 py-3 text-sm text-slate-500">{label}</td>
      <td className="px-4 py-3 text-sm text-slate-800">{value}</td>
      <td className="px-4 py-3 text-right">
        <span className="inline-flex rounded-full border border-white/45 bg-white/56 px-2.5 py-1 text-xs text-slate-700">{status}</span>
      </td>
    </tr>
  )
}

const initialState = {
  status: 'loading',
  payload: null,
  error: null,
}

export default function StatusView() {
  const [state, setState] = useState(initialState)
  const { copy } = useOutletContext()

  useEffect(() => {
    let cancelled = false

    async function loadStatus() {
      try {
        const response = await fetch('/api/status.json')
        const payload = await response.json()
        if (!cancelled) {
          setState({ status: 'ready', payload, error: null })
        }
      } catch (error) {
        if (!cancelled) {
          setState({ status: 'error', payload: null, error: error instanceof Error ? error.message : 'Request failed' })
        }
      }
    }

    loadStatus()
    return () => {
      cancelled = true
    }
  }, [])

  if (state.status === 'loading') {
    return <GlassCard className="p-8 text-sm text-slate-700">{copy.shared.loadingStatus}</GlassCard>
  }

  if (state.status === 'error') {
    return <GlassCard className="border-rose-200/80 bg-rose-100/70 p-8 text-sm text-rose-700">{state.error}</GlassCard>
  }

  const payload = state.payload
  const summary = payload.summary ?? {
    total: 0,
    alive: 0,
    dead: 0,
    disabled: 0,
    enabled: 0,
    refreshed: 0,
    skipped: 0,
    network_error: 0,
  }

  const statusTone = getStatusTone(payload.result, payload.state)
  const localTime = formatTimestamp(payload.updated_at)
  const tickerMessage = payload.message ?? copy.shared.fallbackMessage
  const tickerStatus = payload.message ? copy.status.notice : copy.status.standby

  const logRows = [
    ['STARTED_AT', formatTimestamp(payload.started_at), 'INIT_OK'],
    ['UPDATED_AT', formatTimestamp(payload.updated_at), payload.result === 'success' ? 'SYNC_OK' : 'SYNC_ACTIVE'],
    ['MODE', payload.mode, payload.mode === 'daemon' ? 'ACTIVE' : 'ONCE'],
    ['RESULT', payload.result, payload.result.toUpperCase()],
    ['INTERVAL', payload.interval_seconds ?? 'N/A', 'TIMER'],
    ['MESSAGE', payload.message ?? copy.shared.fallbackMessage, payload.message ? 'NOTICE' : 'STANDBY'],
  ]

  return (
    <div className="space-y-6 lg:space-y-8">
      <GlassCard className="overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/62 px-3 py-1.5 text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_0_5px_rgba(186,230,253,0.45)]" />
            {copy.status.online}
          </span>
          <span className={`inline-flex rounded-full border px-3 py-1.5 text-sm ${statusTone}`}>{payload.result}</span>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)] xl:items-start">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">{copy.status.title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">{copy.status.description}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full border border-white/45 bg-white/58 px-3 py-2">{copy.status.mode}: {payload.mode}</span>
              <span className="rounded-full border border-white/45 bg-white/58 px-3 py-2">{copy.status.updated}: {formatTimestamp(payload.updated_at)}</span>
              <span className="rounded-full border border-white/45 bg-white/58 px-3 py-2">{copy.status.code}: {payload.code ?? 'NO_CODE'}</span>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/40 bg-white/40 p-5 backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
              <span>{copy.status.signalTitle}</span>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${statusTone}`}>{tickerStatus}</span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div>
                <div className="text-xs text-slate-500">{copy.status.lastFinish}</div>
                <div className="mt-2 text-sm font-medium text-slate-900">{formatTimestamp(payload.finished_at)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">{copy.status.currentNotice}</div>
                <div className="mt-2 text-sm font-medium leading-6 text-slate-900">{tickerMessage}</div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={copy.status.total} value={summary.total} subtitle={copy.status.totalSubtitle} progressWidth="100%" cellId="01" />
        <StatCard label={copy.status.alive} value={summary.alive} subtitle={copy.status.aliveSubtitle} progressWidth={summary.total ? `${Math.round((summary.alive / summary.total) * 100)}%` : '0%'} cellId="02" />
        <StatCard label={copy.status.dead} value={summary.dead} subtitle={copy.status.deadSubtitle} accent="danger" progressWidth={summary.total ? `${Math.round((summary.dead / summary.total) * 100)}%` : '0%'} cellId="03" />
        <StatCard label={copy.status.disabled} value={summary.disabled} subtitle={copy.status.disabledSubtitle} accent="warning" progressWidth={summary.total ? `${Math.round((summary.disabled / summary.total) * 100)}%` : '0%'} cellId="04" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
              <span>{copy.status.telemetryTitle}</span>
              <span className="rounded-full border border-white/45 bg-white/56 px-2.5 py-1 text-xs text-slate-700">{copy.status.telemetryBadge}</span>
            </div>
            <div className="mt-5 space-y-4">
              <TelemetryBar label={copy.status.refreshed} value={summary.refreshed} total={summary.total} accent="bg-sky-400" textTone="text-sky-700" />
              <TelemetryBar label={copy.status.skipped} value={summary.skipped} total={summary.total} accent="bg-amber-400" textTone="text-amber-700" />
              <TelemetryBar label={copy.status.networkError} value={summary.network_error} total={summary.total} accent="bg-rose-400" textTone="text-rose-700" />
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
              <span>{copy.status.feedTitle}</span>
              <span className="rounded-full border border-white/45 bg-white/56 px-2.5 py-1 text-xs text-slate-700">{copy.status.feedBadge}</span>
            </div>
            <div className="mt-5 grid grid-cols-6 gap-2.5">
              {Array.from({ length: 24 }, (_, index) => (
                <div
                  key={index}
                  className={`h-11 rounded-2xl border border-white/40 ${index % 5 === 0 ? 'bg-[linear-gradient(135deg,rgba(125,211,252,0.95),rgba(191,219,254,0.82))]' : 'bg-white/36'}`}
                />
              ))}
            </div>
          </GlassCard>
        </div>

        <GlassCard className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/40 px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">{copy.status.logsTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{copy.status.logsDescription}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="rounded-full border border-white/45 bg-white/56 px-2.5 py-1">{copy.status.logsLevel}</span>
              <span className="rounded-full border border-white/45 bg-white/56 px-2.5 py-1">{copy.status.logsTrace}</span>
            </div>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/40 text-sm text-slate-500">
                  <th className="px-4 py-3 font-medium">{copy.status.parameter}</th>
                  <th className="px-4 py-3 font-medium">{copy.status.valueStamp}</th>
                  <th className="px-4 py-3 text-right font-medium">{copy.status.statusLabel}</th>
                </tr>
              </thead>
              <tbody>
                {logRows.map(([label, value, status]) => (
                  <LogRow key={label} label={copy.status.logLabels[label] ?? label} value={value} status={copy.status.logStatuses[status] ?? status} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-white/40 bg-white/30 px-4 py-4 text-sm text-slate-700 sm:px-6">
            <span className="rounded-full border border-white/45 bg-white/60 px-2.5 py-1 text-xs">{copy.status.notice}</span>
            <span>{tickerMessage}</span>
          </div>
        </GlassCard>
      </section>

      <GlassCard className="px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="rounded-full border border-white/45 bg-white/56 px-3 py-2">{copy.status.footerLocalTime}: {localTime}</span>
            <span className="rounded-full border border-white/45 bg-white/56 px-3 py-2">{copy.status.footerInterval}: {payload.interval_seconds ?? 'N/A'}s</span>
            <span className="rounded-full border border-white/45 bg-white/56 px-3 py-2">{copy.status.footerEnabled}: {summary.enabled}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="rounded-full border border-white/45 bg-white/56 px-3 py-2">{copy.status.footerSync}</span>
            <span className="rounded-full border border-white/45 bg-white/56 px-3 py-2">{copy.status.footerLink}</span>
            <span className="rounded-full border border-white/45 bg-white/56 px-3 py-2">{copy.status.footerVersion}</span>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
