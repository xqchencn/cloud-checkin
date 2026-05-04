import type { Env } from './types'
import { settingsService } from './services/settings-service'

/** Session Cookie 名称 */
const SESSION_COOKIE = 'asm_session'

/**
 * Worker 里只保存一个带过期时间的 session cookie。
 * SESSION_SECRET 用来做 HMAC 签名，作用是防止浏览器端伪造或篡改 cookie；
 * 它不是用来加密数据库数据的。
 */

/**
 * 字节数组转 Base64 URL 编码
 * @param bytes - 字节数组
 * @returns Base64 URL 编码字符串
 */
function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (const byte of array) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

/**
 * Base64 URL 编码转字节数组
 * @param value - Base64 URL 编码字符串
 * @returns 字节数组
 */
function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4)
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0))
}

/**
 * 生成 HMAC 签名
 * @param secret - 密钥
 * @param payload - 载荷
 * @returns Promise<string> - 签名
 */
async function hmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return bytesToBase64Url(signature)
}

/**
 * 获取 Session TTL
 * @param env - 环境变量
 * @returns Promise<number> - Session TTL 秒数
 */
export async function getSessionTtl(env: Env): Promise<number> {
  // 登录密码只来自 D1；SESSION_SECRET 只负责签名 cookie，有效期同样从 D1 设置读取。
  return settingsService(env).getSessionTtlSeconds()
}

/**
 * 获取安全 Cookie 属性
 * @param requestUrl - 请求 URL
 * @returns Cookie 属性字符串
 */
function secureCookieAttribute(requestUrl?: string): string {
  if (!requestUrl) return '; Secure'
  const url = new URL(requestUrl)
  return url.protocol === 'https:' ? '; Secure' : ''
}

/**
 * 创建 Session Cookie
 * @param env - 环境变量
 * @param requestUrl - 请求 URL
 * @returns Promise<string> - Cookie 字符串
 */
export async function createSessionCookie(env: Env, requestUrl?: string): Promise<string> {
  if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET 未配置')
  const ttl = await getSessionTtl(env)
  const expiresAt = Math.floor(Date.now() / 1000) + ttl
  // payload 只包含过期时间，真正的访问控制来自数据库里的登录密码校验。
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ exp: expiresAt })))
  const signature = await hmac(env.SESSION_SECRET, payload)
  const token = `${payload}.${signature}`
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly${secureCookieAttribute(requestUrl)}; SameSite=Lax; Max-Age=${ttl}`
}

/**
 * 清除 Session Cookie
 * @param requestUrl - 请求 URL
 * @returns Cookie 字符串
 */
export function clearSessionCookie(requestUrl?: string): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly${secureCookieAttribute(requestUrl)}; SameSite=Lax; Max-Age=0`
}

/**
 * 从请求中获取 Cookie
 * @param request - HTTP 请求
 * @param name - Cookie 名称
 * @returns Cookie 值或 null
 */
export function getCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get('cookie')
  if (!cookie) return null
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return null
}

/**
 * 检查用户是否已认证
 * @param request - HTTP 请求
 * @param env - 环境变量
 * @returns Promise<boolean> - 是否已认证
 */
export async function isAuthenticated(request: Request, env: Env): Promise<boolean> {
  const token = getCookie(request, SESSION_COOKIE)
  if (!token || !env.SESSION_SECRET) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  const expected = await hmac(env.SESSION_SECRET, payload)
  if (expected !== signature) return false

  try {
    const decoded = new TextDecoder().decode(base64UrlToBytes(payload))
    const data = JSON.parse(decoded) as { exp: number }
    return data.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}
