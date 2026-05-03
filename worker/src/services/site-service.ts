import { ApiHttpError } from '../response'
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

function normalizeInput(input: Partial<ApiSiteInput>): ApiSiteInput {
  return {
    name: String(input.name || '').trim(),
    url: normalizeUrl(String(input.url || '')),
    api_type: String(input.api_type || ''),
    auth_method: String(input.auth_method || '') as ApiSiteInput['auth_method'],
    auth_value: input.auth_value || '',
    user_id: input.user_id || '',
    login_username: input.login_username || '',
    login_password: input.login_password || '',
    enabled: input.enabled !== false,
    auto_checkin: input.auto_checkin === true,
    remarks: input.remarks || '',
    checkin_endpoint: input.checkin_endpoint || ''
  }
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
  if (!tokenKey) return null
  return {
    api_site_id: siteId,
    remote_token_id: token.remote_token_id == null ? null : String(token.remote_token_id),
    token_key: tokenKey,
    token_name: token.token_name == null ? null : String(token.token_name),
    token_group: token.token_group || 'default',
    is_active: Number(token.is_active ?? 1),
    token_quota: token.token_quota == null ? null : Number(token.token_quota),
    token_used_quota: token.token_used_quota == null ? null : Number(token.token_used_quota),
    token_unlimited_quota: Boolean(token.token_unlimited_quota),
    created_time: toIsoTime(token.created_time),
    accessed_time: toIsoTime(token.accessed_time),
    expired_time: toIsoTime(token.expired_time)
  }
}

export function siteService(env: Env) {
  const repo = siteRepository(env.DB)
  const tokens = tokenRepository(env.DB)
  const models = modelRepository(env.DB)

  return {
    async create(inputLike: Partial<ApiSiteInput>): Promise<number> {
      const input = normalizeInput(inputLike)
      validateInput(input)
      if (await repo.existsByNameAndUrl(input.name, input.url)) {
        throw new ApiHttpError('DUPLICATE_SITE', '同名同 URL 的站点已存在', 409)
      }
      return repo.create(input)
    },

    async update(id: number, inputLike: Partial<ApiSiteInput>): Promise<void> {
      const current = await repo.findById(id)
      if (!current) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      const input = normalizeInput(inputLike)
      validateInput(input)
      if (await repo.existsByNameAndUrl(input.name, input.url, id)) {
        throw new ApiHttpError('DUPLICATE_SITE', '同名同 URL 的站点已存在', 409)
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

    async export(sites: ApiSite[]): Promise<ApiSiteExportData[]> {
      return Promise.all(sites.map(async site => ({
        name: site.name,
        url: site.url,
        api_type: site.api_type,
        auth_method: site.auth_method,
        auth_value: site.auth_value || '',
        user_id: site.user_id || '',
        login_username: site.login_username || '',
        login_password: site.login_password || '',
        enabled: site.enabled,
        auto_checkin: site.auto_checkin,
        remarks: site.remarks || '',
        checkin_endpoint: site.checkin_endpoint || '',
        tokens: await tokens.findBySiteId(site.id)
      })))
    },

    async import(jsonData: string): Promise<{ success_count: number; skip_count: number; fail_count: number; errors: string[]; skipped_urls: string[] }> {
      const rows = JSON.parse(jsonData) as ApiSiteExportData[]
      const result = { success_count: 0, skip_count: 0, fail_count: 0, errors: [] as string[], skipped_urls: [] as string[] }
      for (const row of rows) {
        try {
          const input = normalizeInput(row as Partial<ApiSiteInput>)
          validateInput(input)
          let siteId: number
          if (await repo.existsByNameAndUrl(input.name, input.url)) {
            const existing = await repo.findByNameAndUrl(input.name, input.url)
            if (!existing) throw new ApiHttpError('NOT_FOUND', `已存在站点未找到: ${input.name}`)
            siteId = existing.id
            result.skip_count++
            result.skipped_urls.push(input.url)
          } else {
            siteId = await repo.create(input)
            result.success_count++
          }
          for (const token of row.tokens || []) {
            const tokenInput = tokenInputFromImport(siteId, token)
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
    }
  }
}
