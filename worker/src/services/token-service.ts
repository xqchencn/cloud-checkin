import { siteRepository } from '../repositories/site-repository'
import { tokenRepository, type TokenInput } from '../repositories/token-repository'
import { ApiHttpError } from '../response'
import type { ApiSite, Env } from '../types'
import { buildApiEndpoint, extractBoolean, extractDataObject, extractOptionalNumber, extractString, getSiteCookies, requestWithSite, withRetry } from './api-client'
import { modelService } from './model-service'

function tokenListEndpoint(site: ApiSite): string {
  // Go 版按 ShakaApiHub 的分页接口取 Token 列表。
  return buildApiEndpoint(site.url, '/api/token/?p=0&size=10')
}

function tokenKeyEndpoint(site: ApiSite, remoteTokenId: string): string {
  return buildApiEndpoint(site.url, `/api/token/${encodeURIComponent(remoteTokenId)}/key`)
}

function convertQuota(remoteQuota: number): number {
  return remoteQuota / 500000
}

function normalizeTokenKey(tokenKey: string): string {
  const trimmed = tokenKey.trim()
  if (!trimmed) return trimmed
  return trimmed.startsWith('sk-') ? trimmed : `sk-${trimmed}`
}

function isPlaceholderTokenKey(tokenKey: string | null | undefined): boolean {
  return Boolean(tokenKey && tokenKey.includes('*'))
}

function remoteTimeToIso(value: unknown): string | null {
  if (typeof value === 'number') {
    return value > 0 ? new Date(value * 1000).toISOString() : null
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed > 0 ? new Date(parsed * 1000).toISOString() : null
    return value || null
  }
  return null
}

function parseTokenActive(remote: Record<string, unknown>): number {
  const status = remote.status
  if (typeof status === 'number') return status === 1 ? 1 : 0
  if (typeof status === 'string') return ['1', 'active', 'enabled', 'true'].includes(status.toLowerCase()) ? 1 : 0
  const isActive = remote.is_active
  if (typeof isActive === 'boolean') return isActive ? 1 : 0
  if (typeof isActive === 'number') return isActive === 1 ? 1 : 0
  if (typeof isActive === 'string') return ['1', 'active', 'enabled', 'true'].includes(isActive.toLowerCase()) ? 1 : 0
  return 1
}

function firstNumber(data: Record<string, unknown>, fields: string[]): number | null {
  for (const field of fields) {
    const value = extractOptionalNumber(data, field)
    if (value !== null) return value
  }
  return null
}

function firstBooleanOrNull(data: Record<string, unknown>, fields: string[]): boolean | null {
  for (const field of fields) {
    const value = extractBoolean(data, field)
    if (value !== null) return value
  }
  return null
}

function isUnlimitedQuota(remote: Record<string, unknown>, quotaLimit: number | null): boolean {
  const explicit = firstBooleanOrNull(remote, ['unlimited_quota', 'unlimited', 'is_unlimited', 'infinite_quota'])
  if (explicit !== null) return explicit
  // NewAPI/ShakaApiHub 的不限额度令牌在列表里可能只返回 quota/limit=0，不再带 unlimited_quota。
  return quotaLimit === 0
}

function remoteTokenPayload(tokenName: string, group: string): Record<string, unknown> {
  return {
    name: tokenName,
    remain_quota: 500000,
    expired_time: -1,
    unlimited_quota: true,
    model_limits_enabled: false,
    model_limits: '',
    allow_ips: '',
    group: group || 'default'
  }
}

function tokenInputFromRemote(siteId: number, remote: Record<string, unknown>): TokenInput {
  const remoteId = extractString(remote, 'id') || extractString(remote, 'token_id') || extractString(remote, 'remote_token_id') || extractString(remote, 'key')
  const tokenKey = extractString(remote, 'key') || extractString(remote, 'token') || extractString(remote, 'token_key') || remoteId || ''
  const usedQuota = firstNumber(remote, ['used_quota', 'used'])
  const remainQuota = firstNumber(remote, ['remain_quota'])
  const quotaLimit = firstNumber(remote, ['quota', 'limit'])
  const totalQuota = quotaLimit ?? (remainQuota !== null && usedQuota !== null ? remainQuota + usedQuota : remainQuota)
  const unlimitedQuota = isUnlimitedQuota(remote, quotaLimit)
  return {
    api_site_id: siteId,
    remote_token_id: remoteId,
    token_key: normalizeTokenKey(tokenKey),
    token_name: extractString(remote, 'name') || extractString(remote, 'token_name'),
    token_group: extractString(remote, 'group') || extractString(remote, 'token_group') || 'default',
    is_active: parseTokenActive(remote),
    token_quota: unlimitedQuota ? null : (totalQuota === null ? null : convertQuota(totalQuota)),
    token_used_quota: usedQuota === null ? null : convertQuota(usedQuota),
    token_unlimited_quota: unlimitedQuota,
    created_time: remoteTimeToIso(remote.created_time),
    accessed_time: remoteTimeToIso(remote.accessed_time),
    expired_time: remoteTimeToIso(remote.expired_time)
  }
}

function extractRemoteTokens(payload: Record<string, unknown>): Record<string, unknown>[] {
  const data = extractDataObject(payload)
  for (const key of ['items', 'list', 'tokens', 'data', 'records', 'rows', 'result']) {
    const value = data[key]
    if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object') as Record<string, unknown>[]
  }
  if (Array.isArray(payload.data)) return payload.data as Record<string, unknown>[]
  return []
}

