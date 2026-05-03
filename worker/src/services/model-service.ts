import { modelRepository } from '../repositories/model-repository'
import { siteRepository } from '../repositories/site-repository'
import { ApiHttpError } from '../response'
import type { Env } from '../types'
import { buildApiEndpoint, extractDataObject, getSiteCookies, requestWithSite } from './api-client'
import { getEndpointModels, getModelsParseStrategy } from './site-types'

function parseModels(payload: Record<string, unknown>, strategy: 'array' | 'object'): string[] {
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

export function modelService(env: Env) {
  const sites = siteRepository(env.DB)
  const models = modelRepository(env.DB)

  return {
    async refreshModels(siteId: number): Promise<{ site_id: number; total_count: number; models: string[] }> {
      const site = await sites.findById(siteId)
      if (!site) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
      const endpoint = buildApiEndpoint(site.url, getEndpointModels(site.api_type))
      const cookies = await getSiteCookies(site.url)
      const response = await requestWithSite<Record<string, unknown>>(site, 'GET', endpoint, undefined, '', cookies)
      const names = parseModels(response.data, getModelsParseStrategy(site.api_type))
      await models.deleteBySiteId(siteId)
      await models.upsertModels(siteId, names)
      return { site_id: siteId, total_count: names.length, models: names }
    },

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

    async batchRefreshModels(siteIds: number[]): Promise<Record<string, unknown>> {
      const results: Record<string, unknown> = {}
      for (const id of siteIds) {
        try {
          results[id] = await this.refreshModels(id)
        } catch (error) {
          results[id] = { error: error instanceof Error ? error.message : String(error) }
        }
      }
      return results
    },

    async getModelsStats(siteId: number) {
      const rows = await models.getBySiteId(siteId)
      return {
        site_id: siteId,
        models: rows,
        total_models: rows.length,
        total_usage: 0,
        last_updated: rows[0]?.created_at || ''
      }
    }
  }
}
