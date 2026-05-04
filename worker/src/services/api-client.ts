import { ApiHttpError } from '../response'
import type { ApiSite } from '../types'
import { getUserIdHeaders, requiresUserId } from './site-types'

export interface RemoteResponse<T = Record<string, unknown>> {
  data: T
  responseTimeMs: number
  status: number
  headers: Headers
}

interface RuntimeAuthCredential {
  token?: string
  cookie?: string
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

export function buildAuthHeaders(site: ApiSite, sessions = '', cookies = '', runtimeAuth: RuntimeAuthCredential | null = null): Headers {
  const headers = new Headers()
  headers.set('accept', 'application/json, text/plain, */*')
  headers.set('content-type', 'application/json')
  headers.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

  const authValue = sessions || site.auth_value || ''
  if (site.auth_method === 'token' && authValue) {
    setBearerAuthorization(headers, runtimeAuth?.token || authValue)
  } else if (site.auth_method === 'sessions' && authValue) {
    const sessionAuth = parseSessionAuthValue(authValue)
    const token = runtimeAuth?.token || sessionAuth?.token || ''
    if (token) setBearerAuthorization(headers, token)
    const cookieValue = mergeCookieStrings(mergeCookieStrings(cookies, sessionAuth ? sessionAuth.cookie : authValue), runtimeAuth?.cookie || '')
    if (cookieValue) headers.set('cookie', cookieValue)
  } else if (site.auth_method === 'password') {
    // AnyRouter 的用户名密码模式是平台兼容特例：历史数据可能把登录后的 token/cookie 存在 auth_value。
    // 其他平台不能把登录用户名或密码字段当成远端 Cookie/Token 发送。
    const storedCredential = site.api_type === 'AnyRouter' ? credentialFromAnyRouterPasswordAuthValue(authValue) : {}
    const token = runtimeAuth?.token || storedCredential.token || ''
    if (token) setBearerAuthorization(headers, token)
    const cookieValue = mergeCookieStrings(mergeCookieStrings(cookies, storedCredential.cookie || ''), runtimeAuth?.cookie || '')
    if (cookieValue) headers.set('cookie', cookieValue)
  } else if (cookies) {
    const cookieValue = mergeCookieStrings(cookies, runtimeAuth?.cookie || '')
    if (cookieValue) headers.set('cookie', cookieValue)
  }

  if (requiresUserId(site.api_type)) {
    const userId = site.user_id || site.site_username
    if (userId) {
      for (const header of getUserIdHeaders(site.api_type)) {
        if (header) headers.set(header, userId)
      }
    }
  }

  return headers
}

function setBearerAuthorization(headers: Headers, value: string): void {
  const token = value.trim()
  if (!token) return
  headers.set('authorization', token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`)
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

function credentialFromAnyRouterPasswordAuthValue(value: string): RuntimeAuthCredential {
  const trimmed = value.trim()
  if (!trimmed) return {}
  if (trimmed.toLowerCase().startsWith('bearer ')) return { token: trimmed }
  if (looksLikeCookieAuthValue(trimmed)) return { cookie: trimmed }
  return { token: trimmed }
}

function looksLikeCookieAuthValue(value: string): boolean {
  return value.split(';').some(part => /^[^=;\s]+\s*=/.test(part.trim()))
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

function normalizeSetCookieHeader(value: string): string {
  if (!value) return ''
  return value
    .split(/,(?=[^;,]+=)/)
    .map(cookie => cookie.split(';')[0].trim())
    .filter(Boolean)
    .join('; ')
}

function parseJsonRecord(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function extractLoginAccessToken(data: Record<string, unknown>): string {
  const sources = [extractDataObject(data), data]
  for (const source of sources) {
    for (const field of ['token', 'access_token', 'accessToken']) {
      const value = source[field]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
  }
  return ''
}

function isAnyRouterPasswordSite(site: ApiSite): boolean {
  return site.api_type === 'AnyRouter' && site.auth_method === 'password'
}

function canLoginAnyRouterPassword(site: ApiSite): boolean {
  return isAnyRouterPasswordSite(site) && Boolean(site.login_username?.trim()) && Boolean(site.login_password)
}

function shouldLoginAnyRouterBeforeRequest(site: ApiSite, sessions: string): boolean {
  return canLoginAnyRouterPassword(site) && !sessions.trim() && !String(site.auth_value || '').trim()
}

function shouldReloginAnyRouterPassword(site: ApiSite, error: unknown): boolean {
  if (!canLoginAnyRouterPassword(site)) return false
  const message = error instanceof Error ? error.message : String(error)
  if (error instanceof ApiHttpError && (error.status === 401 || error.status === 403)) return true
  return isAuthExpiredMessage(message)
}

function isAuthExpiredMessage(message: string): boolean {
  return /invalid token|token expired|access token|unauthorized|forbidden|not login|not logged|未登录|登录过期|token.*失效|认证失败|鉴权失败/i.test(message)
}

function isRecordPayload(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function shouldReloginAnyRouterPasswordResponse(site: ApiSite, response: RemoteResponse<unknown>): boolean {
  if (!canLoginAnyRouterPassword(site) || !isRecordPayload(response.data)) return false
  if (isSuccessResponse(response.data)) return false
  return isAuthExpiredMessage(getRemoteMessage(response.data))
}

async function loginAnyRouterPassword(site: ApiSite, cookies = ''): Promise<RuntimeAuthCredential | null> {
  if (!canLoginAnyRouterPassword(site)) return null

  const headers = new Headers()
  headers.set('accept', 'application/json, text/plain, */*')
  headers.set('content-type', 'application/json')
  headers.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
  headers.set('x-requested-with', 'XMLHttpRequest')

  const storedCredential = credentialFromAnyRouterPasswordAuthValue(site.auth_value || '')
  const cookieValue = mergeCookieStrings(cookies, storedCredential.cookie || '')
  if (cookieValue) headers.set('cookie', cookieValue)

  let response: Response
  try {
    response = await fetch(buildApiEndpoint(site.url, '/api/user/login'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        username: site.login_username?.trim(),
        password: site.login_password
      })
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new ApiHttpError('REMOTE_LOGIN_FAILED', `AnyRouter 登录请求失败: ${message}`, 502)
  }

  const text = await response.text()
  const data = parseJsonRecord(text)
  if (!response.ok) {
    throw new ApiHttpError('REMOTE_LOGIN_FAILED', `AnyRouter 登录失败 HTTP ${response.status}: ${text.slice(0, 300)}`, response.status)
  }
  if (!data || !isSuccessResponse(data)) {
    throw new ApiHttpError('REMOTE_LOGIN_FAILED', `AnyRouter 登录失败: ${data ? getRemoteMessage(data) : text.slice(0, 300)}`, 502)
  }

  const token = extractLoginAccessToken(data)
  if (token) return { token }

  const cookie = normalizeSetCookieHeader(response.headers.get('set-cookie') || '')
  if (cookie) return { cookie }

  throw new ApiHttpError('REMOTE_LOGIN_FAILED', 'AnyRouter 登录成功但未返回可用 token 或 cookie', 502)
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
  const requestBody = body === undefined || body === null ? undefined : JSON.stringify(body)
  const send = (runtimeAuth: RuntimeAuthCredential | null = null) => apiRequest<T>(url, {
    method,
    headers: buildAuthHeaders(site, sessions, cookies, runtimeAuth),
    body: requestBody
  })

  const sendAndMaybeRelogin = async (runtimeAuth: RuntimeAuthCredential | null = null) => {
    try {
      const response = await send(runtimeAuth)
      if (!shouldReloginAnyRouterPasswordResponse(site, response)) return response
      const refreshedAuth = await loginAnyRouterPassword(site, cookies)
      if (!refreshedAuth) return response
      return send(refreshedAuth)
    } catch (error) {
      if (!shouldReloginAnyRouterPassword(site, error)) throw error
      const refreshedAuth = await loginAnyRouterPassword(site, cookies)
      if (!refreshedAuth) throw error
      return send(refreshedAuth)
    }
  }

  const runtimeAuth = shouldLoginAnyRouterBeforeRequest(site, sessions) ? await loginAnyRouterPassword(site, cookies) : null
  return sendAndMaybeRelogin(runtimeAuth)
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