async function fetchFullTokenKey(site: ApiSite, remoteTokenId: string, cookies: string): Promise<string | null> {
  try {
    const response = await withRetry(() => requestWithSite<Record<string, unknown>>(site, 'POST', tokenKeyEndpoint(site, remoteTokenId), undefined, '', cookies))
    const data = extractDataObject(response.data)
    const fullKey = extractString(data, 'key') || extractString(data, 'token') || extractString(data, 'token_key')
    return fullKey && !isPlaceholderTokenKey(fullKey) ? fullKey : null
  } catch {
    return null
  }
}

export function tokenService(env: Env) {
  const sites = siteRepository(env.DB)
  const tokens = tokenRepository(env.DB)

  return {
    async syncTokens(siteId: number) {
      const site = await sites.findById(siteId)
      if (!site) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      const cookies = await getSiteCookies(site.url)
      const response = await withRetry(() => requestWithSite<Record<string, unknown>>(site, 'GET', tokenListEndpoint(site), undefined, '', cookies))
      const remoteTokens = extractRemoteTokens(response.data)
      let newTokens = 0
      let updatedTokens = 0
      let failedTokens = 0
      const errors: string[] = []
      const remoteIds: string[] = []
      const existingTokens = await tokens.findBySiteId(siteId)

      for (const remote of remoteTokens) {
        const input = tokenInputFromRemote(siteId, remote)
        if (input.remote_token_id) remoteIds.push(input.remote_token_id)
        const existing = existingTokens.find(token => token.remote_token_id === input.remote_token_id)
        if (!input.token_key || isPlaceholderTokenKey(input.token_key)) {
          const fullKey = input.remote_token_id ? await fetchFullTokenKey(site, input.remote_token_id, cookies) : null
          if (fullKey) {
            input.token_key = normalizeTokenKey(fullKey)
          } else if (existing && !isPlaceholderTokenKey(existing.token_key)) {
            // 不能把占位符或展示值写入 token_key；本地已有完整 key 时只更新其他字段。
            input.token_key = existing.token_key
          } else {
            failedTokens++
            errors.push(`令牌 ${input.remote_token_id || input.token_name || 'unknown'} 缺少完整密钥`)
            continue
          }
        }
        const exists = Boolean(existing)
        await tokens.upsert(input)
        if (exists) updatedTokens++
        else newTokens++
      }

      const deletedTokens = await tokens.deleteMissing(siteId, remoteIds)
      await modelService(env).refreshModels(siteId).catch(() => undefined)

      return {
        api_site_id: siteId,
        site_name: site.name,
        new_tokens: newTokens,
        updated_tokens: updatedTokens,
        deleted_tokens: deletedTokens,
        failed_tokens: failedTokens,
        errors,
        sync_time: new Date().toISOString()
      }
    },

    async batchSyncTokens(siteIds: number[]) {
      const results: Record<string, unknown> = {}
      const errors: Record<string, string> = {}
      for (const id of siteIds) {
        try {
          results[id] = await this.syncTokens(id)
        } catch (error) {
          errors[id] = error instanceof Error ? error.message : String(error)
        }
      }
      return { results, errors }
    },

    async getTokens(siteId: number) {
      return tokens.findBySiteId(siteId)
    },

    async updateTokenActive(tokenId: number, isActive: number): Promise<void> {
      await tokens.updateActive(tokenId, isActive)
    },

    async deleteToken(tokenId: number): Promise<void> {
      await tokens.delete(tokenId)
    },

    async createRemoteToken(siteId: number, tokenName: string, group: string): Promise<void> {
      const site = await sites.findById(siteId)
      if (!site) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      const cookies = await getSiteCookies(site.url)
      await requestWithSite(site, 'POST', tokenListEndpoint(site), remoteTokenPayload(tokenName, group), '', cookies)
      await this.syncTokens(siteId)
    },

    async updateRemoteToken(siteId: number, remoteTokenId: string, tokenName: string, group: string): Promise<void> {
      const site = await sites.findById(siteId)
      if (!site) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      const cookies = await getSiteCookies(site.url)
      await requestWithSite(site, 'PUT', tokenListEndpoint(site), { id: remoteTokenId, ...remoteTokenPayload(tokenName, group) }, '', cookies)
      await this.syncTokens(siteId)
    },

    async deleteRemoteToken(siteId: number, remoteTokenId: string): Promise<void> {
      const site = await sites.findById(siteId)
      if (!site) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      const cookies = await getSiteCookies(site.url)
      await requestWithSite(site, 'DELETE', buildApiEndpoint(site.url, `/api/token/${remoteTokenId}/`), undefined, '', cookies)
      await this.syncTokens(siteId)
    },

    async getRemoteTokenGroups(siteId: number): Promise<Record<string, string>> {
      const site = await sites.findById(siteId)
      if (!site) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      const cookies = await getSiteCookies(site.url)
      const response = await requestWithSite<Record<string, unknown>>(site, 'GET', buildApiEndpoint(site.url, '/api/token/groups'), undefined, '', cookies).catch(() => null)
      const data = response ? extractDataObject(response.data) : {}
      const groups = data.groups && typeof data.groups === 'object' ? data.groups as Record<string, string> : { default: 'default' }
      return groups
    }
  }
}
