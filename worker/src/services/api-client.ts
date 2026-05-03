import { ApiHttpError } from '../response'
import type { ApiSite } from '../types'
import { getUserIdHeader, requiresUserId } from './site-types'

export interface RemoteResponse<T = Record<string, unknown>> {
  data: T
  responseTimeMs: number
  status: number
  headers: Headers
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function shouldRetryError(error: unknown): boolean {
  if (error instanceof ApiHttpError) return error.status >= 500
  const message = error instanceof Error ? error.message : String(error)
  return /internal error|database is locked|SQLITE_BUSY|network|timeout|fetch failed/i.test(message)
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 700): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt >= retries || !shouldRetryError(error)) break
      await delay(delayMs * (attempt + 1))
    }
  }
  throw lastError
}

export function normalizeUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/\/+$/, '')
}

export function isFullUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

export function buildApiEndpoint(baseUrl: string, path: string): string {
  if (isFullUrl(path)) return path.trim()
  return `${normalizeUrl(baseUrl)}/${path.replace(/^\/+/, '')}`
}

export function extractString(data: Record<string, unknown>, field: string): string | null {
  const value = data[field]
  if (value === undefined || value === null) return null
  return String(value)
}

export function extractNumber(data: Record<string, unknown>, field: string): number {
  return extractOptionalNumber(data, field) ?? 0
}

export function extractOptionalNumber(data: Record<string, unknown>, field: string): number | null {
  if (!(field in data)) return null
  const value = data[field]
  if (value === undefined || value === null) return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function extractBoolean(data: Record<string, unknown>, field: string): boolean | null {
  const value = data[field]
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return value === 'true' || value === '1'
  return null
}

export function getNestedObject(data: Record<string, unknown>, field: string): Record<string, unknown> | null {
  const value = data[field]
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

export function extractDataObject(data: Record<string, unknown>): Record<string, unknown> {
  const nested = getNestedObject(data, 'data')
  const result = getNestedObject(data, 'result')
  return nested ?? result ?? data
}

export function isSuccessResponse(data: Record<string, unknown>): boolean {
  if (typeof data.success === 'boolean') return data.success
  if (typeof data.status === 'string') return ['success', 'ok'].includes(data.status.toLowerCase())
  if (typeof data.code === 'number') return data.code === 0 || data.code === 200
  return true
}

export function getRemoteMessage(data: Record<string, unknown>): string {
  return extractString(data, 'message') || extractString(data, 'msg') || JSON.stringify(data)
}

export function buildAuthHeaders(site: ApiSite, sessions = '', cookies = ''): Headers {
  const headers = new Headers()
  headers.set('accept', 'application/json, text/plain, */*')
  headers.set('content-type', 'application/json')
  headers.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

  const authValue = sessions || site.auth_value || ''
  if (site.auth_method === 'token' && authValue) {
    headers.set('authorization', authValue.toLowerCase().startsWith('bearer ') ? authValue : `Bearer ${authValue}`)
  } else if (site.auth_method === 'sessions' && authValue) {
    const sessionAuth = parseSessionAuthValue(authValue)
    if (sessionAuth?.token) {
      headers.set('authorization', sessionAuth.token.toLowerCase().startsWith('bearer ') ? sessionAuth.token : `Bearer ${sessionAuth.token}`)
    }
    const cookieValue = mergeCookieStrings(cookies, sessionAuth ? sessionAuth.cookie : authValue)
    if (cookieValue) headers.set('cookie', cookieValue)
  } else if (site.auth_method === 'password' && authValue) {
    const cookieValue = mergeCookieStrings(cookies, authValue)
    if (cookieValue) headers.set('cookie', cookieValue)
  } else if (cookies) {
    headers.set('cookie', cookies)
  }

  if (requiresUserId(site.api_type)) {
    const userId = site.user_id || site.site_username
    const header = getUserIdHeader(site.api_type)
    if (userId && header) headers.set(header, userId)
  }

  return headers
}

function parseSessionAuthValue(value: string): { token: string; cookie: string } | null {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    return {
      token: typeof parsed.token === 'string' ? parsed.token : '',
      cookie: typeof parsed.cookie === 'string' ? parsed.cookie : ''
    }
  } catch {
    return null
  }
}

export function mergeCookieStrings(left: string, right: string): string {
  const map = new Map<string, string>()
  for (const source of [left, right]) {
    for (const part of source.split(';')) {
      const text = part.trim()
      if (!text || !text.includes('=')) continue
      const [key, ...rest] = text.split('=')
      map.set(key.trim(), rest.join('=').trim())
    }
  }
  return Array.from(map.entries()).map(([key, value]) => `${key}=${value}`).join('; ')
}

export async function apiRequest<T = Record<string, unknown>>(input: RequestInfo, init: RequestInit = {}): Promise<RemoteResponse<T>> {
  const started = Date.now()
  let response: Response
  try {
    response = await fetch(input, init)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new ApiHttpError('REMOTE_NETWORK_ERROR', `远程请求失败: ${message}`, 502)
  }
  const responseTimeMs = Date.now() - started
  const contentType = response.headers.get('content-type') || ''
  const text = await response.text()

  if (!response.ok) {
    throw new ApiHttpError('REMOTE_HTTP_ERROR', `远程请求失败 HTTP ${response.status}: ${text.slice(0, 300)}`, response.status)
  }

  if (!contentType.includes('json')) {
    throw new ApiHttpError('REMOTE_PARSE_ERROR', `远程响应不是 JSON: ${text.slice(0, 300)}`, 502)
  }

  try {
    return {
      data: JSON.parse(text) as T,
      responseTimeMs,
      status: response.status,
      headers: response.headers
    }
  } catch {
    throw new ApiHttpError('REMOTE_PARSE_ERROR', `远程 JSON 解析失败: ${text.slice(0, 300)}`, 502)
  }
}

export async function requestWithSite<T = Record<string, unknown>>(
  site: ApiSite,
  method: string,
  url: string,
  body?: unknown,
  sessions = '',
  cookies = ''
): Promise<RemoteResponse<T>> {
  return apiRequest<T>(url, {
    method,
    headers: buildAuthHeaders(site, sessions, cookies),
    body: body === undefined || body === null ? undefined : JSON.stringify(body)
  })
}

export async function getSiteCookies(siteUrl: string): Promise<string> {
  // 有些站点要求先访问首页或静态资源拿基础 cookie，后续 API 请求才会放行。
  const candidates = [buildApiEndpoint(siteUrl, '/logo.png'), normalizeUrl(siteUrl)]
  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      const setCookie = response.headers.get('set-cookie')
      if (setCookie) return setCookie.split(',').map(c => c.split(';')[0].trim()).filter(Boolean).join('; ')
    } catch {
      continue
    }
  }
  return ''
}
