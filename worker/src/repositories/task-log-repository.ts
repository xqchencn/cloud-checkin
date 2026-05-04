import { all, buildLimitOffset, nowIso, one } from '../db'
import type { Paginated, TaskLogDisplay } from '../types'

/**
 * 任务类型定义
 */
export type TaskType = 'checkin' | 'sync_token' | 'query_balance'

/**
 * 任务状态定义
 */
export type TaskStatus = 'success' | 'failed' | 'pending'

/**
 * 任务列映射配置
 * 定义不同任务类型对应的数据库列名
 */
const taskColumns: Record<TaskType, { status: string; time: string; message: string; error: string }> = {
  checkin: { status: 'checkin_status', time: 'checkin_time', message: 'checkin_message', error: 'checkin_error' },
  sync_token: { status: 'sync_token_status', time: 'sync_token_time', message: 'sync_token_message', error: 'sync_token_error' },
  query_balance: { status: 'query_balance_status', time: 'query_balance_time', message: 'query_balance_message', error: 'query_balance_error' }
}

/**
 * 任务日志仓库工厂函数
 * @param db - D1 数据库
 * @returns 任务日志仓库对象
 */
export function taskLogRepository(db: D1Database) {
  return {
    /**
     * 插入任务日志
     * @param siteId - 站点 ID
     * @param logDate - 日志日期
     * @param taskType - 任务类型
     * @param status - 任务状态
     * @param message - 任务消息
     * @param error - 错误信息
     */
    async insertTask(siteId: number, logDate: string, taskType: TaskType, status: TaskStatus, message: string, error: string): Promise<void> {
      const columns = taskColumns[taskType]
      await db.prepare(`
        INSERT INTO api_site_task_logs (
          api_site_id, log_date, ${columns.status}, ${columns.time}, ${columns.message}, ${columns.error}, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(siteId, logDate, status, nowIso(), message, error || null, nowIso(), nowIso()).run()
    },

    /**
     * 分页查询任务日志
     * @param params - 查询参数
     * @returns Promise<Paginated<TaskLogDisplay>> - 分页结果
     */
    async paginate(params: { siteId?: number; taskType?: string; status?: string; page?: number; pageSize?: number }): Promise<Paginated<TaskLogDisplay>> {
      const { limit, offset, page, pageSize } = buildLimitOffset(params.page, params.pageSize)
      const parts: string[] = []
      const args: unknown[] = []
      for (const [taskType, columns] of Object.entries(taskColumns)) {
        const where: string[] = [`l.${columns.status} IS NOT NULL`]
        if (params.siteId) {
          where.push('l.api_site_id = ?')
          args.push(params.siteId)
        }
        if (params.taskType && params.taskType !== taskType) {
          where.push('1 = 0')
        }
        if (params.status) {
          where.push(`l.${columns.status} = ?`)
          args.push(params.status)
        }
        parts.push(`
          SELECT l.id, l.api_site_id, s.name AS site_name, l.log_date, '${taskType}' AS task_type,
                 l.${columns.status} AS status, l.${columns.message} AS message,
                 l.${columns.error} AS error, l.${columns.time} AS exec_time
          FROM api_site_task_logs l
          LEFT JOIN api_sites s ON s.id = l.api_site_id
          WHERE ${where.join(' AND ')}
        `)
      }
      const union = parts.join(' UNION ALL ')
      const countRow = await one<{ count: number }>(db.prepare(`SELECT COUNT(*) AS count FROM (${union})`).bind(...args))
      const total = Number(countRow?.count ?? 0)
      const rows = await all<TaskLogDisplay>(db.prepare(`SELECT * FROM (${union}) ORDER BY datetime(exec_time) DESC, id DESC LIMIT ? OFFSET ?`).bind(...args, limit, offset))
      return {
        logs: rows,
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize)
      }
    },

    /**
     * 获取今日任务状态
     * @param logDate - 日志日期
     * @returns Promise<Record<string, unknown>[]> - 任务状态列表
     */
    async todayStatus(logDate: string): Promise<Record<string, unknown>[]> {
      return all<Record<string, unknown>>(db.prepare(`
        WITH latest_task_logs AS (
          SELECT *,
                 ROW_NUMBER() OVER (PARTITION BY api_site_id ORDER BY datetime(updated_at) DESC, id DESC) AS row_number
          FROM api_site_task_logs
          WHERE log_date = ?
        )
        SELECT s.id AS api_site_id, s.name AS site_name, ? AS log_date,
               l.checkin_status, l.checkin_message,
               l.sync_token_status, l.sync_token_message,
               l.query_balance_status, l.query_balance_message
        FROM api_sites s
        LEFT JOIN latest_task_logs l ON l.api_site_id = s.id AND l.row_number = 1
        WHERE s.enabled = 1
        ORDER BY s.id ASC
      `).bind(logDate, logDate))
    },

    /**
     * 清空所有任务日志
     * @returns Promise<number> - 删除数量
     */
    async clearAll(): Promise<number> {
      const row = await one<{ count: number }>(db.prepare('SELECT COUNT(*) AS count FROM api_site_task_logs'))
      await db.prepare('DELETE FROM api_site_task_logs').run()
      return Number(row?.count ?? 0)
    },

    /**
     * 删除旧的任务日志
     * @param cutoffIso - 截止时间
     * @returns Promise<number> - 删除数量
     */
    async deleteOlderThan(cutoffIso: string): Promise<number> {
      const row = await one<{ count: number }>(
        db.prepare("SELECT COUNT(*) AS count FROM api_site_task_logs WHERE datetime(created_at) < datetime(?)").bind(cutoffIso)
      )
      await db.prepare("DELETE FROM api_site_task_logs WHERE datetime(created_at) < datetime(?)").bind(cutoffIso).run()
      return Number(row?.count ?? 0)
    }
  }
}
