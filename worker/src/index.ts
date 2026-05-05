import { isAuthenticated } from './auth'
import { jsonError, jsonOk, toErrorResponse } from './response'
import { handleAuth } from './routes/auth'
import { handleCheckinRoutes } from './routes/checkin'
import { handleLogRoutes } from './routes/logs'
import { handleHfSpaceRoutes } from './routes/hf-spaces'
import { handleModelRoutes } from './routes/models'
import { handleSettingsRoutes } from './routes/settings'
import { handleSiteRoutes } from './routes/sites'
import { handleTokenRoutes } from './routes/tokens'
import { runScheduledEvent } from './services/scheduler-service'
import type { Env } from './types'

/**
 * 处理 API 请求的主函数
 * @param request - HTTP 请求对象
 * @param env - 环境变量
 * @param ctx - Cloudflare 执行上下文
 * @returns Promise<Response> - HTTP 响应
 */
async function handleApi(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url)

  // 健康检查接口
  if (url.pathname === '/api/health') {
    return jsonOk({ ok: true, service: 'cloud-checkin' })
  }

  // 认证相关接口
  if (url.pathname.startsWith('/api/auth/')) {
    return handleAuth(request, env)
  }

  // 检查用户是否已认证
  if (!(await isAuthenticated(request, env))) {
    return jsonError('UNAUTHORIZED', '请先登录', 401)
  }

  if (url.pathname.startsWith('/api/hf-spaces')) {
    return handleHfSpaceRoutes(request, env, ctx)
  }

  // 路由按”更具体优先”匹配，避免 `/api/sites/...` 抢走日志和设置这类子资源接口。
  // 处理设置、签到日志、任务日志等接口
  if (
    url.pathname.startsWith('/api/settings') ||
    url.pathname.startsWith('/api/checkin-logs') ||
    url.pathname.startsWith('/api/task-logs') ||
    /^\/api\/sites\/\d+\/task-logs$/.test(url.pathname)
  ) {
    if (url.pathname.startsWith('/api/settings')) return handleSettingsRoutes(request, env)
    return handleLogRoutes(request, env, ctx)
  }

  // 处理签到相关接口
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

  // 处理模型相关接口
  if (
    /^\/api\/sites\/\d+\/models(\/refresh)?$/.test(url.pathname)
  ) {
    return handleModelRoutes(request, env, ctx)
  }

  // 处理 Token 相关接口
  if (url.pathname.startsWith('/api/tokens') || /^\/api\/sites\/\d+\/(tokens|remote-tokens|remote-tokens\/.+|remote-token-groups)$/.test(url.pathname)) {
    return handleTokenRoutes(request, env, ctx)
  }

  // 处理站点相关接口
  if (url.pathname.startsWith('/api/sites')) {
    return handleSiteRoutes(request, env, ctx)
  }

  // 未找到的接口
  return jsonError('NOT_FOUND', '接口不存在', 404)
}

/**
 * Cloudflare Worker 主入口
 */
export default {
  /**
   * 处理 HTTP 请求
   * @param request - HTTP 请求对象
   * @param env - 环境变量
   * @param ctx - Cloudflare 执行上下文
   * @returns Promise<Response> - HTTP 响应
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url)

      // API 请求处理
      if (url.pathname.startsWith('/api/')) {
        return await handleApi(request, env, ctx)
      }

      // 静态资源请求
      return env.ASSETS.fetch(request)
    } catch (error) {
      return toErrorResponse(error)
    }
  },

  /**
   * 处理定时任务
   * @param event - 定时任务事件
   * @param env - 环境变量
   * @param ctx - Cloudflare 执行上下文
   * @returns Promise<void>
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduledEvent(env, { cron: event.cron }))
  }
}
