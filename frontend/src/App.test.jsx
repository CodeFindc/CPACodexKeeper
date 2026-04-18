import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const statusPayload = {
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
  ...statusPayload,
  result: 'success',
  message: 'Quota threshold recovered. Node re-enabled.',
}

const accountsPayload = {
  accounts: [
    {
      id: 'acct-01',
      name: 'Atlas-01',
      disabled: false,
      expires_at: '2026-05-01T00:00:00Z',
      quota: {
        primary_used_percent: 14,
        secondary_used_percent: 22,
        active_window_label: '5h',
      },
    },
    {
      id: 'acct-02',
      name: 'Beacon-02',
      disabled: true,
      expires_at: '2026-04-28T00:00:00Z',
      quota: {
        primary_used_percent: 91,
        secondary_used_percent: 96,
        active_window_label: 'week',
      },
    },
    {
      id: 'acct-03',
      name: 'Cipher-03',
      disabled: false,
      expires_at: '2026-05-12T00:00:00Z',
      quota: {
        primary_used_percent: 33,
        secondary_used_percent: null,
        active_window_label: '5h',
      },
    },
    {
      id: 'acct-04',
      name: 'Delta-04',
      disabled: false,
      expires_at: '2026-05-09T00:00:00Z',
      quota: {
        primary_used_percent: 48,
        secondary_used_percent: 67,
        active_window_label: 'week',
      },
    },
    {
      id: 'acct-05',
      name: 'Echo-05',
      disabled: true,
      expires_at: '2026-04-22T00:00:00Z',
      quota: {
        primary_used_percent: 100,
        secondary_used_percent: 100,
        active_window_label: 'week',
      },
    },
    {
      id: 'acct-06',
      name: 'Flux-06',
      disabled: false,
      expires_at: '2026-06-03T00:00:00Z',
      quota: {
        primary_used_percent: 12,
        secondary_used_percent: 19,
        active_window_label: '5h',
      },
    },
    {
      id: 'acct-07',
      name: 'Gamma-07',
      disabled: false,
      expires_at: '2026-05-17T00:00:00Z',
      quota: {
        primary_used_percent: 61,
        secondary_used_percent: 72,
        active_window_label: 'week',
      },
    },
    {
      id: 'acct-08',
      name: 'Helix-08',
      disabled: false,
      expires_at: null,
      quota: {
        primary_used_percent: 40,
        secondary_used_percent: null,
        active_window_label: '5h',
      },
    },
    {
      id: 'acct-09',
      name: 'Ion-09',
      disabled: true,
      expires_at: '2026-04-21T00:00:00Z',
      quota: {
        primary_used_percent: 88,
        secondary_used_percent: 95,
        active_window_label: 'week',
      },
    },
    {
      id: 'acct-10',
      name: 'Jade-10',
      disabled: false,
      expires_at: '2026-06-12T00:00:00Z',
      quota: {
        primary_used_percent: 9,
        secondary_used_percent: 14,
        active_window_label: '5h',
      },
    },
    {
      id: 'acct-11',
      name: 'Kilo-11',
      disabled: false,
      expires_at: '2026-05-30T00:00:00Z',
      quota: {
        primary_used_percent: 57,
        secondary_used_percent: 65,
        active_window_label: 'week',
      },
    },
    {
      id: 'acct-12',
      name: 'Lumen-12',
      disabled: false,
      expires_at: '2026-05-02T00:00:00Z',
      quota: {
        primary_used_percent: 29,
        secondary_used_percent: null,
        active_window_label: '5h',
      },
    },
    {
      id: 'acct-13',
      name: 'Matrix-13',
      disabled: true,
      expires_at: '2026-04-25T00:00:00Z',
      quota: {
        primary_used_percent: 94,
        secondary_used_percent: 98,
        active_window_label: 'week',
      },
    },
    {
      id: 'acct-14',
      name: 'Nova-14',
      disabled: false,
      expires_at: '2026-06-08T00:00:00Z',
      quota: {
        primary_used_percent: 18,
        secondary_used_percent: 31,
        active_window_label: '5h',
      },
    },
    {
      id: 'acct-15',
      name: 'Orion-15',
      disabled: false,
      expires_at: '2026-05-24T00:00:00Z',
      quota: {
        primary_used_percent: 44,
        secondary_used_percent: 58,
        active_window_label: 'week',
      },
    },
    {
      id: 'acct-16',
      name: 'Pulse-16',
      disabled: false,
      expires_at: '2026-06-18T00:00:00Z',
      quota: {
        primary_used_percent: 21,
        secondary_used_percent: null,
        active_window_label: '5h',
      },
    },
  ],
}

function mockFetch({ status = statusPayload, accounts = accountsPayload } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input) => {
      if (input === '/api/status.json') {
        return {
          ok: true,
          json: async () => status,
        }
      }

      if (input === '/api/accounts.json') {
        return {
          ok: true,
          json: async () => accounts,
        }
      }

      throw new Error(`Unexpected fetch URL: ${input}`)
    }),
  )
}

