import { siteRepository } from '../repositories/site-repository'
import { tokenRepository, type TokenInput } from '../repositories/token-repository'
import { ApiHttpError } from '../response'
import type { ApiSite, Env } from '../types'
import { buildApiEndpoint, extractBoolean, extractDataObject, extractOptionalNumber, extractString, getSiteCookies, requestWithSite, withRetry } from './api-client'
import { modelService } from './model-service'
import { getPlatformAdapter } from './platforms'
import { getEndpointCandidates, getEndpointTokens } from './site-types'

/**
 * 获取 Token 列表路径
 * @param apiType - API 类型
 * @returns Token 列表路径
 */
export function tokenListPath(apiType: string): string {
  const adapter = getPlatformAdapter(apiType)
  const tokenBase = adapter?.endpoints.tokens[0] ?? '/api/token/'
  const separator = tokenBase.includes('?') ? '&' : '?'
  return `${tokenBase}${separator}p=0&size=${adapter?.token.listPageSize ?? 100}`
}

/**
 * 获取 Token 列表端点
 * @param site - 站点信息
 * @returns Token 列表端点
 */
function tokenListEndpoint(site: ApiSite): string {
  return buildApiEndpoint(site.url, tokenListPath(site.api_type))
}

/**
 * 获取 Token 集合端点
 * @param site - 站点信息
 * @returns Token 集合端点
 */
function tokenCollectionEndpoint(site: ApiSite): string {
  return buildApiEndpoint(site.url, getEndpointTokens(site.api_type))
}

/**
 * 获取 Token 删除端点候选列表
 * @param site - 站点信息
 * @param remoteTokenId - 远程 Token ID
 * @returns Token 删除端点候选列表
 */
function tokenDeleteEndpointCandidates(site: ApiSite, remoteTokenId: string): string[] {
  const base = getEndpointTokens(site.api_type).replace(/\/+$/, '')
  const id = encodeURIComponent(remoteTokenId)
  return [`${base}/${id}`, `${base}/${id}/`].map(path => buildApiEndpoint(site.url, path))
}

/**
 * 获取 Token 分组端点候选列表
 * @param apiType - API 类型
 * @returns Token 分组端点候选列表
 */
export function tokenGroupEndpointCandidates(apiType: string): string[] {
  const configured = getEndpointCandidates(apiType, 'tokenGroups')
  return Array.from(new Set([
    ...configured,
    '/api/user/self/groups',
    '/api/user_group_map'
  ].filter(Boolean)))
}

/**
 * 转换配额
 * @param remoteQuota - 远程配额
 * @param apiType - API 类型
 * @returns 转换后的配额
 */
function convertQuota(remoteQuota: number, apiType: string): number {
  return remoteQuota / (getPlatformAdapter(apiType)?.balance.quotaFactor ?? 500000)
}

/**
 * 规范化 Token 键
 * @param tokenKey - Token 键
 * @returns 规范化后的 Token 键
 */
function normalizeTokenKey(tokenKey: string): string {
  const trimmed = tokenKey.trim()
  if (!trimmed) return trimmed
  return trimmed.startsWith('sk-') ? trimmed : `sk-${trimmed}`
}

/**
 * 判断是否为占位符 Token 键
 * @param tokenKey - Token 键
 * @returns 是否为占位符
 */
function isPlaceholderTokenKey(tokenKey: string | null | undefined): boolean {
  return Boolean(tokenKey && tokenKey.includes('*'))
}

/** 分组容器键列表 */
const GROUP_CONTAINER_KEYS = [
  'groups',
  'group_ratio',
  'usable_group',
  'user_group_map',
  'user_groups',
  'userGroups',
  'groupMap',
  'group_map',
  'token_groups',
  'tokenGroups',
  'available_groups',
  'availableGroups'
]
/** 分组项名称键列表 */
const GROUP_ITEM_NAME_KEYS = ['name', 'group', 'key', 'id', 'value', 'label', 'group_name', 'token_group']
/** 分组元数据键列表 */
const GROUP_META_KEYS = ['success', 'message', 'code', 'data', 'result', 'error', 'status']

/**
 * 规范化分组名称
 * @param value - 输入值
 * @returns 规范化后的分组名称或 null
 */
