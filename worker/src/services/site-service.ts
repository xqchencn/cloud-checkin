import { ApiHttpError } from '../response'
import { boolToInt } from '../db'
import { modelRepository } from '../repositories/model-repository'
import { siteRepository } from '../repositories/site-repository'
import { tokenRepository, type TokenInput } from '../repositories/token-repository'
import type { ApiSite, ApiSiteInput, ApiSiteModel, ApiSiteToken, Env } from '../types'
import { normalizeUrl } from './api-client'
import { validateApiType } from './site-types'

export interface ApiSiteExportData {
  name: string
  url: string
  api_type: string
  account_label?: string
  sort_order?: number
  auth_method: string
  auth_value: string
  user_id: string
  login_username: string
  login_password: string
  enabled: boolean
  auto_checkin: boolean
  remarks: string
  checkin_endpoint: string
  tokens?: ApiSiteToken[]
}

export interface ApiSiteGroup {
  name: string
  url: string
  api_type: string
  total_sites: number
  enabled_sites: number
  sites: ApiSite[]
}

export interface BatchUpdateByUrlResult {
  matched_count: number
  updated_count: number
  site_ids: number[]
}

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

function parseBoolean(input: unknown, defaultValue: boolean): boolean {
  if (input === undefined || input === null || input === '') return defaultValue
  if (typeof input === 'boolean') return input
  if (typeof input === 'number') return input !== 0
  const normalized = String(input).trim().toLowerCase()
  if (['1', 'true', 'yes', 'y', 'enabled', 'enable', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'n', 'disabled', 'disable', 'off'].includes(normalized)) return false
  return defaultValue
}

function normalizeSortOrder(input: unknown): number {
  if (input === undefined || input === null || input === '') return 0
  const parsed = Number.parseInt(String(input), 10)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

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

function isImportableTokenKey(tokenKey: string): boolean {
  if (!tokenKey) return false
  if (tokenKey.includes('****')) return false
  return true
}

function importSiteInput(row: ApiSiteExportData): ApiSiteInput {
  return normalizeInput(row as Partial<ApiSiteInput>)
}

export function siteService(env: Env) {
  const repo = siteRepository(env.DB)
  const tokens = tokenRepository(env.DB)
  const models = modelRepository(env.DB)

  async function tokenInputFromImportForStorage(siteId: number, token: Partial<ApiSiteToken>): Promise<TokenInput | null> {
    return tokenInputFromImport(siteId, token)
  }

  async function findImportTargetSite(row: ApiSiteExportData, input: ApiSiteInput): Promise<ApiSite | null> {
    const hasAccountLabel = Object.prototype.hasOwnProperty.call(row, 'account_label')
    return hasAccountLabel
      ? repo.findByUrlAndAccountLabel(input.url, input.account_label || '')
      : repo.findByNameAndUrl(input.name, input.url)
  }

  return {
    async create(inputLike: Partial<ApiSiteInput>): Promise<number> {
      const input = normalizeInput(inputLike)
      validateInput(input)
      if (await repo.existsByUrlAndAccountLabel(input.url, input.account_label || '')) {
        throw new ApiHttpError('DUPLICATE_SITE', '同 URL 同账号标签的站点已存在', 409)
      }
      return repo.create(input)
    },

    async update(id: number, inputLike: Partial<ApiSiteInput>): Promise<void> {
      const current = await repo.findById(id)
      if (!current) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      const input = normalizeInput(inputLike)
      validateInput(input)
      if (await repo.existsByUrlAndAccountLabel(input.url, input.account_label || '', id)) {
        throw new ApiHttpError('DUPLICATE_SITE', '同 URL 同账号标签的站点已存在', 409)
      }
      await repo.update(id, input)
    },

    async delete(id: number): Promise<void> {
      const current = await repo.findById(id)
      if (!current) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      await repo.delete(id)
    },

    async get(id: number): Promise<ApiSite> {
      const site = await repo.findById(id)
      if (!site) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      return site
    },

    async list(): Promise<ApiSite[]> {
      return repo.findAll()
    },

    async listEnabled(): Promise<ApiSite[]> {
      return repo.findEnabled()
    },

    async statistics(): Promise<Record<string, number>> {
      const base = await repo.getStatistics()
      return {
        ...base,
        today_checkin_success: 0,
        today_checkin_failed: 0,
        today_checkin_total: 0
      }
    },

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
          tokens: shouldIncludeSensitive ? siteTokens : []
        }
      }))
    },

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
