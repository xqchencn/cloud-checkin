import { all, buildLimitOffset, nowIso, one } from '../db'
import type { CheckinLog, Paginated } from '../types'

export interface CheckinLogInput {
  api_site_id: number
  checkin_time: string
  checkin_type: string
  status: string
  message: string
  reward_amount: number
  new_balance: number
  response_time: number
  http_status_code: number
  error_details: string
  skip_reason?: string | null
  failure_reason?: string | null
  balance_before?: number | null
  balance_after?: number | null
}

function toLog(row: Record<string, unknown>): CheckinLog {
  return {
    id: Number(row.id),
    api_site_id: Number(row.api_site_id),
    site_name: row.site_name == null ? undefined : String(row.site_name),
    checkin_time: String(row.checkin_time),
    checkin_type: String(row.checkin_type),
    status: String(row.status),
    message: row.message == null ? null : String(row.message),
    reward_amount: row.reward_amount == null ? null : Number(row.reward_amount),
    new_balance: row.new_balance == null ? null : Number(row.new_balance),
    response_time: row.response_time == null ? null : Number(row.response_time),
    http_status_code: row.http_status_code == null ? null : Number(row.http_status_code),
    error_details: row.error_details == null ? null : String(row.error_details),
    skip_reason: row.skip_reason == null ? null : String(row.skip_reason),
    failure_reason: row.failure_reason == null ? null : String(row.failure_reason),
    balance_before: row.balance_before == null ? null : Number(row.balance_before),
    balance_after: row.balance_after == null ? null : Number(row.balance_after),
    created_at: String(row.created_at)
  }
}

export function checkinLogRepository(db: D1Database) {
  return {
    async create(input: CheckinLogInput): Promise<void> {
      await db.prepare(`
        INSERT INTO api_site_checkin_logs (
          api_site_id, checkin_time, checkin_type, status, message, reward_amount,
          new_balance, response_time, http_status_code, error_details, skip_reason,
          failure_reason, balance_before, balance_after, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        input.api_site_id,
        input.checkin_time,
        input.checkin_type,
        input.status,
        input.message,
        input.reward_amount,
        input.new_balance,
        input.response_time,
        input.http_status_code,
        input.error_details,
        input.skip_reason || null,
        input.failure_reason || null,
        input.balance_before ?? null,
        input.balance_after ?? null,
        nowIso()
      ).run()
    },

    async latest(siteId: number, limit = 20): Promise<CheckinLog[]> {
      const rows = await all<Record<string, unknown>>(db.prepare(`
        SELECT l.*, s.name AS site_name
        FROM api_site_checkin_logs l
        LEFT JOIN api_sites s ON s.id = l.api_site_id
        WHERE l.api_site_id = ?
        ORDER BY datetime(l.checkin_time) DESC, l.id DESC
        LIMIT ?
      `).bind(siteId, limit))
      return rows.map(toLog)
    },

    async paginate(params: { siteId?: number; status?: string; checkinType?: string; page?: number; pageSize?: number }): Promise<Paginated<CheckinLog>> {
      const { limit, offset, page, pageSize } = buildLimitOffset(params.page, params.pageSize)
      const where: string[] = []
      const args: unknown[] = []
      if (params.siteId) {
        where.push('l.api_site_id = ?')
        args.push(params.siteId)
      }
      if (params.status) {
        where.push('l.status = ?')
        args.push(params.status)
      }
      if (params.checkinType) {
        where.push('l.checkin_type = ?')
        args.push(params.checkinType)
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
      const countRow = await one<{ count: number }>(db.prepare(`SELECT COUNT(*) AS count FROM api_site_checkin_logs l ${whereSql}`).bind(...args))
      const total = Number(countRow?.count ?? 0)
      const rows = await all<Record<string, unknown>>(db.prepare(`
        SELECT l.*, s.name AS site_name
        FROM api_site_checkin_logs l
        LEFT JOIN api_sites s ON s.id = l.api_site_id
        ${whereSql}
        ORDER BY datetime(l.checkin_time) DESC, l.id DESC
        LIMIT ? OFFSET ?
      `).bind(...args, limit, offset))
      return {
        logs: rows.map(toLog),
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize)
      }
    },

    async clearAll(): Promise<number> {
      const row = await one<{ count: number }>(db.prepare('SELECT COUNT(*) AS count FROM api_site_checkin_logs'))
      await db.prepare('DELETE FROM api_site_checkin_logs').run()
      return Number(row?.count ?? 0)
    },

    async deleteOlderThan(cutoffIso: string): Promise<number> {
      const row = await one<{ count: number }>(
        db.prepare("SELECT COUNT(*) AS count FROM api_site_checkin_logs WHERE datetime(created_at) < datetime(?)").bind(cutoffIso)
      )
      await db.prepare("DELETE FROM api_site_checkin_logs WHERE datetime(created_at) < datetime(?)").bind(cutoffIso).run()
      return Number(row?.count ?? 0)
    },

    async todayStatistics(): Promise<Record<string, unknown>> {
      const rows = await all<Record<string, unknown>>(db.prepare(`
        SELECT s.id AS site_id, s.name AS site_name, s.api_type, l.status, l.message, l.error_details AS error, l.checkin_time AS time
        FROM api_sites s
        LEFT JOIN (
          SELECT api_site_id, status, message, error_details, checkin_time
          FROM api_site_checkin_logs
          WHERE date(checkin_time) = date('now')
          GROUP BY api_site_id
          HAVING max(checkin_time)
        ) l ON l.api_site_id = s.id
        WHERE s.enabled = 1 AND s.auto_checkin = 1
      `))
      const enabledSites = rows.map(row => ({
        site_id: Number(row.site_id),
        site_name: String(row.site_name),
        api_type: String(row.api_type),
        status: row.status ? String(row.status) : 'unchecked',
        message: row.message ? String(row.message) : '',
        error: row.error ? String(row.error) : '',
        time: row.time ? String(row.time) : ''
      }))
      return {
        checkin_enabled_count: enabledSites.length,
        success_count: enabledSites.filter(s => s.status === 'success' || s.status === 'already_checked_in').length,
        unchecked_count: enabledSites.filter(s => s.status === 'unchecked').length,
        failed_count: enabledSites.filter(s => s.status === 'failed' || s.status === 'error').length,
        enabled_sites: enabledSites
      }
    }
  }
}
