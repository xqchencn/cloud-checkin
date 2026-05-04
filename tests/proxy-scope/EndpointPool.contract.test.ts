import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const siteRouteSource = readFileSync('worker/src/routes/sites.ts', 'utf8')
const apiSiteSource = readFileSync('frontend/src/api/apiSite.ts', 'utf8')
import { appSource } from '../sources'

/**
 * 站点基础 URL 范围合约测试
 * 验证站点 URL 范围管理的一致性和正确性
 */
describe('site base URL scope contracts', () => {
  /**
   * 验证不添加端点池表、路由或前端 API
   * 确保端点池功能未被意外引入
   */
  it('does not add endpoint-pool tables, routes, or frontend APIs', () => {
    expect(existsSync('worker/src/repositories/site-endpoint-repository.ts')).toBe(false)
    expect(siteRouteSource).not.toContain('endpointsMatch')
    expect(siteRouteSource).not.toContain('cooldownMatch')
    expect(apiSiteSource).not.toContain('ApiSiteGetEndpoints')
    expect(apiSiteSource).not.toContain('ApiSiteUpdateEndpoints')
    expect(apiSiteSource).not.toContain('ApiSiteClearEndpointCooldown')
    expect(appSource).not.toContain('EndpointPoolEditor')
    expect(appSource).not.toContain('端点池')
  })

  /**
   * 验证保持单个配置的站点 URL 和自定义签到路径作为站点运行时源
   * 确保站点 URL 配置的一致性
   */
  it('keeps the single configured site URL and custom checkin path as the site runtime source', () => {
    expect(apiSiteSource).toContain('url: string')
    expect(apiSiteSource).toContain('checkin_endpoint: string | null')
    expect(appSource).toContain('签到端点')
  })
})
