import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

const successPayload = {
  state: 'daemon-active',
  mode: 'daemon',
  result: 'partial',
  summary: {
    total: 81,
    alive: 80,
    dead: 1,
    disabled: 3,
    enabled: 78,
    refreshed: 7,
    skipped: 4,
    network_error: 2,
  },
  started_at: '2026-04-15T08:00:04Z',
  finished_at: '2026-04-15T14:22:11Z',
  updated_at: '2026-04-15T14:22:11Z',
  interval_seconds: 300,
  code: null,
  message: null,
}

const noticePayload = {
  ...successPayload,
  result: 'success',
  message: 'Quota threshold recovered. Node re-enabled.',
}

describe('App', () => {
  it('renders status summary from API payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => successPayload,
      }),
    )

    render(<App />)

    expect(await screen.findByText(/CPACodexKeeper status/i)).toHaveTextContent('daemon-active')
    expect(screen.getAllByText('CORE')).toHaveLength(2)
    expect(screen.getByText('SYSTEM TELEMETRY')).toBeInTheDocument()
    expect(screen.getByText('FLOW_RATE_V2')).toBeInTheDocument()
    expect(screen.getByText('GRID_SCAN_24')).toBeInTheDocument()
    expect(screen.getByText('CHRONICLE LOGS')).toBeInTheDocument()
    expect(screen.getByText('TRACE_MATRIX')).toBeInTheDocument()
    expect(screen.getByText('CELL_01')).toBeInTheDocument()
    expect(screen.getByText('SYS_FOOTER_LINK')).toBeInTheDocument()
    expect(screen.getByText('SCAN_SYNC')).toBeInTheDocument()
    expect(screen.getByText('TOTAL')).toBeInTheDocument()
    expect(screen.getByText('81')).toBeInTheDocument()
    expect(screen.getByText('NETWORK ERROR')).toBeInTheDocument()
    expect(screen.getByText('2%')).toBeInTheDocument()
    expect(screen.getByText(/LOCAL TIME:/)).toBeInTheDocument()
  })

  it('renders active message banner when API returns a notice', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => noticePayload,
      }),
    )

    render(<App />)

    expect(await screen.findAllByText('Quota threshold recovered. Node re-enabled.')).toHaveLength(2)
    expect(screen.getAllByText('NOTICE')).toHaveLength(2)
    expect(screen.getByText('SYNC_OK')).toBeInTheDocument()
  })
})
