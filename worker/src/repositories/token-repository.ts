import { all, boolToInt, intToBool, nowIso, one } from '../db'
import type { ApiSiteToken } from '../types'

export interface TokenInput {
  api_site_id: number
  remote_token_id: string | null
  token_key: string
  value_status?: ApiSiteToken['value_status']
  token_name: string | null
  token_group: string
  source?: string
  is_active: number
  token_quota: number | null
  token_used_quota: number | null
  token_unlimited_quota: boolean
  created_time?: string | null
  accessed_time?: string | null
  expired_time?: string | null
}

function toToken(row: Record<string, unknown>): ApiSiteToken {
  return {
    id: Number(row.id),
    api_site_id: Number(row.api_site_id),
    remote_token_id: row.remote_token_id == null ? null : String(row.remote_token_id),
    token_key: String(row.token_key),
    value_status: String(row.value_status ?? 'ready') as ApiSiteToken['value_status'],
    token_name: row.token_name == null ? null : String(row.token_name),
    token_group: String(row.token_group ?? 'default'),
    source: String(row.source ?? 'remote'),
    is_active: Number(row.is_active ?? 1),
    token_quota: row.token_quota == null ? null : Number(row.token_quota),
    token_used_quota: row.token_used_quota == null ? null : Number(row.token_used_quota),
    token_unlimited_quota: intToBool(row.token_unlimited_quota),
    created_time: row.created_time == null ? null : String(row.created_time),
    accessed_time: row.accessed_time == null ? null : String(row.accessed_time),
    expired_time: row.expired_time == null ? null : String(row.expired_time),
    last_synced: row.last_synced == null ? null : String(row.last_synced),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  }
}

async function findExistingTokenForUpsert(db: D1Database, input: TokenInput): Promise<ApiSiteToken | null> {
  if (input.remote_token_id) {
    const row = await one<Record<string, unknown>>(db.prepare('SELECT * FROM api_site_tokens WHERE api_site_id = ? AND remote_token_id = ? LIMIT 1').bind(input.api_site_id, input.remote_token_id))
    if (row) return toToken(row)
  }

  const row = await one<Record<string, unknown>>(db.prepare('SELECT * FROM api_site_tokens WHERE api_site_id = ? AND token_key = ? ORDER BY id DESC LIMIT 1').bind(input.api_site_id, input.token_key))
  return row ? toToken(row) : null
}

export function tokenRepository(db: D1Database) {
  return {
    async findBySiteId(siteId: number): Promise<ApiSiteToken[]> {
      const rows = await all<Record<string, unknown>>(db.prepare('SELECT * FROM api_site_tokens WHERE api_site_id = ? ORDER BY id DESC').bind(siteId))
      return rows.map(toToken)
    },

    async findById(id: number): Promise<ApiSiteToken | null> {
      const row = await one<Record<string, unknown>>(db.prepare('SELECT * FROM api_site_tokens WHERE id = ?').bind(id))
      return row ? toToken(row) : null
    },

    async upsert(input: TokenInput): Promise<void> {
      const existing = await findExistingTokenForUpsert(db, input)
      const now = nowIso()

      if (existing) {
        await db.prepare(`
          UPDATE api_site_tokens
          SET remote_token_id = ?, token_key = ?, value_status = ?, token_name = ?, token_group = ?,
              source = ?, is_active = ?, token_quota = ?, token_used_quota = ?, token_unlimited_quota = ?,
              created_time = ?, accessed_time = ?, expired_time = ?, last_synced = ?, updated_at = ?
          WHERE id = ?
        `).bind(
          input.remote_token_id,
          input.token_key,
          input.value_status || 'ready',
          input.token_name,
          input.token_group || 'default',
          input.source || 'remote',
          input.is_active,
          input.token_quota,
          input.token_used_quota,
          boolToInt(input.token_unlimited_quota),
          input.created_time ?? null,
          input.accessed_time ?? null,
          input.expired_time ?? null,
          now,
          now,
          existing.id
        ).run()
        return
      }

      await db.prepare(`
        INSERT INTO api_site_tokens (
          api_site_id, remote_token_id, token_key, value_status, token_name, token_group, source, is_active,
          token_quota, token_used_quota, token_unlimited_quota, created_time, accessed_time, expired_time,
          last_synced, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        input.api_site_id,
        input.remote_token_id,
        input.token_key,
        input.value_status || 'ready',
        input.token_name,
        input.token_group || 'default',
        input.source || 'remote',
        input.is_active,
        input.token_quota,
        input.token_used_quota,
        boolToInt(input.token_unlimited_quota),
        input.created_time ?? null,
        input.accessed_time ?? null,
        input.expired_time ?? null,
        now,
        now,
        now
      ).run()
    },

    async delete(tokenId: number): Promise<void> {
      await db.prepare('DELETE FROM api_site_tokens WHERE id = ?').bind(tokenId).run()
    },

    async deleteMissing(siteId: number, remoteIds: string[]): Promise<number> {
      const tokens = await this.findBySiteId(siteId)
      let deleted = 0
      for (const token of tokens) {
        if (token.remote_token_id && !remoteIds.includes(token.remote_token_id)) {
          await this.delete(token.id)
          deleted++
        }
      }
      return deleted
    }
  }
}
