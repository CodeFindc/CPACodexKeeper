import { useEffect, useState } from 'react'

export function formatTimestamp(value) {
  if (!value) {
    return 'N/A'
  }
  return value.replace('T', ' ').replace('Z', ' UTC')
}

function getStatusTone(result, state) {
  if (state === 'snapshot-error' || result === 'failure') {
    return 'text-danger border-danger/40'
  }
  if (state === 'stale' || result === 'partial') {
    return 'text-secondary border-secondary/40'
  }
  return 'text-primary border-primary/40'
}

function StatCard({ label, value, accent = 'text-primary', subtitle, progressWidth = '100%', cellId }) {
  return (
    <div className="group relative overflow-hidden rounded-sm border border-primary/25 bg-surface px-5 py-6 shadow-hud">
      <div className="absolute inset-x-0 top-0 h-px bg-primary/25" />
      <div className="flex items-start justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
        <span>{label}</span>
        {cellId ? <span className="text-primary/70">{cellId}</span> : null}
      </div>
      <div className={`mt-4 text-5xl font-black uppercase ${accent}`}>{value}</div>
      {subtitle ? <div className="mt-2 text-xs uppercase tracking-[0.2em] text-muted">{subtitle}</div> : null}
      <div className="mt-5 h-1 w-full bg-primary/10">
        <div className={`h-full ${accent.replace('text-', 'bg-')}`} style={{ width: progressWidth }} />
      </div>
    </div>
  )
}

