import { all, boolToInt, buildLimitOffset, intToBool, nowIso, nullable, one } from '../db'
import type { HfSpaceKeepaliveLog, HfSpaceTarget, HfSpaceUser, Paginated } from '../types'

interface HfSpaceUserRow {
  id: number
  username: string
  source_input: string
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

interface HfSpaceTargetRow {
  id: number
  hf_user_id: number
  username?: string
  space_id: string
  space_name: string
  title: string | null
  alias?: string | null
  base_url: string
  keepalive_url: string
  runtime_stage: string | null
  domain_stage: string | null
  enabled: number | boolean
  last_checked_at: string | null
  last_status: 'success' | 'failed' | null
  last_http_status: number | null
  last_latency_ms: number | null
  last_error: string | null
  created_at: string
  updated_at: string
}

interface HfSpaceKeepaliveLogRow {
  id: number
  target_id: number
  hf_user_id: number
  username?: string
  space_id: string
  request_url: string
  status: 'success' | 'failed'
  http_status: number | null
  latency_ms: number | null
  response_excerpt: string | null
  error: string | null
  created_at: string
}

function toUser(row: HfSpaceUserRow): HfSpaceUser {
  return {
    id: Number(row.id),
    username: row.username,
    source_input: row.source_input,
    last_synced_at: nullable(row.last_synced_at),
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

function toTarget(row: HfSpaceTargetRow): HfSpaceTarget {
  return {
    id: Number(row.id),
    hf_user_id: Number(row.hf_user_id),
    username: nullable(row.username),
    space_id: row.space_id,
    space_name: row.space_name,
    title: nullable(row.title),
    alias: nullable(row.alias) || nullable(row.title) || row.space_name,
    base_url: row.base_url,
    keepalive_url: row.keepalive_url,
    runtime_stage: nullable(row.runtime_stage),
    domain_stage: nullable(row.domain_stage),
    enabled: intToBool(row.enabled),
    last_checked_at: nullable(row.last_checked_at),
    last_status: row.last_status,
    last_http_status: row.last_http_status === null ? null : Number(row.last_http_status),
    last_latency_ms: row.last_latency_ms === null ? null : Number(row.last_latency_ms),
    last_error: nullable(row.last_error),
    created_at: row.created_at,
    updated_at: row.updated_at,
    logs: []
  }
}

function toLog(row: HfSpaceKeepaliveLogRow): HfSpaceKeepaliveLog {
  return {
    id: Number(row.id),
    target_id: Number(row.target_id),
    hf_user_id: Number(row.hf_user_id),
    username: nullable(row.username),
    space_id: row.space_id,
    request_url: row.request_url,
    status: row.status,
    http_status: row.http_status === null ? null : Number(row.http_status),
    latency_ms: row.latency_ms === null ? null : Number(row.latency_ms),
    response_excerpt: nullable(row.response_excerpt),
    error: nullable(row.error),
    created_at: row.created_at
  }
}

export function hfSpaceRepository(db: D1Database) {
  return {
    async listUsers(): Promise<HfSpaceUser[]> {
      return (await all<HfSpaceUserRow>(db.prepare('SELECT * FROM hf_space_users ORDER BY username ASC'))).map(toUser)
    },

    async findUserByUsername(username: string): Promise<HfSpaceUser | null> {
      const row = await one<HfSpaceUserRow>(db.prepare('SELECT * FROM hf_space_users WHERE username = ?').bind(username))
      return row ? toUser(row) : null
    },

    async upsertUser(username: string, sourceInput: string): Promise<HfSpaceUser> {
      const existing = await this.findUserByUsername(username)
      const timestamp = nowIso()
      if (existing) {
        await db.prepare('UPDATE hf_space_users SET source_input = ?, last_synced_at = ?, updated_at = ? WHERE id = ?')
          .bind(sourceInput, timestamp, timestamp, existing.id)
          .run()
        return { ...existing, source_input: sourceInput, last_synced_at: timestamp, updated_at: timestamp }
      }

      const result = await db.prepare('INSERT INTO hf_space_users (username, source_input, last_synced_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .bind(username, sourceInput, timestamp, timestamp, timestamp)
        .run()
      return {
        id: Number(result.meta.last_row_id),
        username,
        source_input: sourceInput,
        last_synced_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp
      }
    },

    async listTargets(params: { enabledOnly?: boolean } = {}): Promise<HfSpaceTarget[]> {
      const where = params.enabledOnly ? 'WHERE t.enabled = 1' : ''
      return (await all<HfSpaceTargetRow>(db.prepare(`
        SELECT t.*, u.username
        FROM hf_space_targets t
        LEFT JOIN hf_space_users u ON u.id = t.hf_user_id
        ${where}
        ORDER BY u.username ASC, t.space_name ASC
      `))).map(toTarget)
    },

    async listTargetsByUser(userId: number): Promise<HfSpaceTarget[]> {
      return (await all<HfSpaceTargetRow>(db.prepare(`
        SELECT t.*, u.username
        FROM hf_space_targets t
        LEFT JOIN hf_space_users u ON u.id = t.hf_user_id
        WHERE t.hf_user_id = ?
        ORDER BY t.space_name ASC
      `).bind(userId))).map(toTarget)
    },

    async findTarget(id: number): Promise<HfSpaceTarget | null> {
      const row = await one<HfSpaceTargetRow>(db.prepare(`
        SELECT t.*, u.username
        FROM hf_space_targets t
        LEFT JOIN hf_space_users u ON u.id = t.hf_user_id
        WHERE t.id = ?
      `).bind(id))
      return row ? toTarget(row) : null
    },

    async findTargetBySpaceId(spaceId: string): Promise<HfSpaceTarget | null> {
      const row = await one<HfSpaceTargetRow>(db.prepare(`
        SELECT t.*, u.username
        FROM hf_space_targets t
        LEFT JOIN hf_space_users u ON u.id = t.hf_user_id
        WHERE t.space_id = ?
      `).bind(spaceId))
      return row ? toTarget(row) : null
    },

    async existingSpaceIds(): Promise<Set<string>> {
      const rows = await all<{ space_id: string }>(db.prepare('SELECT space_id FROM hf_space_targets'))
      return new Set(rows.map(row => row.space_id))
    },

    async listRecentLogsForTargets(targetIds: number[], sinceIso: string): Promise<HfSpaceKeepaliveLog[]> {
      if (!targetIds.length) return []
      const placeholders = targetIds.map(() => '?').join(', ')
      const rows = await all<HfSpaceKeepaliveLogRow>(db.prepare(`
        SELECT l.*, u.username
        FROM hf_space_keepalive_logs l
        LEFT JOIN hf_space_users u ON u.id = l.hf_user_id
        WHERE l.target_id IN (${placeholders})
          AND datetime(l.created_at) >= datetime(?)
        ORDER BY l.target_id ASC, datetime(l.created_at) ASC, l.id ASC
      `).bind(...targetIds, sinceIso))
      return rows.map(toLog)
    },

    async createTargets(userId: number, targets: Array<{
      space_id: string
      space_name: string
      title: string | null
      alias: string
      base_url: string
      keepalive_url: string
      runtime_stage: string | null
      domain_stage: string | null
      enabled: boolean
    }>): Promise<HfSpaceTarget[]> {
      const timestamp = nowIso()
      const createdTargets: HfSpaceTarget[] = []
      for (const target of targets) {
        const result = await db.prepare(`
          INSERT OR IGNORE INTO hf_space_targets (
            hf_user_id, space_id, space_name, title, alias, base_url, keepalive_url,
            runtime_stage, domain_stage, enabled, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          userId,
          target.space_id,
          target.space_name,
          target.title,
          target.alias,
          target.base_url,
          target.keepalive_url,
          target.runtime_stage,
          target.domain_stage,
          boolToInt(target.enabled),
          timestamp,
          timestamp
        ).run()
        if (Number(result.meta.changes ?? 0) > 0) {
          const createdTarget = await this.findTargetBySpaceId(target.space_id)
          if (createdTarget) createdTargets.push(createdTarget)
        }
      }
      return createdTargets
    },

    async updateTarget(id: number, patch: { keepalive_url?: string; enabled?: boolean; title?: string | null; alias?: string; runtime_stage?: string | null; domain_stage?: string | null }): Promise<void> {
      const fields: Record<string, unknown> = {
        keepalive_url: patch.keepalive_url,
        enabled: patch.enabled === undefined ? undefined : boolToInt(patch.enabled),
        title: patch.title,
        alias: patch.alias,
        runtime_stage: patch.runtime_stage,
        domain_stage: patch.domain_stage
      }
      const entries = Object.entries(fields).filter(([, value]) => value !== undefined)
      if (!entries.length) return
      const setSql = entries.map(([key]) => `${key} = ?`).join(', ')
      await db.prepare(`UPDATE hf_space_targets SET ${setSql}, updated_at = ? WHERE id = ?`)
        .bind(...entries.map(([, value]) => value), nowIso(), id)
        .run()
    },

    async deleteTarget(id: number): Promise<void> {
      await db.prepare('DELETE FROM hf_space_targets WHERE id = ?').bind(id).run()
    },

    async recordKeepalive(target: HfSpaceTarget, result: { status: 'success' | 'failed'; http_status: number | null; latency_ms: number; response_excerpt: string | null; error: string | null }): Promise<void> {
      const timestamp = nowIso()
      await db.prepare(`
        INSERT INTO hf_space_keepalive_logs (
          target_id, hf_user_id, space_id, request_url, status, http_status, latency_ms, response_excerpt, error, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        target.id,
        target.hf_user_id,
        target.space_id,
        target.keepalive_url,
        result.status,
        result.http_status,
        result.latency_ms,
        result.response_excerpt,
        result.error,
        timestamp
      ).run()
      await db.prepare(`
        UPDATE hf_space_targets
        SET last_checked_at = ?, last_status = ?, last_http_status = ?, last_latency_ms = ?, last_error = ?, updated_at = ?
        WHERE id = ?
      `).bind(timestamp, result.status, result.http_status, result.latency_ms, result.error, timestamp, target.id).run()
    },

    async paginateLogs(params: { userId?: number; targetId?: number; status?: string; page?: number; pageSize?: number }): Promise<Paginated<HfSpaceKeepaliveLog>> {
      const { limit, offset, page, pageSize } = buildLimitOffset(params.page, params.pageSize)
      const where: string[] = []
      const args: unknown[] = []
      if (params.userId) {
        where.push('l.hf_user_id = ?')
        args.push(params.userId)
      }
      if (params.targetId) {
        where.push('l.target_id = ?')
        args.push(params.targetId)
      }
      if (params.status) {
        where.push('l.status = ?')
        args.push(params.status)
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
      const count = await one<{ count: number }>(db.prepare(`SELECT COUNT(*) AS count FROM hf_space_keepalive_logs l ${whereSql}`).bind(...args))
      const rows = await all<HfSpaceKeepaliveLogRow>(db.prepare(`
        SELECT l.*, u.username
        FROM hf_space_keepalive_logs l
        LEFT JOIN hf_space_users u ON u.id = l.hf_user_id
        ${whereSql}
        ORDER BY datetime(l.created_at) DESC, l.id DESC
        LIMIT ? OFFSET ?
      `).bind(...args, limit, offset))
      const total = Number(count?.count ?? 0)
      return {
        logs: rows.map(toLog),
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize)
      }
    },

    async deleteOlderHfSpaceKeepaliveLogs(cutoffIso: string): Promise<number> {
      const row = await one<{ count: number }>(
        db.prepare("SELECT COUNT(*) AS count FROM hf_space_keepalive_logs WHERE datetime(created_at) < datetime(?)").bind(cutoffIso)
      )
      await db.prepare("DELETE FROM hf_space_keepalive_logs WHERE datetime(created_at) < datetime(?)").bind(cutoffIso).run()
      return Number(row?.count ?? 0)
    }
  }
}
