import { ApiHttpError } from '../response'
import { boolToInt } from '../db'
import { modelRepository } from '../repositories/model-repository'
import { siteRepository } from '../repositories/site-repository'
import { tokenRepository, type TokenInput } from '../repositories/token-repository'
import type { ApiSite, ApiSiteInput, ApiSiteModel, ApiSiteToken, Env } from '../types'
import { normalizeUrl } from './api-client'
import { validateApiType } from './site-types'

/**
 * API 站点导出数据
 */
export interface ApiSiteExportData {
  /** 站点名称 */
  name: string
  /** 站点 URL */
  url: string
  /** API 类型 */
  api_type: string
  /** 账号标签 */
  account_label?: string
  /** 排序顺序 */
  sort_order?: number
  /** 认证方式 */
  auth_method: string
  /** 认证值 */
  auth_value: string
  /** 用户 ID */
  user_id: string
  /** 登录用户名 */
  login_username: string
  /** 登录密码 */
  login_password: string
  /** 是否启用 */
  enabled: boolean
  /** 是否自动签到 */
  auto_checkin: boolean
  /** 备注 */
  remarks: string
  /** 签到端点 */
  checkin_endpoint: string
  /** 站点用户名 */
  site_username?: string | null
  /** 站点用户组 */
  site_user_group?: string | null
  /** 站点邀请码 */
  site_aff_code?: string | null
  /** 站点配额 */
  site_quota?: number
  /** 站点已用配额 */
  site_used_quota?: number
  /** 站点请求次数 */
  site_request_count?: number
  /** 站点邀请次数 */
  site_aff_count?: number
  /** 站点邀请配额 */
  site_aff_quota?: number
  /** 站点历史邀请配额 */
  site_aff_history_quota?: number
  /** 最后签到时间 */
  last_checkin?: string | null
  /** 最后签到状态 */
  last_checkin_status?: string | null
  /** 最后检查时间 */
  last_check_time?: string | null
  /** 最后检查状态 */
  last_check_status?: string | null
  /** 最后检查消息 */
  last_check_message?: string | null
  /** Token 列表 */
  tokens?: ApiSiteToken[]
}

/**
 * API 站点分组
 */
export interface ApiSiteGroup {
  /** 分组名称 */
  name: string
  /** 分组 URL */
  url: string
  /** API 类型 */
  api_type: string
  /** 总站点数 */
  total_sites: number
  /** 启用站点数 */
  enabled_sites: number
  /** 站点列表 */
  sites: ApiSite[]
}

/**
 * 批量按 URL 更新结果
 */
export interface BatchUpdateByUrlResult {
  /** 匹配数量 */
  matched_count: number
  /** 更新数量 */
  updated_count: number
  /** 站点 ID 列表 */
  site_ids: number[]
}

/**
 * 规范化输入
 * @param input - 部分站点输入
 * @returns 规范化后的站点输入
 */
function normalizeInput(input: Partial<ApiSiteInput>): ApiSiteInput {
  const normalizedUrl = normalizeUrl(String(input.url || ''))
  return {
    name: String(input.name || '').trim(),
    url: normalizedUrl,
    api_type: String(input.api_type || ''),
    account_label: input.account_label || '',
    sort_order: normalizeSortOrder(input.sort_order),
    auth_method: String(input.auth_method || '') as ApiSiteInput['auth_method'],
    auth_value: input.auth_value || '',
    user_id: input.user_id || '',
    login_username: input.login_username || '',
    login_password: input.login_password || '',
    enabled: parseBoolean(input.enabled, true),
    auto_checkin: parseBoolean(input.auto_checkin, false),
    remarks: input.remarks || '',
    checkin_endpoint: normalizeCheckinEndpoint(input.checkin_endpoint)
  }
}

/**
 * 解析布尔值
 * @param input - 输入值
 * @param defaultValue - 默认值
 * @returns 布尔值
 */
function parseBoolean(input: unknown, defaultValue: boolean): boolean {
  if (input === undefined || input === null || input === '') return defaultValue
  if (typeof input === 'boolean') return input
  if (typeof input === 'number') return input !== 0
  const normalized = String(input).trim().toLowerCase()
  if (['1', 'true', 'yes', 'y', 'enabled', 'enable', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'n', 'disabled', 'disable', 'off'].includes(normalized)) return false
  return defaultValue
}

