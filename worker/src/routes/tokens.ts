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

  const value = match(url.pathname, /^\/api\/tokens\/(\d+)\/value$/)
  if (value && request.method === 'GET') {
    return jsonOk(await service.getTokenValue(Number(value[1])))
  }

  const remoteCreate = match(url.pathname, /^\/api\/sites\/(\d+)\/remote-tokens$/)
  if (remoteCreate && request.method === 'POST') {
    const body = await readJson<{ tokenName?: string; token_name?: string; group?: string }>(request)
    await service.createRemoteToken(Number(remoteCreate[1]), body.tokenName || body.token_name || '', body.group || 'default')
    return jsonOk({ ok: true })
  }

  const remoteUpdate = match(url.pathname, /^\/api\/sites\/(\d+)\/remote-tokens\/(.+)$/)
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
