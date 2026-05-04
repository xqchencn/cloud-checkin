import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const siteServiceSource = readFileSync('worker/src/services/site-service.ts', 'utf8')
const siteRouteSource = readFileSync('worker/src/routes/sites.ts', 'utf8')
const modelServiceSource = readFileSync('worker/src/services/model-service.ts', 'utf8')
const modelRepoSource = readFileSync('worker/src/repositories/model-repository.ts', 'utf8')
const modelRouteSource = readFileSync('worker/src/routes/models.ts', 'utf8')
const apiSource = readFileSync('frontend/src/api/apiSite.ts', 'utf8')
import { appSource } from '../sources'

/**
 * 相同 URL 站点聚合合约测试
 * 验证相同 URL 站点的聚合功能
 */
describe('same-url site aggregation contracts', () => {
  /**
   * 验证保持 api_sites 作为凭据实例同时聚合相同 URL 记录
   * 测试相同 URL 站点的聚合逻辑
   */
  it('keeps api_sites as credential instances while aggregating same-url records', () => {
    expect(siteServiceSource).toContain('async grouped')
    expect(siteServiceSource).toContain('const groupKey = site.url')
    expect(siteServiceSource).not.toContain('site_group_key')
    expect(siteServiceSource).toContain('account_label')
    expect(siteServiceSource).toContain('sort_order')
    expect(siteRouteSource).toContain("url.pathname === '/api/sites/grouped'")
    expect(siteRouteSource).not.toContain("url.searchParams.get('group_key')")
    expect(apiSource).toContain('ApiSiteGrouped')
    expect(appSource).toContain('account_label')
    expect(appSource).toContain('visibleUrlGroups')
    expect(appSource).toContain('按 URL 聚合')
    expect(appSource).not.toMatch(/同站.{0,2}分组/)
    expect(appSource).not.toContain('site_group_key')
    expect(siteServiceSource).not.toContain('async clone')
    expect(siteRouteSource).not.toContain('/api/sites/${id}/clone')
    expect(apiSource).not.toContain('ApiSiteClone')
    expect(appSource).not.toContain('ApiSiteClone')
  })
})

/**
 * 模型视图合约测试
 * 验证模型视图功能的正确性和一致性
 */
describe('model view contracts', () => {
  /**
   * 验证仅保持模型列表和单站点刷新用于站点管理
   * 测试模型管理功能
   */
  it('keeps only model list and single-site refresh for site management', () => {
    expect(modelServiceSource).toContain('async refreshModels')
    expect(modelServiceSource).toContain('async getModels')
    expect(modelRouteSource).toContain('/^\\/api\\/sites\\/(\\d+)\\/models$/')
    expect(modelRouteSource).toContain('/^\\/api\\/sites\\/(\\d+)\\/models\\/refresh$/')
    expect(apiSource).toContain('ApiSiteGetModels')
    expect(apiSource).toContain('ApiSiteRefreshModels')

    for (const source of [modelRepoSource, modelServiceSource, modelRouteSource, apiSource, appSource]) {
      expect(source).not.toContain('available-models')
      expect(source).not.toContain('ApiSiteGetAvailableModels')
      expect(source).not.toContain('getAvailableModels')
      expect(source).not.toContain('batch-refresh-models')
      expect(source).not.toContain('batchRefreshModels')
      expect(source).not.toContain('models/statistics')
      expect(source).not.toContain('getModelsStats')
      expect(source).not.toContain('disabled-models')
      expect(source).not.toContain('DisabledModels')
      expect(source).not.toContain('禁用模型')
    }
  })
})
