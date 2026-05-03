import { siteRepository } from '../repositories/site-repository'
import { tokenRepository } from '../repositories/token-repository'
import { ApiHttpError } from '../response'
import type { ApiSite, Env } from '../types'
import { buildApiEndpoint, extractDataObject, extractOptionalNumber, extractString, getSiteCookies, requestWithSite, withRetry } from './api-client'

function convertQuota(remoteQuota: number): number {
  return remoteQuota / 500000
}

function firstNumber(data: Record<string, unknown>, fields: string[]): number | null {
  for (const field of fields) {
    const value = extractOptionalNumber(data, field)
    if (value !== null) return value
  }
  return null
}

export function balanceService(env: Env) {
  const sites = siteRepository(env.DB)
  const tokens = tokenRepository(env.DB)

  async function queryUserInfo(siteId: number): Promise<ApiSite> {
    const site = await sites.findById(siteId)
    if (!site) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
    // Go 版余额查询统一使用 /api/user/self；/api/user/info 在部分 NewApi 站点只返回 success/message。
    const endpoint = buildApiEndpoint(site.url, '/api/user/self')
    const cookies = await getSiteCookies(site.url)
    const response = await withRetry(() => requestWithSite<Record<string, unknown>>(site, 'GET', endpoint, undefined, '', cookies))
    const data = extractDataObject(response.data)
    const now = new Date().toISOString()
    const fields: Record<string, unknown> = {
      last_check_time: now,
      last_check_status: 'success',
      last_check_message: '查询成功'
    }
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
    if (quota !== null) fields.site_quota = convertQuota(quota)
    if (usedQuota !== null) fields.site_used_quota = convertQuota(usedQuota)
    if (requestCount !== null) fields.site_request_count = requestCount
    if (affCount !== null) fields.site_aff_count = affCount
    if (affQuota !== null) fields.site_aff_quota = convertQuota(affQuota)
    if (affHistoryQuota !== null) fields.site_aff_history_quota = convertQuota(affHistoryQuota)

    await withRetry(() => sites.updateFields(site.id, fields))

    const updated = await sites.findById(siteId)
    return updated || site
  }

  return {
    queryUserInfo,

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

    async getBalanceSummary(): Promise<{ total_sites: number; total_quota: number; sites: Array<{ id: number; name: string; quota: number }> }> {
      const allSites = await sites.findEnabled()
      return {
        total_sites: allSites.length,
        total_quota: allSites.reduce((sum, site) => sum + site.site_quota, 0),
        sites: allSites.map(site => ({ id: site.id, name: site.name, quota: site.site_quota }))
      }
    },

    async queryTokenBalance(siteId: number, tokenId: number) {
      const site = await sites.findById(siteId)
      const token = await tokens.findById(tokenId)
      if (!site || !token) throw new ApiHttpError('NOT_FOUND', '站点或令牌不存在', 404)
      return token
    }
  }
}
