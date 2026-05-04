import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  analyzeSiteUrl,
  detectPlatformByUrlHint,
  detectSiteFromUrl,
  detectSiteName
} from '../../worker/src/services/site-detection-service'
import { handleSiteRoutes } from '../../worker/src/routes/sites'

describe('site detection service', () => {
  it('strips known OpenAI-compatible API suffixes while keeping API base URL', () => {
    const result = analyzeSiteUrl('https://example.com/v1/models')

    expect(result.persistedUrl).toBe('https://example.com')
    expect(result.canonicalUrl).toBe('https://example.com/v1')
    expect(result.urlAction).toBe('strip_known_api_suffix')
  })

  it('preserves semantic API path instead of stripping it as a generic suffix', () => {
    const result = analyzeSiteUrl('https://api.example.com/api/coding/paas/v4')

    expect(result.persistedUrl).toBe('https://api.example.com/api/coding/paas/v4')
    expect(result.canonicalUrl).toBe('https://api.example.com/api/coding/paas/v4')
    expect(result.urlAction).toBe('preserve_semantic_path')
  })

  it('detects platform from known URL hints', () => {
    expect(detectPlatformByUrlHint('https://one-api.example.com')?.apiType).toBe('OneApi')
    expect(detectPlatformByUrlHint('https://one-hub.example.com')?.apiType).toBe('OneHub')
    expect(detectPlatformByUrlHint('https://rix-api.example.com')?.apiType).toBe('RixApi')
    expect(detectPlatformByUrlHint('https://veloera.example.com')?.apiType).toBe('Veloera')
    expect(detectPlatformByUrlHint('https://anyrouter.example.com')?.apiType).toBe('AnyRouter')
    expect(detectPlatformByUrlHint('https://vo-api.example.com')?.apiType).toBe('VoApi')
  })

  it('guesses site name from title before hostname', () => {
    expect(detectSiteName('https://api.example.com', 'Example API - Console')).toEqual({
      value: 'Example API',
      source: 'html_title',
      confidence: 0.78
    })
  })

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

describe('site detection route contract', () => {
  const routeSource = readFileSync('worker/src/routes/sites.ts', 'utf8')

  it('registers POST /api/sites/detect before numeric site id routing', () => {
    const detectIndex = routeSource.indexOf("url.pathname === '/api/sites/detect'")
    const idIndex = routeSource.indexOf('const id = idFromPath(url.pathname)')

    expect(detectIndex).toBeGreaterThan(-1)
    expect(idIndex).toBeGreaterThan(-1)
    expect(detectIndex).toBeLessThan(idIndex)
    expect(routeSource).toContain('detectSiteFromUrl')
  })

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
