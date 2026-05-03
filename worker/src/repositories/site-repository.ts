import { all, boolToInt, nowIso, one, siteInputParams, toApiSite } from '../db'
import type { ApiSite, ApiSiteInput } from '../types'

export function siteRepository(db: D1Database) {
  return {
    async create(input: ApiSiteInput): Promise<number> {
      const result = await db.prepare(`
        INSERT INTO api_sites (
          name, url, api_type, auth_method, auth_value, user_id, login_username, login_password,
          enabled, auto_checkin, remarks, checkin_endpoint, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(...siteInputParams(input), nowIso(), nowIso()).run()
      return Number(result.meta.last_row_id)
    },

    async update(id: number, input: ApiSiteInput): Promise<void> {
      await db.prepare(`
        UPDATE api_sites
        SET name = ?, url = ?, api_type = ?, auth_method = ?, auth_value = ?, user_id = ?,
            login_username = ?, login_password = ?, enabled = ?, auto_checkin = ?,
            remarks = ?, checkin_endpoint = ?, updated_at = ?
        WHERE id = ?
      `).bind(...siteInputParams(input), nowIso(), id).run()
    },

    async updateFields(id: number, fields: Record<string, unknown>): Promise<void> {
      const entries = Object.entries(fields).filter(([, value]) => value !== undefined)
      if (entries.length === 0) return
      const set = entries.map(([key]) => `${key} = ?`).join(', ')
      const args = entries.map(([, value]) => value)
      await db.prepare(`UPDATE api_sites SET ${set}, updated_at = ? WHERE id = ?`).bind(...args, nowIso(), id).run()
    },

    async delete(id: number): Promise<void> {
      await db.batch([
        db.prepare('DELETE FROM api_site_checkin_logs WHERE api_site_id = ?').bind(id),
        db.prepare('DELETE FROM api_site_tokens WHERE api_site_id = ?').bind(id),
        db.prepare('DELETE FROM api_site_task_logs WHERE api_site_id = ?').bind(id),
        db.prepare('DELETE FROM api_site_models WHERE site_id = ?').bind(id),
        db.prepare('DELETE FROM api_sites WHERE id = ?').bind(id)
      ])
    },

    async findById(id: number): Promise<ApiSite | null> {
      const row = await one<Record<string, unknown>>(db.prepare('SELECT * FROM api_sites WHERE id = ?').bind(id))
      return row ? toApiSite(row) : null
    },

    async findAll(): Promise<ApiSite[]> {
      const rows = await all<Record<string, unknown>>(db.prepare('SELECT * FROM api_sites ORDER BY id DESC'))
      return rows.map(toApiSite)
    },

    async findEnabled(): Promise<ApiSite[]> {
      const rows = await all<Record<string, unknown>>(db.prepare('SELECT * FROM api_sites WHERE enabled = 1 ORDER BY id ASC'))
      return rows.map(toApiSite)
    },

    async findAutoCheckin(): Promise<ApiSite[]> {
      const rows = await all<Record<string, unknown>>(db.prepare('SELECT * FROM api_sites WHERE enabled = 1 AND auto_checkin = 1 ORDER BY id ASC'))
      return rows.map(toApiSite)
    },

    async existsByNameAndUrl(name: string, url: string, excludeId?: number): Promise<boolean> {
      const query = excludeId
        ? 'SELECT COUNT(*) AS count FROM api_sites WHERE name = ? AND url = ? AND id != ?'
        : 'SELECT COUNT(*) AS count FROM api_sites WHERE name = ? AND url = ?'
      const args = excludeId ? [name, url, excludeId] : [name, url]
      const row = await one<{ count: number }>(db.prepare(query).bind(...args))
      return Number(row?.count ?? 0) > 0
    },

    async findByUrlLike(normalizedUrl: string): Promise<ApiSite[]> {
      const rows = await all<Record<string, unknown>>(db.prepare('SELECT * FROM api_sites WHERE url = ? OR url = ? ORDER BY id DESC').bind(normalizedUrl, normalizedUrl.replace(/\/+$/, '')))
      return rows.map(toApiSite)
    },

    async findByNameAndUrl(name: string, normalizedUrl: string): Promise<ApiSite | null> {
      const row = await one<Record<string, unknown>>(db.prepare('SELECT * FROM api_sites WHERE name = ? AND (url = ? OR url = ?) ORDER BY id DESC LIMIT 1').bind(name, normalizedUrl, normalizedUrl.replace(/\/+$/, '')))
      return row ? toApiSite(row) : null
    },

    async getStatistics(): Promise<{ total_sites: number; enabled_sites: number; disabled_sites: number }> {
      const row = await one<{ total: number; enabled: number }>(db.prepare('SELECT COUNT(*) AS total, SUM(enabled) AS enabled FROM api_sites'))
      const total = Number(row?.total ?? 0)
      const enabled = Number(row?.enabled ?? 0)
      return {
        total_sites: total,
        enabled_sites: enabled,
        disabled_sites: total - enabled
      }
    },

    async setEnabled(id: number, enabled: boolean): Promise<void> {
      await this.updateFields(id, { enabled: boolToInt(enabled) })
    }
  }
}
