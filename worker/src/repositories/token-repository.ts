import { all, boolToInt, intToBool, nowIso, one } from '../db'
import type { ApiSiteToken } from '../types'

/**
 * Token 输入接口
 */
export interface TokenInput {
  /** 站点 ID */
  api_site_id: number
  /** 远程 Token ID */
  remote_token_id: string | null
  /** Token 键 */
  token_key: string
  /** Token 值状态 */
  value_status?: ApiSiteToken['value_status']
  /** Token 名称 */
  token_name: string | null
  /** Token 分组 */
  token_group: string
  /** 来源 */
  source?: string
  /** 是否激活 */
  is_active: number
  /** Token 配额 */
  token_quota: number | null
  /** Token 已用配额 */
  token_used_quota: number | null
  /** Token 无限配额 */
  token_unlimited_quota: boolean
  /** 创建时间 */
  created_time?: string | null
  /** 访问时间 */
  accessed_time?: string | null
  /** 过期时间 */
  expired_time?: string | null
}

/**
 * 将数据库行转换为 Token 对象
 * @param row - 数据库行
 * @returns Token 对象
 */
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

/**
 * 查找现有的 Token 用于更新
 * @param db - D1 数据库
 * @param input - Token 输入
 * @returns Promise<ApiSiteToken | null> - 现有 Token 或 null
 */
async function findExistingTokenForUpsert(db: D1Database, input: TokenInput): Promise<ApiSiteToken | null> {
  if (input.remote_token_id) {
    const row = await one<Record<string, unknown>>(db.prepare('SELECT * FROM api_site_tokens WHERE api_site_id = ? AND remote_token_id = ? LIMIT 1').bind(input.api_site_id, input.remote_token_id))
    if (row) return toToken(row)
  }

  const row = await one<Record<string, unknown>>(db.prepare('SELECT * FROM api_site_tokens WHERE api_site_id = ? AND token_key = ? ORDER BY id DESC LIMIT 1').bind(input.api_site_id, input.token_key))
  return row ? toToken(row) : null
}

/**
 * Token 仓库工厂函数
 * @param db - D1 数据库
 * @returns Token 仓库对象
 */
export function tokenRepository(db: D1Database) {
  return {
    /**
     * 按站点 ID 查找 Token
     * @param siteId - 站点 ID
     * @returns Promise<ApiSiteToken[]> - Token 列表
     */
    async findBySiteId(siteId: number): Promise<ApiSiteToken[]> {
      const rows = await all<Record<string, unknown>>(db.prepare('SELECT * FROM api_site_tokens WHERE api_site_id = ? ORDER BY id DESC').bind(siteId))
      return rows.map(toToken)
    },

    /**
     * 按 ID 查找 Token
     * @param id - Token ID
     * @returns Promise<ApiSiteToken | null> - Token 或 null
     */
    async findById(id: number): Promise<ApiSiteToken | null> {
      const row = await one<Record<string, unknown>>(db.prepare('SELECT * FROM api_site_tokens WHERE id = ?').bind(id))
      return row ? toToken(row) : null
    },

    /**
     * 更新或插入 Token
     * @param input - Token 输入
     */
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

    /**
     * 删除 Token
     * @param tokenId - Token ID
     */
    async delete(tokenId: number): Promise<void> {
      await db.prepare('DELETE FROM api_site_tokens WHERE id = ?').bind(tokenId).run()
    },

    /**
     * 删除缺失的 Token
     * @param siteId - 站点 ID
     * @param remoteIds - 远程 ID 列表
     * @returns Promise<number> - 删除数量
     */
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
