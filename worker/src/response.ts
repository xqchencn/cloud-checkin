import type { ApiErrorBody, ApiSuccessBody } from './types'

export function jsonOk<T>(data: T, init: ResponseInit = {}): Response {
  const body: ApiSuccessBody<T> = { success: true, data }
  return json(body, init)
}

export function jsonError(code: string, message: string, status = 400): Response {
  const body: ApiErrorBody = { success: false, error: { code, message } }
  return json(body, { status })
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(body), { ...init, headers })
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return await request.json<T>()
  } catch {
    throw new ApiHttpError('BAD_JSON', '请求体不是有效 JSON', 400)
  }
}

export class ApiHttpError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiHttpError) {
    return jsonError(error.code, error.message, error.status)
  }
  const message = error instanceof Error ? error.message : '未知错误'
  return jsonError('INTERNAL_ERROR', message, 500)
}
