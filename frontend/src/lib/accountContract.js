export const accountPageSizeOptions = [4, 8, 12, 16]

export function normalizeAccountPayload(payload) {
  const accounts = Array.isArray(payload?.accounts) ? payload.accounts : []

  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    disabled: account.disabled,
    expiresAt: account.expires_at,
    quota: {
      primaryUsedPercent: account.quota.primary_used_percent,
      secondaryUsedPercent: account.quota.secondary_used_percent,
      activeWindowLabel: account.quota.active_window_label,
    },
  }))
}
