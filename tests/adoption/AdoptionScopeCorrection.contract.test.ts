import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 采用范围修正合约测试
 * 验证采用范围的正确性和一致性
 */
const appSource = readFileSync('frontend/src/App.tsx', 'utf8')
const apiSource = readFileSync('frontend/src/api/apiSite.ts', 'utf8')
const typesSource = readFileSync('worker/src/types.ts', 'utf8')
const dbSource = readFileSync('worker/src/db.ts', 'utf8')
const siteServiceSource = readFileSync('worker/src/services/site-service.ts', 'utf8')
const tokenServiceSource = readFileSync('worker/src/services/token-service.ts', 'utf8')
const checkinServiceSource = readFileSync('worker/src/services/checkin-service.ts', 'utf8')
const balanceServiceSource = readFileSync('worker/src/services/balance-service.ts', 'utf8')
const modelServiceSource = readFileSync('worker/src/services/model-service.ts', 'utf8')
const schemaSource = readFileSync('migrations/0001_api_site_tables.sql', 'utf8')
const readmeSource = readFileSync('README.md', 'utf8')
const cryptoPath = 'worker/src/services/credential-crypto.ts'
const skippedPathParts = new Set(['.git', '.wrangler', 'dist', 'node_modules'])
const forbiddenPathPatterns = [/m[e]ta[a-z]{2}/i, /m[a]tapi/i, /g[o0]\s*版/i, /g[o0]版/i, /g[o0]\s*版本/i]

/**
 * 列出项目路径
 * @param dir - 目录路径
 * @returns 项目路径列表
 */
function listProjectPaths(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    if (skippedPathParts.has(entry)) return []
    const path = `${dir}/${entry}`
    const stat = statSync(path)
    if (stat.isDirectory()) return [path, ...listProjectPaths(path)]
    return [path]
  })
}

/**
 * 采用范围修正合约测试套件
 */
describe('adoption scope correction contracts', () => {
  const defaultColumnName = ['is', 'default'].join('_')

  it('does not expose proxy-router features in the site-management UI', () => {
    for (const text of [
      'ApiSiteGetEndpoints',
      'ApiSiteUpdateEndpoints',
      'EndpointPoolEditor',
      '端点池',
      'ApiSiteGetDisabledModels',
      'ApiSiteUpdateDisabledModels',
      'DisabledModelsEditor',
      '禁用模型',
      'ApiSiteRefreshHealth',
      'ApiSiteVerifyAuth',
      '刷新健康',
      '验证鉴权',
      'ApiTaskCancel',
      'ApiTasks(params)',
      '后台任务',
      '__CLOUD_CHECKIN_SECRET_MASKED__',
      'CREDENTIAL_SECRET',
    ]) {
      expect(appSource).not.toContain(text)
    }
  })

  it('keeps database evolution focused on current site management fields', () => {
    expect(schemaSource).toContain('account_label TEXT')
    expect(schemaSource).toContain('sort_order INTEGER DEFAULT 0')
    expect(schemaSource).toContain('CREATE INDEX IF NOT EXISTS idx_api_sites_enabled_sort_balance')
    expect(schemaSource).toContain('value_status TEXT DEFAULT')
    expect(schemaSource).not.toContain(defaultColumnName)
    expect(schemaSource).toContain('source TEXT DEFAULT')
    expect(schemaSource).toContain('skip_reason TEXT')
    expect(schemaSource).toContain('failure_reason TEXT')
    expect(schemaSource).toContain('balance_before REAL')
    expect(schemaSource).toContain('balance_after REAL')
    expect(schemaSource).not.toContain('ALTER TABLE')
    expect(schemaSource).not.toContain('site_group_key')

    for (const text of [
      'credential_mode',
      'platform_user_id',
      'external_checkin_url',
      'runtime_health_',
      'api_site_endpoints',
      'api_background_tasks',
    ]) {
      expect(schemaSource).not.toContain(text)
      expect(typesSource).not.toContain(text)
      expect(dbSource).not.toContain(text)
    }
  })

  it('does not use encryption placeholders or runtime decrypt wrappers in credential flows', () => {
    expect(existsSync(cryptoPath)).toBe(false)
    for (const source of [typesSource, siteServiceSource, tokenServiceSource, checkinServiceSource, balanceServiceSource, modelServiceSource, apiSource, readmeSource]) {
      expect(source).not.toContain('CREDENTIAL_SECRET')
      expect(source).not.toContain('MASKED_SECRET_VALUE')
      expect(source).not.toContain('__CLOUD_CHECKIN_SECRET_MASKED__')
      expect(source).not.toContain('encryptSiteInputForStorage')
      expect(source).not.toContain('decryptSiteForRuntime')
      expect(source).not.toContain('maskSiteForClient')
      expect(source).not.toContain('maskTokenForClient')
    }
  })

  it('uses one custom checkin field and one user id field', () => {
    expect(typesSource).toContain('user_id: string | null')
    expect(typesSource).toContain('checkin_endpoint: string | null')
    expect(typesSource).not.toContain('platform_user_id')
    expect(typesSource).not.toContain('external_checkin_url')
    expect(appSource).not.toContain('平台用户 ID')
    expect(appSource).not.toContain('external_checkin_url')
    expect(appSource).not.toContain('credential_mode')
  })

  it('keeps file paths and user-facing docs free of comparison project names', () => {
    const projectPaths = listProjectPaths('.').map(path => path.replace(/\\/g, '/'))
    for (const path of projectPaths) {
      for (const pattern of forbiddenPathPatterns) {
        expect(path).not.toMatch(pattern)
      }
    }
  })
})
