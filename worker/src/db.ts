import type { ApiSite, ApiSiteInput, ApiSiteModel } from './types'

/**
 * 布尔值转整数
 * @param value - 布尔值
 * @returns 整数 (1 或 0)
 */
export function boolToInt(value: boolean): number {
  return value ? 1 : 0
}

/**
 * 整数转布尔值
 * @param value - 整数或布尔值
 * @returns 布尔值
 */
export function intToBool(value: unknown): boolean {
  return value === 1 || value === true
}

/**
 * 获取当前时间的 ISO 格式字符串
 * @returns ISO 格式的时间字符串
 */
export function nowIso(): string {
  return new Date().toISOString()
}

/**
 * 查询单条记录
 * @param stmt - D1 预处理语句
 * @returns Promise<T | null> - 查询结果或 null
 */
export async function one<T>(stmt: D1PreparedStatement): Promise<T | null> {
  const row = await stmt.first<T>()
  return row ?? null
}

/**
 * 查询多条记录
 * @param stmt - D1 预处理语句
 * @returns Promise<T[]> - 查询结果数组
 */
export async function all<T>(stmt: D1PreparedStatement): Promise<T[]> {
  const result = await stmt.all<T>()
  return (result.results ?? []) as T[]
}

/**
 * 将值转换为可空字符串
 * @param value - 输入值
 * @returns 可空字符串
 */
export function nullable(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

/**
 * 将数据库行转换为 ApiSite 对象
 * @param row - 数据库行
 * @returns ApiSite 对象
 */
export function toApiSite(row: Record<string, unknown>): ApiSite {
  return {
    id: Number(row.id),
    name: String(row.name),
    url: String(row.url),
    api_type: String(row.api_type),
    account_label: nullable(row.account_label),
    sort_order: Number(row.sort_order ?? 0),
    auth_method: String(row.auth_method) as ApiSite['auth_method'],
    auth_value: nullable(row.auth_value),
    user_id: nullable(row.user_id),
    login_username: nullable(row.login_username),
    login_password: nullable(row.login_password),
    enabled: intToBool(row.enabled),
    auto_checkin: intToBool(row.auto_checkin),
    site_username: nullable(row.site_username),
    site_user_group: nullable(row.site_user_group),
    site_aff_code: nullable(row.site_aff_code),
    site_quota: Number(row.site_quota ?? 0),
    site_used_quota: Number(row.site_used_quota ?? 0),
    site_request_count: Number(row.site_request_count ?? 0),
    site_aff_count: Number(row.site_aff_count ?? 0),
    site_aff_quota: Number(row.site_aff_quota ?? 0),
    site_aff_history_quota: Number(row.site_aff_history_quota ?? 0),
    last_checkin: nullable(row.last_checkin),
    last_checkin_status: nullable(row.last_checkin_status),
    last_check_time: nullable(row.last_check_time),
    last_check_status: String(row.last_check_status ?? 'pending'),
    last_check_message: nullable(row.last_check_message),
    remarks: nullable(row.remarks),
    checkin_endpoint: nullable(row.checkin_endpoint),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  }
}

/**
 * 将站点输入转换为数据库参数
 * @param input - 站点输入
 * @returns 数据库参数数组
 */
export function siteInputParams(input: ApiSiteInput): unknown[] {
  return [
    input.name.trim(),
    input.url.trim().replace(/\/+$/, ''),
    input.api_type,
    nullable(input.account_label),
    Number.isFinite(input.sort_order) ? Math.max(0, Math.floor(Number(input.sort_order))) : 0,
    input.auth_method,
    nullable(input.auth_value),
    nullable(input.user_id),
    nullable(input.login_username),
    nullable(input.login_password),
    boolToInt(input.enabled),
    boolToInt(input.auto_checkin),
    nullable(input.remarks),
    nullable(input.checkin_endpoint)
  ]
}

/**
 * 将数据库行转换为 ApiSiteModel 对象
 * @param row - 数据库行
 * @returns ApiSiteModel 对象
 */
export function toApiSiteModel(row: Record<string, unknown>): ApiSiteModel {
  return {
    id: Number(row.id),
    site_id: Number(row.site_id),
    model_name: String(row.model_name),
    model_type: String(row.model_type ?? ''),
    is_active: intToBool(row.is_active),
    created_at: String(row.created_at)
  }
}

/**
 * 构建分页参数
 * @param page - 页码，默认为 1
 * @param pageSize - 每页数量，默认为 20
 * @returns 分页参数对象
 */
export function buildLimitOffset(page = 1, pageSize = 20): { limit: number; offset: number; page: number; pageSize: number } {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.min(Math.floor(pageSize), 200) : 20
  return {
    page: safePage,
    pageSize: safePageSize,
    limit: safePageSize,
    offset: (safePage - 1) * safePageSize
  }
}
