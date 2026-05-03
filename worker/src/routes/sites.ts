import { getSiteCookies } from '../services/api-client'
import { siteService } from '../services/site-service'
import { jsonError, jsonOk, readJson } from '../response'
import type { Env } from '../types'

function idFromPath(pathname: string): number | null {
  const match = pathname.match(/^\/api\/sites\/(\d+)/)
  return match ? Number(match[1]) : null
}

export async function handleSiteRoutes(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url)
  const service = siteService(env)

  if (url.pathname === '/api/sites' && request.method === 'GET') {
    return jsonOk(await service.list())
  }

  if (url.pathname === '/api/sites/enabled' && request.method === 'GET') {
    return jsonOk(await service.listEnabled())
  }

  if (url.pathname === '/api/sites/statistics' && request.method === 'GET') {
    return jsonOk(await service.statistics())
  }

  if (url.pathname === '/api/sites/match' && request.method === 'GET') {
    return jsonOk(await service.matchByUrl(url.searchParams.get('url') || ''))
  }

  if (url.pathname === '/api/sites/export' && request.method === 'GET') {
    const sites = await service.list()
    return jsonOk(JSON.stringify(await service.export(sites), null, 2))
  }

  if (url.pathname === '/api/sites/import' && request.method === 'POST') {
    const body = await readJson<{ jsonData?: string }>(request)
    return jsonOk(await service.import(body.jsonData || '[]'))
  }

  if (url.pathname === '/api/sites' && request.method === 'POST') {
    const body = await readJson<Record<string, unknown>>(request)
    const id = await service.create(body)
    return jsonOk({ id }, { status: 201 })
  }

  const id = idFromPath(url.pathname)
  if (id === null) return jsonError('NOT_FOUND', '站点接口不存在', 404)

  if (url.pathname === `/api/sites/${id}` && request.method === 'GET') {
    return jsonOk(await service.get(id))
  }

  if (url.pathname === `/api/sites/${id}` && request.method === 'PUT') {
    const body = await readJson<Record<string, unknown>>(request)
    await service.update(id, body)
    return jsonOk({ id })
  }

  if (url.pathname === `/api/sites/${id}` && request.method === 'DELETE') {
    await service.delete(id)
    return jsonOk({ id })
  }

  if (url.pathname === `/api/sites/${id}/fetch-cookie` && request.method === 'POST') {
    const site = await service.get(id)
    return jsonOk({ cookie: await getSiteCookies(site.url) })
  }

  if (url.pathname === `/api/sites/${id}/test-auth` && request.method === 'POST') {
    const site = await service.get(id)
    return jsonOk({ ok: Boolean(site.auth_value || site.auth_method === 'password') })
  }

  return jsonError('NOT_FOUND', '站点接口不存在', 404)
}
