import { checkinLogRepository } from '../repositories/checkin-log-repository'
import { balanceService } from '../services/balance-service'
import { checkinService } from '../services/checkin-service'
import { tokenService } from '../services/token-service'
import { jsonError, jsonOk, readJson } from '../response'
import type { Env } from '../types'

function idFrom(pathname: string, pattern: RegExp): number | null {
  const match = pathname.match(pattern)
  return match ? Number(match[1]) : null
}

export async function handleCheckinRoutes(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url)
  const checkins = checkinService(env)
  const balances = balanceService(env)
  const tokens = tokenService(env)

  if (url.pathname === '/api/sites/batch-checkin' && request.method === 'POST') {
    const body = await readJson<{ site_ids?: number[] }>(request)
    return jsonOk(await checkins.batchCheckin(body.site_ids || []))
  }

  if (url.pathname === '/api/sites/concurrent-checkin' && request.method === 'POST') {
    const body = await readJson<{ site_ids?: number[] }>(request)
    return jsonOk(await checkins.batchCheckin(body.site_ids || []))
  }

  if (url.pathname === '/api/sites/checkin-auto' && request.method === 'POST') {
    return jsonOk(await checkins.checkinAllAutoSites())
  }

  if (url.pathname === '/api/sites/checkin/today-statistics' && request.method === 'GET') {
    return jsonOk(await checkinLogRepository(env.DB).todayStatistics())
  }

  if (url.pathname === '/api/sites/batch-refresh-balance' && request.method === 'POST') {
    const body = await readJson<{ site_ids?: number[] }>(request)
    return jsonOk(await balances.batchQueryBalance(body.site_ids || []))
  }

  if (url.pathname === '/api/sites/balance-summary' && request.method === 'GET') {
    return jsonOk(await balances.getBalanceSummary())
  }

  if (url.pathname === '/api/sites/batch-sync-tokens' && request.method === 'POST') {
    const body = await readJson<{ site_ids?: number[] }>(request)
    return jsonOk(await tokens.batchSyncTokens(body.site_ids || []))
  }

  const checkinId = idFrom(url.pathname, /^\/api\/sites\/(\d+)\/checkin$/)
  if (checkinId && request.method === 'POST') {
    return jsonOk(await checkins.checkin(checkinId, 'manual'))
  }

  const balanceId = idFrom(url.pathname, /^\/api\/sites\/(\d+)\/refresh-balance$/)
  if (balanceId && request.method === 'POST') {
    return jsonOk(await balances.queryUserInfo(balanceId))
  }

  const syncId = idFrom(url.pathname, /^\/api\/sites\/(\d+)\/sync-tokens$/)
  if (syncId && request.method === 'POST') {
    return jsonOk(await tokens.syncTokens(syncId))
  }

  const statId = idFrom(url.pathname, /^\/api\/sites\/(\d+)\/checkin-statistics$/)
  if (statId && request.method === 'GET') {
    const logs = await checkinLogRepository(env.DB).latest(statId, 200)
    const success = logs.filter(log => log.status === 'success' || log.status === 'already_checked_in').length
    return jsonOk({
      total_count: logs.length,
      success_count: success,
      failed_count: logs.filter(log => log.status === 'failed' || log.status === 'error').length,
      success_rate: logs.length ? success / logs.length : 0
    })
  }

  const logId = idFrom(url.pathname, /^\/api\/sites\/(\d+)\/checkin-logs$/)
  if (logId && request.method === 'GET') {
    return jsonOk(await checkinLogRepository(env.DB).latest(logId, Number(url.searchParams.get('limit') || 20)))
  }

  return jsonError('NOT_FOUND', '签到/余额接口不存在', 404)
}
