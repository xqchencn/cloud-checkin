import { tokenService } from '../services/token-service'
import { jsonError, jsonOk, readJson } from '../response'
import type { Env } from '../types'

function match(pathname: string, pattern: RegExp): RegExpMatchArray | null {
  return pathname.match(pattern)
}

export async function handleTokenRoutes(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url)
  const service = tokenService(env)

  const siteTokens = match(url.pathname, /^\/api\/sites\/(\d+)\/tokens$/)
  if (siteTokens && request.method === 'GET') {
    return jsonOk(await service.getTokens(Number(siteTokens[1])))
  }

  const siteStats = match(url.pathname, /^\/api\/sites\/(\d+)\/token-statistics$/)
  if (siteStats && request.method === 'GET') {
    const tokens = await service.getTokens(Number(siteStats[1]))
    return jsonOk({
      total_tokens: tokens.length,
      active_tokens: tokens.filter(token => token.is_active === 1).length,
      inactive_tokens: tokens.filter(token => token.is_active !== 1).length,
      total_quota: tokens.reduce((sum, token) => sum + Number(token.token_quota || 0), 0),
      total_used_quota: tokens.reduce((sum, token) => sum + Number(token.token_used_quota || 0), 0)
    })
  }

  const active = match(url.pathname, /^\/api\/tokens\/(\d+)\/active$/)
  if (active && request.method === 'PATCH') {
    const body = await readJson<{ is_active?: number; active?: boolean }>(request)
    const value = body.is_active ?? (body.active ? 1 : 0)
    await service.updateTokenActive(Number(active[1]), value)
    return jsonOk({ id: Number(active[1]), is_active: value })
  }

  const del = match(url.pathname, /^\/api\/tokens\/(\d+)$/)
  if (del && request.method === 'DELETE') {
    await service.deleteToken(Number(del[1]))
    return jsonOk({ id: Number(del[1]) })
  }

  const remoteCreate = match(url.pathname, /^\/api\/sites\/(\d+)\/remote-tokens$/)
  if (remoteCreate && request.method === 'POST') {
    const body = await readJson<{ tokenName?: string; token_name?: string; group?: string }>(request)
    await service.createRemoteToken(Number(remoteCreate[1]), body.tokenName || body.token_name || '', body.group || 'default')
    return jsonOk({ ok: true })
  }

  const remoteUpdate = match(url.pathname, /^\/api\/sites\/(\d+)\/remote-tokens\/(.+)$/)
  if (remoteUpdate && request.method === 'PUT') {
    const body = await readJson<{ tokenName?: string; token_name?: string; group?: string }>(request)
    await service.updateRemoteToken(Number(remoteUpdate[1]), decodeURIComponent(remoteUpdate[2]), body.tokenName || body.token_name || '', body.group || 'default')
    return jsonOk({ ok: true })
  }

  if (remoteUpdate && request.method === 'DELETE') {
    await service.deleteRemoteToken(Number(remoteUpdate[1]), decodeURIComponent(remoteUpdate[2]))
    return jsonOk({ ok: true })
  }

  const groups = match(url.pathname, /^\/api\/sites\/(\d+)\/remote-token-groups$/)
  if (groups && request.method === 'GET') {
    return jsonOk(await service.getRemoteTokenGroups(Number(groups[1])))
  }

  return jsonError('NOT_FOUND', 'Token 接口不存在', 404)
}
