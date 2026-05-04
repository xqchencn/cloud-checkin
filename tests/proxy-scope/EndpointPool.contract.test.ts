import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const siteRouteSource = readFileSync('worker/src/routes/sites.ts', 'utf8')
const apiSiteSource = readFileSync('frontend/src/api/apiSite.ts', 'utf8')
import { appSource } from '../sources'

describe('site base URL scope contracts', () => {
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

  it('keeps the single configured site URL and custom checkin path as the site runtime source', () => {
    expect(apiSiteSource).toContain('url: string')
    expect(apiSiteSource).toContain('checkin_endpoint: string | null')
    expect(appSource).toContain('签到端点')
  })
})
