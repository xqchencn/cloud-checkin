export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('content-type') && options.body) {
    headers.set('content-type', 'application/json')
  }

  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers
  })
  const body = await response.json().catch(() => null) as { success?: boolean; data?: T; error?: { message?: string } } | null
  if (!response.ok || !body?.success) {
    throw new Error(body?.error?.message || `请求失败: ${response.status}`)
  }
  return body.data as T
}
