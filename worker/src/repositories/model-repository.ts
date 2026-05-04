import { all, nowIso, toApiSiteModel } from '../db'
import type { ApiSiteModel } from '../types'

/**
 * 模型仓库工厂函数
 * @param db - D1 数据库
 * @returns 模型仓库对象
 */
export function modelRepository(db: D1Database) {
  return {
    /**
     * 更新或插入模型
     * @param siteId - 站点 ID
     * @param models - 模型名称列表
     */
    async upsertModels(siteId: number, models: string[]): Promise<void> {
      for (const modelName of Array.from(new Set(models.map(m => m.trim()).filter(Boolean)))) {
        await db.prepare(`
          INSERT INTO api_site_models (site_id, model_name, model_type, is_active, created_at)
          VALUES (?, ?, '', 1, ?)
          ON CONFLICT(site_id, model_name) DO UPDATE SET model_type = excluded.model_type
        `).bind(siteId, modelName, nowIso()).run()
      }
    },

    /**
     * 按站点 ID 获取模型列表
     * @param siteId - 站点 ID
     * @returns Promise<ApiSiteModel[]> - 模型列表
     */
    async getBySiteId(siteId: number): Promise<ApiSiteModel[]> {
      const rows = await all<Record<string, unknown>>(db.prepare('SELECT * FROM api_site_models WHERE site_id = ? ORDER BY model_name ASC').bind(siteId))
      return rows.map(toApiSiteModel)
    },

    /**
     * 删除站点的所有模型
     * @param siteId - 站点 ID
     */
    async deleteBySiteId(siteId: number): Promise<void> {
      await db.prepare('DELETE FROM api_site_models WHERE site_id = ?').bind(siteId).run()
    }
  }
}
