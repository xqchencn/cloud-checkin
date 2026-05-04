import { modelRepository } from '../repositories/model-repository'
import { siteRepository } from '../repositories/site-repository'
import { ApiHttpError } from '../response'
import type { Env } from '../types'
import { buildApiEndpoint, extractDataObject, getSiteCookies, requestWithSite } from './api-client'
import { getEndpointCandidates, getModelsParseStrategy } from './site-types'

/**
 * 解析模型列表
 * @param payload - 载荷数据
 * @param strategy - 解析策略
 * @returns 模型名称列表
 */
export function parseModels(payload: Record<string, unknown>, strategy: 'array' | 'object' | 'openai'): string[] {
  if (strategy === 'openai' && Array.isArray(payload.data)) {
    return payload.data.map(item => typeof item === 'string' ? item : String((item as Record<string, unknown>).id || '')).filter(Boolean)
  }

  const data = extractDataObject(payload)
  const source = data.models ?? data.model ?? data

  if (Array.isArray(source)) {
    return source.map(item => typeof item === 'string' ? item : String((item as Record<string, unknown>).id || (item as Record<string, unknown>).name || '')).filter(Boolean)
  }

  if (strategy === 'object' && source && typeof source === 'object') {
    return Object.keys(source as Record<string, unknown>)
  }

  if (Array.isArray(data.data)) {
    return data.data.map(item => String(item)).filter(Boolean)
  }

  return []
}

/**
 * 获取模型端点候选列表
 * @param apiType - API 类型
 * @returns 模型端点候选列表
 */
export function modelEndpointCandidates(apiType: string): string[] {
  return getEndpointCandidates(apiType, 'models')
}

/** 模型服务测试钩子 */
export const __modelServiceTestHooks = {
  parseModels,
  modelEndpointCandidates
}

/**
 * 模型服务工厂函数
 * @param env - 环境变量
 * @returns 模型服务对象
 */
export function modelService(env: Env) {
  const sites = siteRepository(env.DB)
  const models = modelRepository(env.DB)

  return {
    /**
     * 刷新模型
     * @param siteId - 站点 ID
     * @returns Promise<RefreshModelsResult> - 刷新结果
     */
    async refreshModels(siteId: number): Promise<{ site_id: number; total_count: number; models: string[] }> {
      const site = await sites.findById(siteId)
      if (!site) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      const cookies = await getSiteCookies(site.url)
      let names: string[] = []
      let lastError: unknown = null
      // 模型接口在 OneApi/Veloera/OneHub/DoneHub 上差异明显，按 adapter 顺序尝试到拿到模型为止。
      for (const path of modelEndpointCandidates(site.api_type)) {
        try {
          const endpoint = buildApiEndpoint(site.url, path)
          const response = await requestWithSite<Record<string, unknown>>(site, 'GET', endpoint, undefined, '', cookies)
          names = parseModels(response.data, getModelsParseStrategy(site.api_type))
          if (names.length > 0) break
        } catch (error) {
          lastError = error
        }
      }
      if (!names.length && lastError) throw lastError
      await models.deleteBySiteId(siteId)
      await models.upsertModels(siteId, names)
      return { site_id: siteId, total_count: names.length, models: names }
    },

    /**
     * 获取模型列表
     * @param siteId - 站点 ID
     * @returns Promise<GetModelsResult> - 模型列表结果
     */
    async getModels(siteId: number) {
      const rows = await models.getBySiteId(siteId)
      return {
        site_id: siteId,
        models: rows,
        total_count: rows.length,
        last_updated: rows[0]?.created_at || '',
        has_data: rows.length > 0
      }
    },

  }
}
