import { getSiteCookies } from '../services/api-client'
import { detectSiteFromUrl } from '../services/site-detection-service'
import { siteService } from '../services/site-service'
import { jsonError, jsonOk, readJson } from '../response'
import type { Env } from '../types'

function idFromPath(pathname: string): number | null {
  const match = pathname.match(/^\/api\/sites\/(\d+)/)
  return match ? Number(match[1]) : null
}

async function fetchHtmlTitle(rawUrl: string): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2000)
  const targetUrl = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) return null
    const html = await response.text()
    return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
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

  if (url.pathname === '/api/sites/grouped' && request.method === 'GET') {
    return jsonOk(await service.grouped())
  }

  if (url.pathname === '/api/sites/export' && request.method === 'GET') {
    const sites = await service.list()
    return jsonOk(JSON.stringify(await service.export(sites, url.searchParams.get('include_sensitive') === 'true'), null, 2))
  }

  if (url.pathname === '/api/sites/import' && request.method === 'POST') {
    const body = await readJson<{ jsonData?: string }>(request)
    return jsonOk(await service.import(body.jsonData || '[]'))
  }

  if (url.pathname === '/api/sites/detect' && request.method === 'POST') {
    const body = await readJson<{ url?: string; htmlTitle?: string; fetchTitle?: boolean; detectPreset?: boolean }>(request)
    if (!body.url || !body.url.trim()) return jsonError('BAD_REQUEST', '请输入站点网址', 400)
    try {
      const htmlTitle = body.htmlTitle || (body.fetchTitle ? await fetchHtmlTitle(body.url) : null)
      return jsonOk(detectSiteFromUrl({ url: body.url, htmlTitle, detectPreset: body.detectPreset !== false }))
    } catch {
      // URL 解析错误属于用户输入问题，不能交给全局异常处理变成 500。
      return jsonError('BAD_REQUEST', '站点网址格式不正确', 400)
    }
  }

  if (url.pathname === '/api/sites/batch-update-by-url' && request.method === 'POST') {
    const body = await readJson<Record<string, unknown>>(request)
    return jsonOk(await service.batchUpdateByUrl(body))
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

  if (url.pathname === `/api/sites/${id}/rebind-auth` && request.method === 'POST') {
    const body = await readJson<Record<string, unknown>>(request)
    await service.rebindAuth(id, body)
    return jsonOk({ id })
  }

  return jsonError('NOT_FOUND', '站点接口不存在', 404)
}
