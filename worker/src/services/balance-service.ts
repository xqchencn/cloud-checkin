import { siteRepository } from '../repositories/site-repository'
import { tokenRepository } from '../repositories/token-repository'
import { ApiHttpError } from '../response'
import type { ApiSite, Env } from '../types'
import { buildApiEndpoint, extractDataObject, extractOptionalNumber, extractString, getSiteCookies, requestWithSite, withRetry, type RemoteResponse } from './api-client'
import { getPlatformAdapter } from './platforms'
import { getEndpointCandidates } from './site-types'

/**
 * 获取配额转换因子
 * @param apiType - API 类型
 * @returns 配额转换因子
 */
export function quotaConversionFactor(apiType: string): number {
  return getPlatformAdapter(apiType)?.balance.quotaFactor ?? 500000
}

/**
 * 为平台转换配额
 * @param remoteQuota - 远程配额
 * @param apiType - API 类型
 * @returns 转换后的配额
 */
export function convertQuotaForPlatform(remoteQuota: number, apiType: string): number {
  return remoteQuota / quotaConversionFactor(apiType)
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
 * 解析余额字段
 * @param apiType - API 类型
 * @param data - 数据对象
 * @returns 解析后的字段映射
 */
export function parseBalanceFields(apiType: string, data: Record<string, unknown>): Record<string, unknown> {
  const adapter = getPlatformAdapter(apiType)
  const fields: Record<string, unknown> = {}
  const username = extractString(data, 'username') || extractString(data, 'name') || extractString(data, 'display_name') || extractString(data, 'email')
  const userGroup = extractString(data, 'user_group') || extractString(data, 'group') || extractString(data, 'group_name')
  const affCode = extractString(data, 'aff_code') || extractString(data, 'affCode')
  const quota = firstNumber(data, ['quota', 'balance'])
  const usedQuota = firstNumber(data, ['used_quota', 'used'])
  const requestCount = extractOptionalNumber(data, 'request_count')
  const affCount = extractOptionalNumber(data, 'aff_count')
  const affQuota = extractOptionalNumber(data, 'aff_quota')
  const affHistoryQuota = extractOptionalNumber(data, 'aff_history_quota')

  if (username !== null) fields.site_username = username
  if (userGroup !== null) fields.site_user_group = userGroup
  if (affCode !== null) fields.site_aff_code = affCode

  if (adapter?.balance.doneHubQuotaSemantics) {
    const remaining = quota === null ? 0 : convertQuotaForPlatform(quota, apiType)
    const used = usedQuota === null ? 0 : convertQuotaForPlatform(usedQuota, apiType)
    fields.site_quota = remaining + used
    fields.site_used_quota = used
  } else {
    if (quota !== null) fields.site_quota = convertQuotaForPlatform(quota, apiType)
    if (usedQuota !== null) fields.site_used_quota = convertQuotaForPlatform(usedQuota, apiType)
  }

  if (requestCount !== null) fields.site_request_count = requestCount
  if (affCount !== null) fields.site_aff_count = affCount
  if (affQuota !== null) fields.site_aff_quota = convertQuotaForPlatform(affQuota, apiType)
  if (affHistoryQuota !== null) fields.site_aff_history_quota = convertQuotaForPlatform(affHistoryQuota, apiType)

  return fields
}

/** 余额服务测试钩子 */
export const __balanceServiceTestHooks = {
  convertQuotaForPlatform,
  parseBalanceFields
}

/**
 * 余额服务工厂函数
 * @param env - 环境变量
 * @returns 余额服务对象
 */
export function balanceService(env: Env) {
  const sites = siteRepository(env.DB)
  const tokens = tokenRepository(env.DB)

  /**
   * 查询用户信息
   * @param siteId - 站点 ID
   * @returns Promise<ApiSite> - 站点信息
   */
  async function queryUserInfo(siteId: number): Promise<ApiSite> {
    const site = await sites.findById(siteId)
    if (!site) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
    try {
      const cookies = await getSiteCookies(site.url)
      let response: RemoteResponse<Record<string, unknown>> | null = null
      let lastError: unknown = null
      // 余额接口跟平台分支强相关，必须按 adapter 候选顺序尝试。
      for (const path of getEndpointCandidates(site.api_type, 'userInfo')) {
        try {
          const endpoint = buildApiEndpoint(site.url, path)
          response = await withRetry(() => requestWithSite<Record<string, unknown>>(site, 'GET', endpoint, undefined, '', cookies))
          break
        } catch (error) {
          lastError = error
        }
      }
      if (!response) throw lastError ?? new ApiHttpError('REMOTE_ERROR', '站点用户信息接口不可用', 502)
      const data = extractDataObject(response.data)
      const now = new Date().toISOString()
      const fields: Record<string, unknown> = {
        last_check_time: now,
        last_check_status: 'success',
        last_check_message: '查询成功',
        ...parseBalanceFields(site.api_type, data)
      }

      await withRetry(() => sites.updateFields(site.id, fields))

      const updated = await sites.findById(siteId)
      return updated || site
    } catch (error) {
      throw error
    }
  }

  return {
    queryUserInfo,

    /**
     * 批量查询余额
     * @param siteIds - 站点 ID 列表
     * @returns Promise<{ results, errors }> - 查询结果和错误
     */
    async batchQueryBalance(siteIds: number[]): Promise<{ results: Record<string, ApiSite>; errors: Record<string, string> }> {
      const results: Record<string, ApiSite> = {}
      const errors: Record<string, string> = {}
      for (const id of siteIds) {
        try {
          results[id] = await queryUserInfo(id)
        } catch (error) {
          errors[id] = error instanceof Error ? error.message : String(error)
        }
      }
      return { results, errors }
    },

    /**
     * 获取余额摘要
     * @returns Promise<BalanceSummary> - 余额摘要
     */
    async getBalanceSummary(): Promise<{ total_sites: number; total_quota: number; sites: Array<{ id: number; name: string; quota: number }> }> {
      const allSites = await sites.findEnabled()
      return {
        total_sites: allSites.length,
        total_quota: allSites.reduce((sum, site) => sum + site.site_quota, 0),
        sites: allSites.map(site => ({ id: site.id, name: site.name, quota: site.site_quota }))
      }
    },

    /**
     * 查询 Token 余额
     * @param siteId - 站点 ID
     * @param tokenId - Token ID
     * @returns Promise<ApiSiteToken> - Token 信息
     */
    async queryTokenBalance(siteId: number, tokenId: number) {
      const site = await sites.findById(siteId)
      const token = await tokens.findById(tokenId)
      if (!site || !token) throw new ApiHttpError('NOT_FOUND', '站点或令牌不存在', 404)
      return token
    }
  }
}
