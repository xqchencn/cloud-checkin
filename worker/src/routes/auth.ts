import { clearSessionCookie, createSessionCookie, isAuthenticated } from '../auth'
import { jsonError, jsonOk } from '../response'
import { settingsService } from '../services/settings-service'
import type { Env } from '../types'

/**
 * 处理认证相关路由
 * @param request - HTTP 请求
 * @param env - 环境变量
 * @returns Promise<Response> - HTTP 响应
 */
export async function handleAuth(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)

  // 获取当前用户认证状态
  if (url.pathname === '/api/auth/me' && request.method === 'GET') {
    return jsonOk({ authenticated: await isAuthenticated(request, env) })
  }

  // 用户登出
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    return jsonOk({ authenticated: false }, { headers: { 'set-cookie': clearSessionCookie(request.url) } })
  }

  // 用户登录
  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    const body = await request.json<{ password?: string }>().catch(() => ({} as { password?: string }))
    if (!body.password || !(await settingsService(env).verifyLoginPassword(body.password))) {
      return jsonError('INVALID_PASSWORD', '密码错误', 401)
    }
    return jsonOk({ authenticated: true }, { headers: { 'set-cookie': await createSessionCookie(env, request.url) } })
  }

  // 未找到的认证接口
  return jsonError('NOT_FOUND', '认证接口不存在', 404)
}