/**
 * 规范化排序顺序
 * @param input - 输入值
 * @returns 排序顺序
 */
function normalizeSortOrder(input: unknown): number {
  if (input === undefined || input === null || input === '') return 0
  const parsed = Number.parseInt(String(input), 10)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

/**
 * 规范化签到端点
 * @param input - 输入值
 * @returns 规范化后的签到端点
 */
function normalizeCheckinEndpoint(input: unknown): string {
  if (input === undefined || input === null) return ''
  const trimmed = String(input).trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('/')) return trimmed
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new ApiHttpError('VALIDATION_ERROR', '签到端点必须为空、HTTP(S) 完整 URL 或以 / 开头的相对路径')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ApiHttpError('VALIDATION_ERROR', '签到端点必须为空、HTTP(S) 完整 URL 或以 / 开头的相对路径')
  }
  return parsed.toString().replace(/\/+$/, '')
}

/**
 * 验证输入
 * @param input - 站点输入
 */
function validateInput(input: ApiSiteInput): void {
  if (!input.name) throw new ApiHttpError('VALIDATION_ERROR', '站点名称不能为空')
  if (!input.url) throw new ApiHttpError('VALIDATION_ERROR', '站点 URL 不能为空')
  try {
    const url = new URL(input.url)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad protocol')
  } catch {
    throw new ApiHttpError('VALIDATION_ERROR', '站点 URL 必须是有效的 HTTP/HTTPS 地址')
  }
  if (!validateApiType(input.api_type)) throw new ApiHttpError('VALIDATION_ERROR', `不支持的 API 类型: ${input.api_type}`)
  if (!['token', 'sessions', 'password'].includes(input.auth_method)) throw new ApiHttpError('VALIDATION_ERROR', '认证方式必须是 token、sessions 或 password')
}

/**
 * 转换为 ISO 时间
 * @param value - 输入值
 * @returns ISO 时间字符串或 null
 */
function toIsoTime(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toISOString()
  }
  if (typeof value === 'number') return value > 0 ? new Date(value * 1000).toISOString() : null
  if (typeof value === 'object') {
    const data = value as Record<string, unknown>
    if (data.Valid === false || data.valid === false) return null
    return toIsoTime(data.Time ?? data.time)
  }
  return null
}

/**
 * 从导入数据创建 Token 输入
 * @param siteId - 站点 ID
 * @param token - Token 数据
 * @returns Token 输入或 null
 */
function tokenInputFromImport(siteId: number, token: Partial<ApiSiteToken>): TokenInput | null {
  const tokenKey = String(token.token_key || '').trim()
  if (!isImportableTokenKey(tokenKey)) return null
  return {
    api_site_id: siteId,
    remote_token_id: token.remote_token_id == null ? null : String(token.remote_token_id),
    token_key: tokenKey,
    value_status: 'ready',
    token_name: token.token_name == null ? null : String(token.token_name),
    token_group: token.token_group || 'default',
    source: 'import',
    is_active: Number(token.is_active ?? 1),
    token_quota: token.token_quota == null ? null : Number(token.token_quota),
    token_used_quota: token.token_used_quota == null ? null : Number(token.token_used_quota),
    token_unlimited_quota: Boolean(token.token_unlimited_quota),
    created_time: toIsoTime(token.created_time),
    accessed_time: toIsoTime(token.accessed_time),
    expired_time: toIsoTime(token.expired_time)
  }
}

/**
 * 判断是否可导入的 Token 键
 * @param tokenKey - Token 键
 * @returns 是否可导入
 */
function isImportableTokenKey(tokenKey: string): boolean {
  if (!tokenKey) return false
  if (tokenKey.includes('****')) return false
  return true
}

/**
 * 导入站点输入
 * @param row - 导出数据行
 * @returns 站点输入
 */
function importSiteInput(row: ApiSiteExportData): ApiSiteInput {
  return normalizeInput(row as Partial<ApiSiteInput>)
}

