import type { ApiErrorBody, ApiSuccessBody } from './types'

/**
 * 创建成功响应
 * @param data - 响应数据
 * @param init - 响应初始化选项
 * @returns Response 对象
 */
export function jsonOk<T>(data: T, init: ResponseInit = {}): Response {
  const body: ApiSuccessBody<T> = { success: true, data }
  return json(body, init)
}

/**
 * 创建错误响应
 * @param code - 错误代码
 * @param message - 错误消息
 * @param status - HTTP 状态码，默认为 400
 * @returns Response 对象
 */
export function jsonError(code: string, message: string, status = 400): Response {
  const body: ApiErrorBody = { success: false, error: { code, message } }
  return json(body, { status })
}

/**
 * 创建 JSON 响应
 * @param body - 响应体
 * @param init - 响应初始化选项
 * @returns Response 对象
 */
export function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(body), { ...init, headers })
}

/**
 * 从请求中读取 JSON 数据
 * @param request - HTTP 请求
 * @returns Promise<T> - JSON 数据
 */
export async function readJson<T>(request: Request): Promise<T> {
  try {
    return await request.json<T>()
  } catch {
    throw new ApiHttpError('BAD_JSON', '请求体不是有效 JSON', 400)
  }
}

/**
 * API HTTP 错误类
 */
export class ApiHttpError extends Error {
  /** 错误代码 */
  readonly code: string
  /** HTTP 状态码 */
  readonly status: number

  /**
   * 创建 API HTTP 错误
   * @param code - 错误代码
   * @param message - 错误消息
   * @param status - HTTP 状态码，默认为 400
   */
  constructor(code: string, message: string, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

/**
 * 将错误转换为响应
 * @param error - 错误对象
 * @returns Response 对象
 */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiHttpError) {
    return jsonError(error.code, error.message, error.status)
  }
  const message = error instanceof Error ? error.message : '未知错误'
  return jsonError('INTERNAL_ERROR', message, 500)
}