function normalizeGroupName(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') {
    const normalized = String(value).trim()
    return normalized && normalized !== '[object Object]' ? normalized : null
  }
  return null
}

/**
 * 规范化分组名称列表
 * @param values - 输入值列表
 * @returns 规范化后的分组名称列表
 */
function normalizeGroupNames(values: unknown[]): string[] {
  const names: string[] = []
  for (const item of values) {
    const direct = normalizeGroupName(item)
    if (direct) {
      names.push(direct)
      continue
    }
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const record = item as Record<string, unknown>
      for (const key of GROUP_ITEM_NAME_KEYS) {
        const nested = normalizeGroupName(record[key])
        if (nested) names.push(nested)
      }
    }
  }
  return Array.from(new Set(names))
}

/**
 * 从记录中获取分组名称
 * @param record - 记录对象
 * @returns 分组名称或 null
 */
function groupNameFromRecord(record: Record<string, unknown>): string | null {
  for (const key of GROUP_ITEM_NAME_KEYS) {
    const normalized = normalizeGroupName(record[key])
    if (normalized) return normalized
  }
  return null
}

/**
 * 收集分组名称
 * @param source - 输入源
 * @returns 分组名称列表
 */
function collectGroupNames(source: unknown): string[] {
  if (Array.isArray(source)) return normalizeGroupNames(source)
  const direct = normalizeGroupName(source)
  if (direct) return [direct]
  if (!source || typeof source !== 'object') return []

  const record = source as Record<string, unknown>
  const recordName = groupNameFromRecord(record)
  if (recordName) return [recordName]

  const nestedNames: string[] = []
  for (const key of GROUP_CONTAINER_KEYS) {
    if (key in record) nestedNames.push(...collectGroupNames(record[key]))
  }
  if (nestedNames.length) return normalizeGroupNames(nestedNames)

  // /api/user_group_map、group_ratio 等接口常以对象 key 表示分组名。
  return normalizeGroupNames(Object.keys(record).filter(key => !GROUP_META_KEYS.includes(key.toLowerCase())))
}

/**
 * 提取远程 Token 分组名称
 * @param payload - 载荷数据
 * @returns 分组名称列表
 */
function extractRemoteTokenGroupNames(payload: Record<string, unknown>): string[] {
  if (payload.success === false) return []
  const data = extractDataObject(payload)
  const candidates: unknown[] = [payload.data, payload.result]
  for (const key of GROUP_CONTAINER_KEYS) {
    candidates.push(data[key], payload[key])
  }
  candidates.push(data, payload)
  return normalizeGroupNames(candidates.flatMap(candidate => collectGroupNames(candidate)))
}

/**
 * 获取远程分组错误消息
 * @param payload - 载荷数据
 * @returns 错误消息或 null
 */
function remoteGroupErrorMessage(payload: Record<string, unknown>): string | null {
  if (payload.success !== false) return null
  return extractString(payload, 'message') || extractString(payload, 'error') || '拉取远端 Token 分组失败'
}

/**
 * 远程时间转 ISO 时间
 * @param value - 远程时间值
 * @returns ISO 时间字符串或 null
 */
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

/**
 * 解析 Token 激活状态
 * @param remote - 远程数据
 * @returns 激活状态 (1 或 0)
 */
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

/**
 * 获取第一个数字值
 * @param data - 数据对象
 * @param fields - 字段列表
 * @returns 数字值或 null
 */
function firstNumber(data: Record<string, unknown>, fields: string[]): number | null {
  for (const field of fields) {
    const value = extractOptionalNumber(data, field)
    if (value !== null) return value
  }
  return null
}

/**
 * 获取第一个布尔值或 null
 * @param data - 数据对象
 * @param fields - 字段列表
 * @returns 布尔值或 null
 */
function firstBooleanOrNull(data: Record<string, unknown>, fields: string[]): boolean | null {
  for (const field of fields) {
    const value = extractBoolean(data, field)
    if (value !== null) return value
  }
  return null
}

/**
 * 判断是否为无限配额
 * @param remote - 远程数据
 * @param quotaLimit - 配额限制
 * @returns 是否为无限配额
 */
