import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 采用剩余完成度合约测试
 * 验证采用剩余功能的完整性和一致性
 */
const apiSiteSource = readFileSync('frontend/src/api/apiSite.ts', 'utf8')
const siteRouteSource = readFileSync('worker/src/routes/sites.ts', 'utf8')
const siteServiceSource = readFileSync('worker/src/services/site-service.ts', 'utf8')
const tokenRouteSource = readFileSync('worker/src/routes/tokens.ts', 'utf8')
const tokenServiceSource = readFileSync('worker/src/services/token-service.ts', 'utf8')
const tokenRepositorySource = readFileSync('worker/src/repositories/token-repository.ts', 'utf8')
import { appSource, siteDetailTokenListSource as tokenListSource } from '../sources'
const schemaSource = readFileSync('migrations/0001_api_site_tables.sql', 'utf8')
const typesSource = readFileSync('worker/src/types.ts', 'utf8')
const checkinLogRepositorySource = readFileSync('worker/src/repositories/checkin-log-repository.ts', 'utf8')
const checkinServiceSource = readFileSync('worker/src/services/checkin-service.ts', 'utf8')

/**
 * 采用剩余完成度合约测试套件
 */
describe('adoption remaining completion contracts', () => {
  const forbiddenDefaultLabel = ['默认', ' Token'].join('')
  const defaultActionText = ['设', '为', '默认'].join('')
  const defaultColumnName = ['is', 'default'].join('_')
  const remoteEditText = ['编辑', '远端'].join('')

  it('keeps URL detection and same-url management endpoints implemented', () => {
    expect(siteRouteSource).toContain("url.pathname === '/api/sites/detect'")
    expect(siteRouteSource).not.toContain("url.searchParams.get('group_key')")
    expect(siteRouteSource).toContain("url.pathname === '/api/sites/grouped'")
    expect(siteRouteSource).toContain("url.pathname === '/api/sites/match'")
    expect(siteRouteSource).toContain("url.pathname === '/api/sites/batch-update-by-url'")
    expect(siteRouteSource).toContain("url.pathname === `/api/sites/${id}/rebind-auth`")
    expect(siteServiceSource).toContain('async grouped(')
    expect(siteServiceSource).toContain('const groupKey = site.url')
    expect(siteServiceSource).not.toContain('async listByGroupKey(')
    expect(siteServiceSource).toContain('async batchUpdateByUrl(')
    expect(siteServiceSource).toContain('async rebindAuth(')
    expect(siteServiceSource).not.toContain('async refreshHealth(')
    expect(siteServiceSource).not.toContain('async verifyAuth(')
  })

  it('keeps token lifecycle and remote token site-management operations implemented', () => {
    expect(apiSiteSource).toContain('export const ApiSiteSyncTokens')
    expect(apiSiteSource).toContain('export const ApiSiteBatchSyncTokens')
    expect(apiSiteSource).toContain('export const ApiSiteCreateRemoteToken')
    expect(apiSiteSource).not.toContain('export const ApiSiteUpdateRemoteToken')
    expect(apiSiteSource).toContain('export const ApiSiteDeleteRemoteToken')
    expect(apiSiteSource).toContain('export const ApiSiteGetRemoteTokenGroups')
    expect(apiSiteSource).not.toContain('ApiSiteSetDefaultToken')

    expect(tokenRouteSource).not.toContain('/^\\/api\\/sites\\/(\\d+)\\/tokens\\/(\\d+)\\/default$/')
    expect(tokenRouteSource).toContain('/^\\/api\\/sites\\/(\\d+)\\/remote-tokens$/')
    expect(tokenRouteSource).toContain('/^\\/api\\/sites\\/(\\d+)\\/remote-tokens\\/(.+)$/')
    expect(tokenRouteSource).toContain('/^\\/api\\/sites\\/(\\d+)\\/remote-token-groups$/')
    expect(tokenServiceSource).not.toContain('async setDefaultToken(')
    expect(tokenServiceSource).toContain('async createRemoteToken(')
    expect(tokenServiceSource).not.toContain('async updateRemoteToken(')
    expect(tokenServiceSource).toContain('async deleteRemoteToken(')
    expect(tokenServiceSource).toContain('async getRemoteTokenGroups(')
    expect(tokenRepositorySource).not.toContain('async setDefault(')
    expect(appSource).toContain('ApiSiteGetRemoteTokenGroups')
    expect(tokenListSource).toContain('新建远端 Token')
    expect(tokenListSource).not.toContain(remoteEditText)
    expect(tokenListSource).toContain('删除远端')
    expect(tokenListSource).not.toContain(defaultActionText)

    for (const source of [tokenRouteSource, tokenServiceSource, apiSiteSource]) {
      expect(source).not.toContain('/tokens/sync')
      expect(source).not.toContain('/tokens/sync-all')
      expect(source).not.toContain('token-statistics')
      expect(source).not.toContain('updateTokenActive')
      expect(source).not.toContain('async deleteToken(')
      expect(source).not.toContain('ApiSiteSyncTokensAlias')
      expect(source).not.toContain('ApiSiteSyncAllTokens')
    }
  })

  it('exposes client calls for completed endpoints and detection request options', () => {
    expect(apiSiteSource).toContain('fetchTitle?: boolean')
    expect(apiSiteSource).toContain('detectPreset?: boolean')
    expect(apiSiteSource).toContain('export const ApiSiteGrouped')
    expect(apiSiteSource).not.toContain('export const ApiSiteListByGroupKey')
    expect(apiSiteSource).toContain('export const ApiSiteBatchUpdateByUrl')
    expect(apiSiteSource).toContain('export const ApiSiteRebindAuth')
    expect(apiSiteSource).not.toContain('export const ApiSiteSetDefaultToken')
    expect(apiSiteSource).not.toContain('export const ApiSiteRefreshHealth')
    expect(apiSiteSource).not.toContain('export const ApiTaskCancel')
  })

  it('persists current checkin log diagnostic fields', () => {
    for (const column of ['skip_reason', 'failure_reason', 'balance_before', 'balance_after']) {
      expect(schemaSource).toContain(column)
      expect(typesSource).toContain(`${column}:`)
      expect(checkinLogRepositorySource).toContain(column)
    }
    expect(checkinServiceSource).toContain('buildCheckinDiagnostics')
    expect(checkinServiceSource).toContain("status: 'skipped'")
    expect(typesSource).toContain("'skipped'")
    expect(schemaSource).not.toContain('runtime_health_state')
  })
})
