import { all, boolToInt, nowIso, one, siteInputParams, toApiSite } from '../db'
import type { ApiSite, ApiSiteInput } from '../types'

/**
 * 站点仓库工厂函数
 * @param db - D1 数据库
 * @returns 站点仓库对象
 */
export function siteRepository(db: D1Database) {
  return {
    /**
     * 创建站点
     * @param input - 站点输入
     * @returns Promise<number> - 站点 ID
     */
    async create(input: ApiSiteInput): Promise<number> {
      const result = await db.prepare(`
        INSERT INTO api_sites (
          name, url, api_type, account_label, sort_order,
          auth_method, auth_value, user_id, login_username, login_password,
          enabled, auto_checkin, remarks, checkin_endpoint, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(...siteInputParams(input), nowIso(), nowIso()).run()
      return Number(result.meta.last_row_id)
    },

    /**
     * 更新站点
     * @param id - 站点 ID
     * @param input - 站点输入
     */
    async update(id: number, input: ApiSiteInput): Promise<void> {
      await db.prepare(`
        UPDATE api_sites
        SET name = ?, url = ?, api_type = ?, account_label = ?, sort_order = ?,
            auth_method = ?, auth_value = ?, user_id = ?,
            login_username = ?, login_password = ?, enabled = ?, auto_checkin = ?,
            remarks = ?, checkin_endpoint = ?, updated_at = ?
        WHERE id = ?
      `).bind(...siteInputParams(input), nowIso(), id).run()
    },

    /**
     * 更新站点字段
     * @param id - 站点 ID
     * @param fields - 字段映射
     */
    async updateFields(id: number, fields: Record<string, unknown>): Promise<void> {
      const entries = Object.entries(fields).filter(([, value]) => value !== undefined)
      if (entries.length === 0) return
      const set = entries.map(([key]) => `${key} = ?`).join(', ')
      const args = entries.map(([, value]) => value)
      await db.prepare(`UPDATE api_sites SET ${set}, updated_at = ? WHERE id = ?`).bind(...args, nowIso(), id).run()
    },

    /**
     * 删除站点
     * @param id - 站点 ID
     */
    async delete(id: number): Promise<void> {
      await db.batch([
        db.prepare('DELETE FROM api_site_checkin_logs WHERE api_site_id = ?').bind(id),
        db.prepare('DELETE FROM api_site_tokens WHERE api_site_id = ?').bind(id),
        db.prepare('DELETE FROM api_site_task_logs WHERE api_site_id = ?').bind(id),
        db.prepare('DELETE FROM api_site_models WHERE site_id = ?').bind(id),
        db.prepare('DELETE FROM api_sites WHERE id = ?').bind(id)
      ])
    },

    /**
     * 根据 ID 查找站点
     * @param id - 站点 ID
     * @returns Promise<ApiSite | null> - 站点或 null
     */
    async findById(id: number): Promise<ApiSite | null> {
      const row = await one<Record<string, unknown>>(db.prepare('SELECT * FROM api_sites WHERE id = ?').bind(id))
      return row ? toApiSite(row) : null
    },

    /**
     * 查找所有站点
     * @returns Promise<ApiSite[]> - 站点列表
     */
    async findAll(): Promise<ApiSite[]> {
      const rows = await all<Record<string, unknown>>(db.prepare('SELECT * FROM api_sites ORDER BY enabled DESC, sort_order ASC, site_quota DESC, id ASC'))
      return rows.map(toApiSite)
    },

    /**
     * 查找启用的站点
     * @returns Promise<ApiSite[]> - 启用站点列表
     */
    async findEnabled(): Promise<ApiSite[]> {
      const rows = await all<Record<string, unknown>>(db.prepare('SELECT * FROM api_sites WHERE enabled = 1 ORDER BY sort_order ASC, site_quota DESC, id ASC'))
      return rows.map(toApiSite)
    },

    /**
     * 查找自动签到站点
     * @returns Promise<ApiSite[]> - 自动签到站点列表
     */
    async findAutoCheckin(): Promise<ApiSite[]> {
      const rows = await all<Record<string, unknown>>(db.prepare('SELECT * FROM api_sites WHERE enabled = 1 AND auto_checkin = 1 ORDER BY sort_order ASC, site_quota DESC, id ASC'))
      return rows.map(toApiSite)
    },

    /**
     * 检查站点是否存在
     * @param url - 站点 URL
     * @param accountLabel - 账号标签
     * @param excludeId - 排除的站点 ID
     * @returns Promise<boolean> - 是否存在
     */
    async existsByUrlAndAccountLabel(url: string, accountLabel: string, excludeId?: number): Promise<boolean> {
      const query = excludeId
        ? "SELECT COUNT(*) AS count FROM api_sites WHERE (url = ? OR url = ?) AND COALESCE(account_label, '') = ? AND id != ?"
        : "SELECT COUNT(*) AS count FROM api_sites WHERE (url = ? OR url = ?) AND COALESCE(account_label, '') = ?"
      const normalizedUrl = url.trim().replace(/\/+$/, '')
      const args = excludeId ? [normalizedUrl, normalizedUrl.replace(/\/+$/, ''), accountLabel.trim(), excludeId] : [normalizedUrl, normalizedUrl.replace(/\/+$/, ''), accountLabel.trim()]
      const row = await one<{ count: number }>(db.prepare(query).bind(...args))
      return Number(row?.count ?? 0) > 0
    },

    /**
     * 按 URL 查找站点
     * @param normalizedUrl - 规范化后的 URL
     * @returns Promise<ApiSite[]> - 站点列表
     */
    async findByUrlLike(normalizedUrl: string): Promise<ApiSite[]> {
      const rows = await all<Record<string, unknown>>(db.prepare('SELECT * FROM api_sites WHERE url = ? OR url = ? ORDER BY enabled DESC, sort_order ASC, site_quota DESC, id ASC').bind(normalizedUrl, normalizedUrl.replace(/\/+$/, '')))
      return rows.map(toApiSite)
    },

    /**
     * 按名称和 URL 查找站点
     * @param name - 站点名称
     * @param normalizedUrl - 规范化后的 URL
     * @returns Promise<ApiSite | null> - 站点或 null
     */
    async findByNameAndUrl(name: string, normalizedUrl: string): Promise<ApiSite | null> {
      const row = await one<Record<string, unknown>>(db.prepare('SELECT * FROM api_sites WHERE name = ? AND (url = ? OR url = ?) ORDER BY id DESC LIMIT 1').bind(name, normalizedUrl, normalizedUrl.replace(/\/+$/, '')))
      return row ? toApiSite(row) : null
    },

    /**
     * 按 URL 和账号标签查找站点
     * @param normalizedUrl - 规范化后的 URL
     * @param accountLabel - 账号标签
     * @returns Promise<ApiSite | null> - 站点或 null
     */
    async findByUrlAndAccountLabel(normalizedUrl: string, accountLabel: string): Promise<ApiSite | null> {
      const row = await one<Record<string, unknown>>(db.prepare("SELECT * FROM api_sites WHERE (url = ? OR url = ?) AND COALESCE(account_label, '') = ? ORDER BY id DESC LIMIT 1").bind(normalizedUrl, normalizedUrl.replace(/\/+$/, ''), accountLabel.trim()))
      return row ? toApiSite(row) : null
    },

    /**
     * 获取站点统计信息
     * @returns Promise<SiteStatistics> - 站点统计信息
     */
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

    /**
     * 设置站点启用状态
     * @param id - 站点 ID
     * @param enabled - 是否启用
     */
    async setEnabled(id: number, enabled: boolean): Promise<void> {
      await this.updateFields(id, { enabled: boolToInt(enabled) })
    }
  }
}
