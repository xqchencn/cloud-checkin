import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  analyzeSiteUrl,
  detectPlatformByUrlHint,
  detectSiteFromUrl,
  detectSiteName
} from '../../worker/src/services/site-detection-service'
import { handleSiteRoutes } from '../../worker/src/routes/sites'

/**
 * 站点检测服务测试
 * 验证站点检测功能的正确性和一致性
 */
describe('site detection service', () => {
  /**
   * 验证剥离已知 OpenAI 兼容 API 后缀同时保留 API 基础 URL
   * 测试 URL 后缀剥离逻辑
   */
  it('strips known OpenAI-compatible API suffixes while keeping API base URL', () => {
    const result = analyzeSiteUrl('https://example.com/v1/models')

    expect(result.persistedUrl).toBe('https://example.com')
    expect(result.canonicalUrl).toBe('https://example.com/v1')
    expect(result.urlAction).toBe('strip_known_api_suffix')
  })

  /**
   * 验证保留语义化 API 路径而不是将其作为通用后缀剥离
   * 测试语义化路径保留逻辑
   */
  it('preserves semantic API path instead of stripping it as a generic suffix', () => {
    const result = analyzeSiteUrl('https://api.example.com/api/coding/paas/v4')

    expect(result.persistedUrl).toBe('https://api.example.com/api/coding/paas/v4')
    expect(result.canonicalUrl).toBe('https://api.example.com/api/coding/paas/v4')
    expect(result.urlAction).toBe('preserve_semantic_path')
  })

  /**
   * 验证从已知 URL 提示检测平台
   * 测试平台检测逻辑
   */
  it('detects platform from known URL hints', () => {
    expect(detectPlatformByUrlHint('https://one-api.example.com')?.apiType).toBe('OneApi')
    expect(detectPlatformByUrlHint('https://one-hub.example.com')?.apiType).toBe('OneHub')
    expect(detectPlatformByUrlHint('https://rix-api.example.com')?.apiType).toBe('RixApi')
    expect(detectPlatformByUrlHint('https://veloera.example.com')?.apiType).toBe('Veloera')
    expect(detectPlatformByUrlHint('https://anyrouter.example.com')?.apiType).toBe('AnyRouter')
    expect(detectPlatformByUrlHint('https://vo-api.example.com')?.apiType).toBe('VoApi')
  })

  /**
   * 验证从标题优先于主机名猜测站点名称
   * 测试站点名称检测逻辑
   */
  it('guesses site name from title before hostname', () => {
    expect(detectSiteName('https://api.example.com', 'Example API - Console')).toEqual({
      value: 'Example API',
      source: 'html_title',
      confidence: 0.78
    })
  })

  /**
   * 验证从 URL 返回完整的检测合约
   * 测试站点检测的完整流程
   */
  it('returns a complete detection contract from URL only', () => {
    const result = detectSiteFromUrl({ url: 'https://one-hub.example.com/v1/models' })

    expect(result).toMatchObject({
      input_url: 'https://one-hub.example.com/v1/models',
      url: 'https://one-hub.example.com',
      canonical_url: 'https://one-hub.example.com/v1',
      url_action: 'strip_known_api_suffix',
      api_type: 'OneHub',
      api_type_source: 'url_hint',
      site_name_source: 'hostname',
      supports_checkin: true,
      requires_user_id: false,
      default_user_info_endpoint: '/api/user/self',
      default_models_endpoint: '/v1/models'
    })
    expect(result).not.toHaveProperty('site_group_key')
    expect(result.site_name.length).toBeGreaterThan(0)
    expect(result.api_type_confidence).toBeGreaterThanOrEqual(0.7)
  })
})

/**
 * 站点检测路由合约测试
 * 验证站点检测路由的正确性和一致性
 */
describe('site detection route contract', () => {
  const routeSource = readFileSync('worker/src/routes/sites.ts', 'utf8')

  /**
   * 验证在数字站点 ID 路由之前注册 POST /api/sites/detect
   * 测试路由注册顺序
   */
  it('registers POST /api/sites/detect before numeric site id routing', () => {
    const detectIndex = routeSource.indexOf("url.pathname === '/api/sites/detect'")
    const idIndex = routeSource.indexOf('const id = idFromPath(url.pathname)')

    expect(detectIndex).toBeGreaterThan(-1)
    expect(idIndex).toBeGreaterThan(-1)
    expect(detectIndex).toBeLessThan(idIndex)
    expect(routeSource).toContain('detectSiteFromUrl')
  })

  /**
   * 验证返回 BAD_REQUEST 而不是将无效 URL 错误泄露为 500 响应
   * 测试错误处理和响应格式
   */
  it('returns BAD_REQUEST instead of leaking invalid URL errors as 500 responses', async () => {
    const response = await handleSiteRoutes(
      new Request('https://local.test/api/sites/detect', {
        method: 'POST',
        body: JSON.stringify({ url: 'http://' })
      }),
      {} as never,
      {} as ExecutionContext
    )
    const body = await response.json() as { success: boolean; error?: { code: string; message: string } }

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error?.code).toBe('BAD_REQUEST')
    expect(body.error?.message).toBe('站点网址格式不正确')
  })
})