function TelemetryBar({ label, value, total, accent = 'bg-primary', textTone = 'text-primary' }) {
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.24em]">
        <span className={textTone}>{label}</span>
        <span className="text-muted">{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden bg-surface-strong">
        <div className={`h-full ${accent}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function LogRow({ label, value, status }) {
  return (
    <tr className="border-b border-primary/10 last:border-b-0">
      <td className="px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-muted">{label}</td>
      <td className="px-4 py-3 text-sm text-slate-100">{value}</td>
      <td className="px-4 py-3 text-right">
        <span className="border border-primary/30 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-primary">
          {status}
        </span>
      </td>
    </tr>
  )
}

const initialState = {
  status: 'loading',
  payload: null,
  error: null,
}

export default function App() {
  const [state, setState] = useState(initialState)

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
    return <div className="p-8 text-sm uppercase tracking-[0.2em] text-primary">Loading status...</div>
  }

  if (state.status === 'error') {
    return <div className="p-8 text-sm uppercase tracking-[0.2em] text-danger">{state.error}</div>
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
  const statusTextTone = statusTone.split(' ')[0]
  const localTime = formatTimestamp(payload.updated_at)
  const tickerMessage = payload.message ?? 'Awaiting next data burst...'
  const tickerStatus = payload.message ? 'NOTICE' : 'STANDBY'

  const logRows = [
    ['STARTED_AT', formatTimestamp(payload.started_at), 'INIT_OK'],
    ['UPDATED_AT', formatTimestamp(payload.updated_at), payload.result === 'success' ? 'SYNC_OK' : 'SYNC_ACTIVE'],
    ['MODE', payload.mode, payload.mode === 'daemon' ? 'ACTIVE' : 'ONCE'],
    ['RESULT', payload.result, payload.result.toUpperCase()],
    ['INTERVAL', payload.interval_seconds ?? 'N/A', 'TIMER'],
    ['MESSAGE', payload.message ?? 'Awaiting next data burst...', payload.message ? 'NOTICE' : 'STANDBY'],
  ]

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
          <nav className="hidden gap-5 text-xs font-semibold uppercase tracking-[0.24em] text-muted md:flex">
            <span className="border-b-2 border-primary pb-1 text-primary">CORE</span>
            <span>NETWORK</span>
            <span>SECURITY</span>
          </nav>
        </div>
      </header>

      <main className="relative z-[1] px-6 pb-24 pt-10">
        <div className="mx-auto max-w-7xl space-y-10">
          <section className="border-l-4 border-primary pl-6">
            <div className="mb-3 flex items-center gap-3 text-[11px] uppercase tracking-[0.34em] text-primary">
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(0,255,65,0.9)]" />
              Connectivity Established
            </div>
            <h1 className="font-display text-4xl font-black uppercase tracking-tight md:text-6xl">
              CPACodexKeeper status: <span className={statusTextTone}>{payload.state}</span>
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.22em] text-muted">
              <span className={`border px-3 py-1 ${statusTone}`}>{payload.result}</span>
              <span>mode={payload.mode}</span>
              <span>updated={formatTimestamp(payload.updated_at)}</span>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="border border-primary/15 bg-surface-strong/30 px-4 py-3 text-[11px] uppercase tracking-[0.26em] text-muted">
                <span className="text-primary">STATE SIGNAL</span> {payload.code ?? 'NO_CODE'} / LAST FINISH {formatTimestamp(payload.finished_at)}
              </div>
              <div className={`inline-flex items-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.28em] ${statusTone}`}>
                <span className={`h-2 w-2 rounded-full ${statusTextTone.replace('text-', 'bg-')}`} />
                {tickerStatus}
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="TOTAL" value={summary.total} subtitle="data objects" progressWidth="100%" cellId="CELL_01" />
            <StatCard label="ALIVE" value={summary.alive} subtitle="operational node" progressWidth={summary.total ? `${Math.round((summary.alive / summary.total) * 100)}%` : '0%'} cellId="CELL_02" />
            <StatCard label="DEAD" value={summary.dead} subtitle="terminated thread" accent="text-danger" progressWidth={summary.total ? `${Math.round((summary.dead / summary.total) * 100)}%` : '0%'} cellId="CELL_03" />
            <StatCard label="DISABLED" value={summary.disabled} subtitle="idle process" accent="text-secondary" progressWidth={summary.total ? `${Math.round((summary.disabled / summary.total) * 100)}%` : '0%'} cellId="CELL_04" />
          </section>

          <section className="grid gap-8 lg:grid-cols-[1fr_2fr]">
            <div className="space-y-6">
              <div className="rounded-sm border border-primary/20 bg-surface p-6 shadow-hud">
                <div className="mb-4 flex items-center justify-between text-[10px] uppercase tracking-[0.26em] text-muted">
                  <span>SYSTEM TELEMETRY</span>
                  <span className="text-primary">FLOW_RATE_V2</span>
                </div>
                <div className="mt-6 space-y-6">
                  <TelemetryBar label="REFRESHED" value={summary.refreshed} total={summary.total} accent="bg-primary" textTone="text-primary" />
                  <TelemetryBar label="SKIPPED" value={summary.skipped} total={summary.total} accent="bg-secondary" textTone="text-secondary" />
                  <TelemetryBar label="NETWORK ERROR" value={summary.network_error} total={summary.total} accent="bg-danger" textTone="text-danger" />
                </div>
              </div>

              <div className="relative overflow-hidden rounded-sm border border-primary/10 bg-surface px-6 py-8 shadow-hud">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,255,65,0.15),_transparent_65%)]" />
                <div className="relative space-y-3">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em]">
                    <span className="text-primary">REALTIME VISUAL FEED</span>
                    <span className="text-muted">GRID_SCAN_24</span>
                  </div>
                  <div className="grid grid-cols-6 gap-2 opacity-80">
                    {Array.from({ length: 24 }, (_, index) => (
                      <div key={index} className={`h-7 rounded-sm ${index % 5 === 0 ? 'bg-primary/30' : 'bg-primary/10'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-sm border border-primary/20 bg-surface shadow-hud">
              <div className="flex items-center justify-between border-b border-primary/20 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">CHRONICLE LOGS</h2>
                </div>
                <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.24em] text-muted">
                  <span>SEC_LEVEL_04</span>
                  <span className="text-primary">TRACE_MATRIX</span>
                </div>
              </div>
              <div className="overflow-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-primary/10 text-[10px] uppercase tracking-[0.28em] text-muted">
                      <th className="px-4 py-3 font-medium">Parameter</th>
                      <th className="px-4 py-3 font-medium">Value_Stamp</th>
                      <th className="px-4 py-3 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logRows.map(([label, value, status]) => (
                      <LogRow key={label} label={label} value={value} status={status} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-4 overflow-hidden border-t border-primary/10 bg-surface-strong/40 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-primary">
                <span>[MSG]</span>
                <span>{tickerMessage}</span>
              </div>
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-primary/10 pt-4 text-[11px] uppercase tracking-[0.24em] text-muted">
            <div className="flex flex-wrap gap-6">
              <span>LOCAL TIME: {localTime}</span>
              <span>INTERVAL: {payload.interval_seconds ?? 'N/A'}s</span>
              <span>ENABLED: {summary.enabled}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-primary/70">SCAN_SYNC</span>
              <span className="text-primary/70">SYS_FOOTER_LINK</span>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span>CPACodexKeeper_OS_VER_4.0.1</span>
              </div>
            </div>
          </footer>

          <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-primary/20 bg-background/90 backdrop-blur md:hidden">
            {['CORE', 'NETWORK', 'SECURITY', 'LOGS'].map((label, index) => (
              <div
                key={label}
                className={`flex-1 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.24em] ${index === 0 ? 'border-t-2 border-primary bg-primary/10 text-primary' : 'text-muted'}`}
              >
                {label}
              </div>
            ))}
          </nav>
        </div>
      </main>
    </div>
  )
}