/**
 * 转换导入字符串字段
 * @param value - 输入值
 * @returns 字符串或 null
 */
function importNullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text ? text : null
}

/**
 * 转换导入数字字段
 * @param value - 输入值
 * @returns 数字
 */
function importNumber(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * 导入站点运行态字段
 * @param row - 导出数据行
 * @returns 可写入站点表的字段
 */
function importRuntimeFields(row: ApiSiteExportData): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  const has = (field: keyof ApiSiteExportData) => Object.prototype.hasOwnProperty.call(row, field)
  if (has('site_username')) fields.site_username = importNullableString(row.site_username)
  if (has('site_user_group')) fields.site_user_group = importNullableString(row.site_user_group)
  if (has('site_aff_code')) fields.site_aff_code = importNullableString(row.site_aff_code)
  if (has('site_quota')) fields.site_quota = importNumber(row.site_quota)
  if (has('site_used_quota')) fields.site_used_quota = importNumber(row.site_used_quota)
  if (has('site_request_count')) fields.site_request_count = importNumber(row.site_request_count)
  if (has('site_aff_count')) fields.site_aff_count = importNumber(row.site_aff_count)
  if (has('site_aff_quota')) fields.site_aff_quota = importNumber(row.site_aff_quota)
  if (has('site_aff_history_quota')) fields.site_aff_history_quota = importNumber(row.site_aff_history_quota)
  if (has('last_checkin')) fields.last_checkin = toIsoTime(row.last_checkin)
  if (has('last_checkin_status')) fields.last_checkin_status = importNullableString(row.last_checkin_status)
  if (has('last_check_time')) fields.last_check_time = toIsoTime(row.last_check_time)
  if (has('last_check_status')) fields.last_check_status = importNullableString(row.last_check_status)
  if (has('last_check_message')) fields.last_check_message = importNullableString(row.last_check_message)
  return fields
}

/**
 * 站点服务工厂函数
 * @param env - 环境变量
 * @returns 站点服务对象
 */