function renderApp(route = '/status') {
  render(
    <MemoryRouter basename="/status" initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('renders status route with status active and account present in both navs', async () => {
    mockFetch()

    renderApp('/status')

    expect(await screen.findByText(/CPACodexKeeper status/i)).toHaveTextContent('daemon-active')

    const statusLinks = screen.getAllByRole('link', { name: 'STATUS' })
    const accountLinks = screen.getAllByRole('link', { name: 'ACCOUNT' })

    expect(statusLinks).toHaveLength(2)
    expect(accountLinks).toHaveLength(2)
    expect(statusLinks[0]).toHaveAttribute('aria-current', 'page')
    expect(statusLinks[1]).toHaveAttribute('aria-current', 'page')
    expect(accountLinks[0]).not.toHaveAttribute('aria-current')
    expect(accountLinks[1]).not.toHaveAttribute('aria-current')
  })

  it('renders account route with default 12-card page and key account fields', async () => {
    mockFetch()

    renderApp('/status/account')

    const accountLinks = await screen.findAllByRole('link', { name: 'ACCOUNT' })
    const statusLinks = screen.getAllByRole('link', { name: 'STATUS' })

    expect(screen.getByText('Account status overview')).toBeInTheDocument()
    expect(screen.getByText('ACCOUNT GRID')).toBeInTheDocument()
    expect(accountLinks[0]).toHaveAttribute('aria-current', 'page')
    expect(accountLinks[1]).toHaveAttribute('aria-current', 'page')
    expect(statusLinks[0]).not.toHaveAttribute('aria-current')
    expect(statusLinks[1]).not.toHaveAttribute('aria-current')
    expect(screen.queryByText('SYSTEM TELEMETRY')).not.toBeInTheDocument()
    expect(screen.queryByText('CHRONICLE LOGS')).not.toBeInTheDocument()

    expect(screen.getAllByTestId('account-card')).toHaveLength(12)
    expect(screen.getByText('Atlas-01')).toBeInTheDocument()
    expect(screen.getByText('Beacon-02')).toBeInTheDocument()
    expect(screen.getAllByText('PRIMARY QUOTA').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ACTIVE WINDOW').length).toBeGreaterThan(0)
    expect(screen.getAllByText('TOKEN EXPIRY').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ENABLED').length).toBeGreaterThan(0)
    expect(screen.getAllByText('DISABLED').length).toBeGreaterThan(0)
    expect(screen.queryByText('a@example.com')).not.toBeInTheDocument()
    expect(screen.getByText('RANGE 1-12 / 16')).toBeInTheDocument()
    expect(screen.getByText('PAGE 1 / 2')).toBeInTheDocument()
  })

  it('keeps page-size options on a 4N rhythm and defaults to 12', async () => {
    mockFetch()

    renderApp('/status/account')

    const pageSizeSelect = await screen.findByRole('combobox', { name: 'Page size' })
    const optionValues = screen.getAllByRole('option').map((option) => option.textContent)

    expect(pageSizeSelect).toHaveValue('12')
    expect(optionValues).toEqual(['4', '8', '12', '16'])
  })

  it('updates visible cards predictably when navigating between pages', async () => {
    mockFetch()

    renderApp('/status/account')

    const previousButton = await screen.findByRole('button', { name: /previous/i })
    const nextButton = screen.getByRole('button', { name: /next/i })

    expect(previousButton).toBeDisabled()
    expect(nextButton).toBeEnabled()
    expect(screen.getByText('Atlas-01')).toBeInTheDocument()
    expect(screen.queryByText('Matrix-13')).not.toBeInTheDocument()

    fireEvent.click(nextButton)

    expect(screen.getByText('Matrix-13')).toBeInTheDocument()
    expect(screen.getByText('Pulse-16')).toBeInTheDocument()
    expect(screen.queryByText('Atlas-01')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('account-card')).toHaveLength(4)
    expect(previousButton).toBeEnabled()
    expect(nextButton).toBeDisabled()
    expect(screen.getByText('RANGE 13-16 / 16')).toBeInTheDocument()
    expect(screen.getByText('PAGE 2 / 2')).toBeInTheDocument()

    fireEvent.click(previousButton)

    expect(screen.getByText('Atlas-01')).toBeInTheDocument()
    expect(screen.queryByText('Matrix-13')).not.toBeInTheDocument()
    expect(previousButton).toBeDisabled()
    expect(nextButton).toBeEnabled()
  })

  it('resets to the first page when page size changes', async () => {
    mockFetch()

    renderApp('/status/account')

    const nextButton = await screen.findByRole('button', { name: /next/i })
    const pageSizeSelect = screen.getByRole('combobox', { name: 'Page size' })

    fireEvent.click(nextButton)
    expect(screen.getByText('Matrix-13')).toBeInTheDocument()

    fireEvent.change(pageSizeSelect, { target: { value: '4' } })

    expect(pageSizeSelect).toHaveValue('4')
    expect(screen.getAllByTestId('account-card')).toHaveLength(4)
    expect(screen.getByText('Atlas-01')).toBeInTheDocument()
    expect(screen.getByText('Delta-04')).toBeInTheDocument()
    expect(screen.queryByText('Matrix-13')).not.toBeInTheDocument()
    expect(screen.getByText('RANGE 1-4 / 16')).toBeInTheDocument()
    expect(screen.getByText('PAGE 1 / 4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()
  })

  it('preserves status dashboard anchors after route extraction', async () => {
    mockFetch()

    renderApp('/status')

    expect(await screen.findByText(/CPACodexKeeper status/i)).toBeInTheDocument()
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

  it('renders active notice banner when API returns a notice', async () => {
    mockFetch({ status: noticePayload })

    renderApp('/status')

    expect(await screen.findAllByText('Quota threshold recovered. Node re-enabled.')).toHaveLength(2)
    expect(screen.getAllByText('NOTICE')).toHaveLength(2)
    expect(screen.getByText('SYNC_OK')).toBeInTheDocument()
  })
})
