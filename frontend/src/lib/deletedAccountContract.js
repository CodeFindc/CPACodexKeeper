export function normalizeDeletedAccountPayload(payload) {
  const records = Array.isArray(payload?.accounts) ? payload.accounts : []

  return records.map((record) => ({
    deletedAt: record.deleted_at ?? null,
    name: record.name ?? null,
    email: record.email ?? null,
    accountId: record.account_id ?? null,
    expiresAt: record.expires_at ?? null,
    disabled: Boolean(record.disabled),
    reason: record.reason ?? null,
  }))
}
