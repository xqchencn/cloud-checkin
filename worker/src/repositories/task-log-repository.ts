import { all, buildLimitOffset, nowIso, one } from '../db'
import type { Paginated, TaskLogDisplay } from '../types'

export type TaskType = 'checkin' | 'sync_token' | 'query_balance'
export type TaskStatus = 'success' | 'failed' | 'pending'

const taskColumns: Record<TaskType, { status: string; time: string; message: string; error: string }> = {
  checkin: { status: 'checkin_status', time: 'checkin_time', message: 'checkin_message', error: 'checkin_error' },
  sync_token: { status: 'sync_token_status', time: 'sync_token_time', message: 'sync_token_message', error: 'sync_token_error' },
  query_balance: { status: 'query_balance_status', time: 'query_balance_time', message: 'query_balance_message', error: 'query_balance_error' }
}

export function taskLogRepository(db: D1Database) {
  return {
    async insertTask(siteId: number, logDate: string, taskType: TaskType, status: TaskStatus, message: string, error: string): Promise<void> {
      const columns = taskColumns[taskType]
      await db.prepare(`
        INSERT INTO api_site_task_logs (
          api_site_id, log_date, ${columns.status}, ${columns.time}, ${columns.message}, ${columns.error}, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(siteId, logDate, status, nowIso(), message, error || null, nowIso(), nowIso()).run()
    },

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

    async clearAll(): Promise<number> {
      const row = await one<{ count: number }>(db.prepare('SELECT COUNT(*) AS count FROM api_site_task_logs'))
      await db.prepare('DELETE FROM api_site_task_logs').run()
      return Number(row?.count ?? 0)
    },

    async deleteOlderThan(cutoffIso: string): Promise<number> {
      const row = await one<{ count: number }>(
        db.prepare("SELECT COUNT(*) AS count FROM api_site_task_logs WHERE datetime(created_at) < datetime(?)").bind(cutoffIso)
      )
      await db.prepare("DELETE FROM api_site_task_logs WHERE datetime(created_at) < datetime(?)").bind(cutoffIso).run()
      return Number(row?.count ?? 0)
    }
  }
}