function isUnlimitedQuota(remote: Record<string, unknown>, quotaLimit: number | null): boolean {
  const explicit = firstBooleanOrNull(remote, ['unlimited_quota', 'unlimited', 'is_unlimited', 'infinite_quota'])
  if (explicit !== null) return explicit
  // NewAPI/ShakaApiHub 的不限额度令牌在列表里可能只返回 quota/limit=0，不再带 unlimited_quota。
  return quotaLimit === 0
}

/**
 * 创建远程 Token 载荷
 * @param tokenName - Token 名称
 * @param group - 分组
 * @returns 远程 Token 载荷
 */
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

/**
 * 从远程数据创建 Token 输入
 * @param siteId - 站点 ID
 * @param apiType - API 类型
 * @param remote - 远程数据
 * @param existingFullKey - 现有完整 Key
 * @returns Token 输入
 */
function tokenInputFromRemote(siteId: number, apiType: string, remote: Record<string, unknown>, existingFullKey: string | null = null): TokenInput {
  const remoteId = extractString(remote, 'id') || extractString(remote, 'token_id') || extractString(remote, 'remote_token_id') || extractString(remote, 'key')
  const rawTokenKey = extractString(remote, 'key') || extractString(remote, 'token') || extractString(remote, 'token_key') || remoteId || ''
  const masked = isPlaceholderTokenKey(rawTokenKey)
  const tokenKey = masked && existingFullKey ? existingFullKey : rawTokenKey
  const usedQuota = firstNumber(remote, ['used_quota', 'used'])
  const remainQuota = firstNumber(remote, ['remain_quota'])
  const quotaLimit = firstNumber(remote, ['quota', 'limit'])
  const totalQuota = quotaLimit ?? (remainQuota !== null && usedQuota !== null ? remainQuota + usedQuota : remainQuota)
  const unlimitedQuota = isUnlimitedQuota(remote, quotaLimit)
  return {
    api_site_id: siteId,
    remote_token_id: remoteId,
    token_key: normalizeTokenKey(tokenKey),
    value_status: masked && !existingFullKey ? 'masked_pending' : 'ready',
    token_name: extractString(remote, 'name') || extractString(remote, 'token_name'),
    token_group: extractString(remote, 'group') || extractString(remote, 'group_name') || extractString(remote, 'token_group') || 'default',
    source: 'remote',
    is_active: parseTokenActive(remote),
    token_quota: unlimitedQuota ? null : (totalQuota === null ? null : convertQuota(totalQuota, apiType)),
    token_used_quota: usedQuota === null ? null : convertQuota(usedQuota, apiType),
    token_unlimited_quota: unlimitedQuota,
    created_time: remoteTimeToIso(remote.created_time),
    accessed_time: remoteTimeToIso(remote.accessed_time),
    expired_time: remoteTimeToIso(remote.expired_time)
  }
}

/**
 * 提取远程 Token 列表
 * @param payload - 载荷数据
 * @returns 远程 Token 列表
 */
function extractRemoteTokens(payload: Record<string, unknown>): Record<string, unknown>[] {
  const data = extractDataObject(payload)
  for (const key of ['items', 'list', 'tokens', 'data', 'records', 'rows', 'result']) {
    const value = data[key]
    if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object') as Record<string, unknown>[]
  }
  if (Array.isArray(payload.data)) return payload.data as Record<string, unknown>[]
  return []
}

/** Token 服务测试钩子 */
export const __tokenServiceTestHooks = {
  extractRemoteTokenGroupNames,
  tokenListPath,
  tokenGroupEndpointCandidates,
  supportsRemoteTokenUpdate: (_apiType: string) => false,
  tokenInputFromRemoteForTest: tokenInputFromRemote,
  convertQuotaForPlatform: convertQuota
}

/**
 * Token 服务工厂函数
 * @param env - 环境变量
 * @returns Token 服务对象
 */