export function siteService(env: Env) {
  const repo = siteRepository(env.DB)
  const tokens = tokenRepository(env.DB)
  const models = modelRepository(env.DB)

  /**
   * 为存储准备 Token 输入
   * @param siteId - 站点 ID
   * @param token - Token 数据
   * @returns Promise<TokenInput | null> - Token 输入或 null
   */
  async function tokenInputFromImportForStorage(siteId: number, token: Partial<ApiSiteToken>): Promise<TokenInput | null> {
    return tokenInputFromImport(siteId, token)
  }

  /**
   * 查找导入目标站点
   * @param row - 导出数据行
   * @param input - 站点输入
   * @returns Promise<ApiSite | null> - 站点或 null
   */
  async function findImportTargetSite(row: ApiSiteExportData, input: ApiSiteInput): Promise<ApiSite | null> {
    return repo.findByNameAndUrl(input.name, input.url)
  }

  return {
    /**
     * 创建站点
     * @param inputLike - 部分站点输入
     * @returns Promise<number> - 站点 ID
     */
    async create(inputLike: Partial<ApiSiteInput>): Promise<number> {
      const input = normalizeInput(inputLike)
      validateInput(input)
      if (await repo.existsByNameAndUrl(input.name, input.url)) {
        throw new ApiHttpError('DUPLICATE_SITE', '同 URL 同名称的站点已存在', 409)
      }
      return repo.create(input)
    },

    /**
     * 更新站点
     * @param id - 站点 ID
     * @param inputLike - 部分站点输入
     */
    async update(id: number, inputLike: Partial<ApiSiteInput>): Promise<void> {
      const current = await repo.findById(id)
      if (!current) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      const input = normalizeInput(inputLike)
      validateInput(input)
      if (await repo.existsByNameAndUrl(input.name, input.url, id)) {
        throw new ApiHttpError('DUPLICATE_SITE', '同 URL 同名称的站点已存在', 409)
      }
      await repo.update(id, input)
    },

    /**
     * 删除站点
     * @param id - 站点 ID
     */
    async delete(id: number): Promise<void> {
      const current = await repo.findById(id)
      if (!current) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      await repo.delete(id)
    },

    /**
     * 获取站点
     * @param id - 站点 ID
     * @returns Promise<ApiSite> - 站点信息
     */
    async get(id: number): Promise<ApiSite> {
      const site = await repo.findById(id)
      if (!site) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      return site
    },

    /**
     * 列出所有站点
     * @returns Promise<ApiSite[]> - 站点列表
     */
    async list(): Promise<ApiSite[]> {
      return repo.findAll()
    },

    /**
     * 列出启用的站点
     * @returns Promise<ApiSite[]> - 启用站点列表
     */
    async listEnabled(): Promise<ApiSite[]> {
      return repo.findEnabled()
    },

    /**
     * 获取站点统计信息
     * @returns Promise<Record<string, number>> - 统计信息
     */
    async statistics(): Promise<Record<string, number>> {
      const base = await repo.getStatistics()
      return {
        ...base,
        today_checkin_success: 0,
        today_checkin_failed: 0,
        today_checkin_total: 0
      }
    },

    /**
     * 导出站点
     * @param sites - 站点列表
     * @param includeSensitive - 是否包含敏感信息
     * @returns Promise<ApiSiteExportData[]> - 导出数据
     */
    async export(sites: ApiSite[], includeSensitive = false): Promise<ApiSiteExportData[]> {
      const shouldIncludeSensitive = includeSensitive === true
      const sourceSites = shouldIncludeSensitive ? await repo.findAll() : sites
      return Promise.all(sourceSites.map(async site => {
        const siteTokens = await tokens.findBySiteId(site.id)
        return {
          name: site.name,
          url: site.url,
          api_type: site.api_type,
          account_label: site.account_label || '',
          sort_order: site.sort_order || 0,
          auth_method: site.auth_method,
          auth_value: shouldIncludeSensitive ? site.auth_value || '' : '',
          user_id: site.user_id || '',
          login_username: shouldIncludeSensitive ? site.login_username || '' : '',
          login_password: shouldIncludeSensitive ? site.login_password || '' : '',
          enabled: site.enabled,
          auto_checkin: site.auto_checkin,
          remarks: site.remarks || '',
          checkin_endpoint: site.checkin_endpoint || '',
          site_username: site.site_username,
          site_user_group: site.site_user_group,
          site_aff_code: site.site_aff_code,
          site_quota: site.site_quota,
          site_used_quota: site.site_used_quota,
          site_request_count: site.site_request_count,
          site_aff_count: site.site_aff_count,
          site_aff_quota: site.site_aff_quota,
          site_aff_history_quota: site.site_aff_history_quota,
          last_checkin: site.last_checkin,
          last_checkin_status: site.last_checkin_status,
          last_check_time: site.last_check_time,
          last_check_status: site.last_check_status,
          last_check_message: site.last_check_message,
          tokens: shouldIncludeSensitive ? siteTokens : []
        }
      }))
    },

    /**
     * 导入站点
     * @param jsonData - JSON 数据
     * @returns Promise<ImportResult> - 导入结果
     */
    async import(jsonData: string): Promise<{ success_count: number; skip_count: number; fail_count: number; errors: string[]; skipped_urls: string[] }> {
      const rows = JSON.parse(jsonData) as ApiSiteExportData[]
      const result = { success_count: 0, skip_count: 0, fail_count: 0, errors: [] as string[], skipped_urls: [] as string[] }
      for (const row of rows) {
        try {
          const input = importSiteInput(row)
          validateInput(input)
          let siteId: number
          const existing = await findImportTargetSite(row, input)
          if (existing) {
            siteId = existing.id
            result.skip_count++
            result.skipped_urls.push(input.url)
          } else {
            siteId = await repo.create(input)
            result.success_count++
          }
          await repo.updateFields(siteId, importRuntimeFields(row))
          for (const token of row.tokens || []) {
            const tokenInput = await tokenInputFromImportForStorage(siteId, token)
            if (tokenInput) await tokens.upsert(tokenInput)
          }
        } catch (error) {
          result.fail_count++
          result.errors.push(error instanceof Error ? error.message : String(error))
        }
      }
      return result
    },

    /**
     * 按 URL 匹配站点
     * @param url - URL
     * @returns Promise<{ sites: Array<{ site, tokens, models }> }> - 匹配结果
     */
    async matchByUrl(url: string): Promise<{ sites: Array<{ site: ApiSite; tokens: ApiSiteToken[]; models: ApiSiteModel[] }> }> {
      const sites = await repo.findByUrlLike(normalizeUrl(url))
      return {
        sites: await Promise.all(sites.map(async site => ({
          site,
          tokens: await tokens.findBySiteId(site.id),
          models: await models.getBySiteId(site.id)
        })))
      }
    },

    /**
     * 批量按 URL 更新
     * @param inputLike - 输入数据
     * @returns Promise<BatchUpdateByUrlResult> - 更新结果
     */
    async batchUpdateByUrl(inputLike: Record<string, unknown>): Promise<BatchUpdateByUrlResult> {
      const rawUrl = String(inputLike.url || '').trim()
      if (!rawUrl) throw new ApiHttpError('VALIDATION_ERROR', '必须提供 url')

      const targetSites = await repo.findByUrlLike(normalizeUrl(rawUrl))
      const updatesSource = (inputLike.updates && typeof inputLike.updates === 'object' ? inputLike.updates : inputLike) as Record<string, unknown>
      const fields: Record<string, unknown> = {}
      if ('enabled' in updatesSource) fields.enabled = boolToInt(parseBoolean(updatesSource.enabled, true))
      if ('auto_checkin' in updatesSource) fields.auto_checkin = boolToInt(parseBoolean(updatesSource.auto_checkin, false))
      if ('sort_order' in updatesSource) fields.sort_order = normalizeSortOrder(updatesSource.sort_order)
      if ('remarks' in updatesSource) fields.remarks = String(updatesSource.remarks || '')
      if ('checkin_endpoint' in updatesSource) fields.checkin_endpoint = normalizeCheckinEndpoint(updatesSource.checkin_endpoint)

      const siteIds: number[] = []
      for (const site of targetSites) {
        if (Object.keys(fields).length) await repo.updateFields(site.id, fields)
        siteIds.push(site.id)
      }
      return { matched_count: targetSites.length, updated_count: Object.keys(fields).length ? targetSites.length : 0, site_ids: siteIds }
    },

    /**
     * 重绑认证
     * @param id - 站点 ID
     * @param inputLike - 部分站点输入
     */
    async rebindAuth(id: number, inputLike: Partial<ApiSiteInput>): Promise<void> {
      const current = await repo.findById(id)
      if (!current) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      const input = normalizeInput({
        name: current.name,
        url: current.url,
        api_type: current.api_type,
        account_label: current.account_label || '',
        sort_order: current.sort_order || 0,
        auth_method: inputLike.auth_method || current.auth_method,
        auth_value: inputLike.auth_value ?? current.auth_value ?? '',
        user_id: inputLike.user_id ?? current.user_id ?? '',
        login_username: inputLike.login_username ?? current.login_username ?? '',
        login_password: inputLike.login_password ?? current.login_password ?? '',
        enabled: current.enabled,
        auto_checkin: current.auto_checkin,
        remarks: current.remarks || '',
        checkin_endpoint: current.checkin_endpoint || ''
      })
      validateInput(input)
      // 重绑只更新凭证相关字段，不改变站点名称、URL、排序和签到策略。
      await repo.update(id, input)
    },

    /**
     * 分组站点
     * @returns Promise<ApiSiteGroup[]> - 分组列表
     */
    async grouped(): Promise<ApiSiteGroup[]> {
      const groups = new Map<string, ApiSiteGroup>()
      for (const site of await repo.findAll()) {
        const groupKey = site.url
        const existing = groups.get(groupKey)
        if (existing) {
          existing.sites.push(site)
          existing.total_sites += 1
          existing.enabled_sites += site.enabled ? 1 : 0
          continue
        }
        groups.set(groupKey, {
          name: site.name,
          url: site.url,
          api_type: site.api_type,
          total_sites: 1,
          enabled_sites: site.enabled ? 1 : 0,
          sites: [site]
        })
      }
      return Array.from(groups.values())
    }
  }
}
