import { isAuthenticated } from './auth'
import { jsonError, jsonOk, toErrorResponse } from './response'
import { handleAuth } from './routes/auth'
import { handleCheckinRoutes } from './routes/checkin'
import { handleLogRoutes } from './routes/logs'
import { handleModelRoutes } from './routes/models'
import { handleSettingsRoutes } from './routes/settings'
import { handleSiteRoutes } from './routes/sites'
import { handleTokenRoutes } from './routes/tokens'
import { runScheduledEvent } from './services/scheduler-service'
import type { Env } from './types'

async function handleApi(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url)

  if (url.pathname === '/api/health') {
    return jsonOk({ ok: true, service: 'cloud-checkin' })
  }

  if (url.pathname.startsWith('/api/auth/')) {
    return handleAuth(request, env)
  }

  if (!(await isAuthenticated(request, env))) {
    return jsonError('UNAUTHORIZED', '请先登录', 401)
  }

  // 路由按“更具体优先”匹配，避免 `/api/sites/...` 抢走日志和设置这类子资源接口。
  if (
    url.pathname.startsWith('/api/settings') ||
    url.pathname.startsWith('/api/checkin-logs') ||
    url.pathname.startsWith('/api/task-logs') ||
    /^\/api\/sites\/\d+\/task-logs$/.test(url.pathname)
  ) {
    if (url.pathname.startsWith('/api/settings')) return handleSettingsRoutes(request, env)
    return handleLogRoutes(request, env, ctx)
  }
  if (
    url.pathname === '/api/sites/batch-checkin' ||
    url.pathname === '/api/sites/concurrent-checkin' ||
    url.pathname === '/api/sites/checkin-auto' ||
    url.pathname === '/api/sites/checkin/today-statistics' ||
    url.pathname === '/api/sites/batch-refresh-balance' ||
    url.pathname === '/api/sites/balance-summary' ||
    url.pathname === '/api/sites/batch-sync-tokens' ||
    /^\/api\/sites\/\d+\/(checkin|refresh-balance|sync-tokens|checkin-statistics|checkin-logs)$/.test(url.pathname)
  ) {
    return handleCheckinRoutes(request, env, ctx)
  }
  if (
    /^\/api\/sites\/\d+\/models(\/refresh)?$/.test(url.pathname)
  ) {
    return handleModelRoutes(request, env, ctx)
  }
  if (url.pathname.startsWith('/api/tokens') || /^\/api\/sites\/\d+\/(tokens|remote-tokens|remote-tokens\/.+|remote-token-groups)$/.test(url.pathname)) {
    return handleTokenRoutes(request, env, ctx)
  }
  if (url.pathname.startsWith('/api/sites')) {
    return handleSiteRoutes(request, env, ctx)
  }

  return jsonError('NOT_FOUND', '接口不存在', 404)
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url)

      if (url.pathname.startsWith('/api/')) {
        return await handleApi(request, env, ctx)
      }

      return env.ASSETS.fetch(request)
    } catch (error) {
      return toErrorResponse(error)
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduledEvent(env, { cron: event.cron }))
  }
}
