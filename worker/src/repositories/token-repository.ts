import { all, boolToInt, intToBool, nowIso, one } from '../db'
import type { ApiSiteToken } from '../types'

export interface TokenInput {
  api_site_id: number
  remote_token_id: string | null
  token_key: string
  token_name: string | null
  token_group: string
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
    token_name: row.token_name == null ? null : String(row.token_name),
    token_group: String(row.token_group ?? 'default'),
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
      await db.prepare(`
        INSERT INTO api_site_tokens (
          api_site_id, remote_token_id, token_key, token_name, token_group, is_active,
          token_quota, token_used_quota, token_unlimited_quota, created_time, accessed_time, expired_time,
          last_synced, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(api_site_id, remote_token_id) DO UPDATE SET
          token_key = excluded.token_key,
          token_name = excluded.token_name,
          token_group = excluded.token_group,
          is_active = excluded.is_active,
          token_quota = excluded.token_quota,
          token_used_quota = excluded.token_used_quota,
          token_unlimited_quota = excluded.token_unlimited_quota,
          created_time = excluded.created_time,
          accessed_time = excluded.accessed_time,
          expired_time = excluded.expired_time,
          last_synced = excluded.last_synced,
          updated_at = excluded.updated_at
      `).bind(
        input.api_site_id,
        input.remote_token_id,
        input.token_key,
        input.token_name,
        input.token_group || 'default',
        input.is_active,
        input.token_quota,
        input.token_used_quota,
        boolToInt(input.token_unlimited_quota),
        input.created_time ?? null,
        input.accessed_time ?? null,
        input.expired_time ?? null,
        nowIso(),
        nowIso(),
        nowIso()
      ).run()
    },

    async updateActive(tokenId: number, isActive: number): Promise<void> {
      await db.prepare('UPDATE api_site_tokens SET is_active = ?, updated_at = ? WHERE id = ?').bind(isActive, nowIso(), tokenId).run()
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