export function tokenService(env: Env) {
  const sites = siteRepository(env.DB)
  const tokens = tokenRepository(env.DB)

  return {
    /**
     * 同步 Token
     * @param siteId - 站点 ID
     * @returns Promise<SyncTokensResult> - 同步结果
     */
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
        const remoteId = extractString(remote, 'id') || extractString(remote, 'token_id') || extractString(remote, 'remote_token_id') || extractString(remote, 'key')
        const remoteKey = extractString(remote, 'key') || extractString(remote, 'token') || extractString(remote, 'token_key') || remoteId || ''
        const existing = existingTokens.find(token => remoteId && token.remote_token_id === remoteId)
          || (!isPlaceholderTokenKey(remoteKey) ? existingTokens.find(token => token.token_key === normalizeTokenKey(remoteKey)) : undefined)
        const existingFullKey = existing && !isPlaceholderTokenKey(existing.token_key) ? existing.token_key : null
        const input = tokenInputFromRemote(siteId, site.api_type, remote, existingFullKey)
        if (input.remote_token_id) remoteIds.push(input.remote_token_id)
        if (!input.token_key) continue
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

    /**
     * 批量同步 Token
     * @param siteIds - 站点 ID 列表
     * @returns Promise<{ results, errors }> - 同步结果和错误
     */
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

    /**
     * 获取 Token 列表
     * @param siteId - 站点 ID
     * @returns Promise<ApiSiteToken[]> - Token 列表
     */
    async getTokens(siteId: number) {
      return tokens.findBySiteId(siteId)
    },

    /**
     * 获取 Token 值
     * @param tokenId - Token ID
     * @returns Promise<{ id, token_key }> - Token 信息
     */
    async getTokenValue(tokenId: number): Promise<{ id: number; token_key: string }> {
      const token = await tokens.findById(tokenId)
      if (!token) throw new ApiHttpError('NOT_FOUND', 'Token 不存在', 404)
      return { id: tokenId, token_key: token.token_key }
    },

    /**
     * 创建远程 Token
     * @param siteId - 站点 ID
     * @param tokenName - Token 名称
     * @param group - 分组
     */
    async createRemoteToken(siteId: number, tokenName: string, group: string): Promise<void> {
      const site = await sites.findById(siteId)
      if (!site) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      const cookies = await getSiteCookies(site.url)
      await requestWithSite(site, 'POST', tokenCollectionEndpoint(site), remoteTokenPayload(tokenName, group), '', cookies)
      await this.syncTokens(siteId)
    },

    /**
     * 删除远程 Token
     * @param siteId - 站点 ID
     * @param remoteTokenId - 远程 Token ID
     */
    async deleteRemoteToken(siteId: number, remoteTokenId: string): Promise<void> {
      const site = await sites.findById(siteId)
      if (!site) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      const cookies = await getSiteCookies(site.url)
      let lastError: unknown = null
      for (const endpoint of tokenDeleteEndpointCandidates(site, remoteTokenId)) {
        try {
          await requestWithSite(site, 'DELETE', endpoint, undefined, '', cookies)
          lastError = null
          break
        } catch (error) {
          lastError = error
        }
      }
      if (lastError) throw lastError
      await this.syncTokens(siteId)
    },

    /**
     * 获取远程 Token 分组
     * @param siteId - 站点 ID
     * @returns Promise<{ groups: string[] }> - 分组列表
     */
    async getRemoteTokenGroups(siteId: number): Promise<{ groups: string[] }> {
      const site = await sites.findById(siteId)
      if (!site) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      const cookies = await getSiteCookies(site.url)
      let terminalError: string | null = null
      for (const endpoint of tokenGroupEndpointCandidates(site.api_type)) {
        try {
          const response = await requestWithSite<Record<string, unknown>>(site, 'GET', buildApiEndpoint(site.url, endpoint), undefined, '', cookies)
          terminalError = remoteGroupErrorMessage(response.data) ?? terminalError
          const groups = extractRemoteTokenGroupNames(response.data)
          if (groups.length) return { groups }
        } catch {
          // 不同平台分支暴露的分组接口不一致，单个候选失败后继续尝试下一个真实端点。
        }
      }
      if (terminalError) throw new ApiHttpError('REMOTE_ERROR', terminalError, 502)
      const groups = normalizeGroupNames((await tokens.findBySiteId(siteId)).map(token => token.token_group || 'default'))
      return { groups: groups.length ? groups : ['default'] }
    }
  }
}
