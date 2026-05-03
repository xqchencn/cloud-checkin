import { checkinLogRepository } from '../repositories/checkin-log-repository'
import { taskLogRepository } from '../repositories/task-log-repository'
import { jsonError, jsonOk } from '../response'
import { getShanghaiDateString } from '../services/scheduler-service'
import type { Env } from '../types'

export async function handleLogRoutes(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url)

  if (url.pathname === '/api/checkin-logs' && request.method === 'GET') {
    return jsonOk(await checkinLogRepository(env.DB).paginate({
      siteId: url.searchParams.get('site_id') ? Number(url.searchParams.get('site_id')) : undefined,
      status: url.searchParams.get('status') || undefined,
      checkinType: url.searchParams.get('checkin_type') || undefined,
      page: Number(url.searchParams.get('page') || 1),
      pageSize: Number(url.searchParams.get('page_size') || 20)
    }))
  }

  if (url.pathname === '/api/checkin-logs' && request.method === 'DELETE') {
    const deleted = await checkinLogRepository(env.DB).clearAll()
    return jsonOk({ deleted_count: deleted, success: true, message: `已清空 ${deleted} 条签到日志` })
  }

  if (url.pathname === '/api/task-logs/today-status' && request.method === 'GET') {
    return jsonOk(await taskLogRepository(env.DB).todayStatus(getShanghaiDateString(new Date())))
  }

  if (url.pathname === '/api/task-logs' && request.method === 'GET') {
    return jsonOk(await taskLogRepository(env.DB).paginate({
      siteId: url.searchParams.get('site_id') ? Number(url.searchParams.get('site_id')) : undefined,
      taskType: url.searchParams.get('task_type') || undefined,
      status: url.searchParams.get('status') || undefined,
      page: Number(url.searchParams.get('page') || 1),
      pageSize: Number(url.searchParams.get('page_size') || 20)
    }))
  }

  if (url.pathname === '/api/task-logs' && request.method === 'DELETE') {
    const deleted = await taskLogRepository(env.DB).clearAll()
    return jsonOk({ deleted_count: deleted, success: true, message: `已清空 ${deleted} 条定时任务日志` })
  }

  const siteLogs = url.pathname.match(/^\/api\/sites\/(\d+)\/task-logs$/)
  if (siteLogs && request.method === 'GET') {
    return jsonOk(await taskLogRepository(env.DB).paginate({
      siteId: Number(siteLogs[1]),
      page: Number(url.searchParams.get('page') || 1),
      pageSize: Number(url.searchParams.get('page_size') || 20)
    }))
  }

  return jsonError('NOT_FOUND', '日志接口不存在', 404)
}
