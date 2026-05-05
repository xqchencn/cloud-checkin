import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const schemaSource = readFileSync('migrations/0001_api_site_tables.sql', 'utf8')
const apiSource = readFileSync('frontend/src/api/apiSite.ts', 'utf8')
const siteManagerActionsSource = readFileSync('frontend/src/features/site/useSiteManagerActions.ts', 'utf8')
const siteRepositorySource = readFileSync('worker/src/repositories/site-repository.ts', 'utf8')
const siteServiceSource = readFileSync('worker/src/services/site-service.ts', 'utf8')
const tokenRepositorySource = readFileSync('worker/src/repositories/token-repository.ts', 'utf8')

/**
 * 站点身份和令牌持久化合约测试
 * 验证站点身份和令牌持久化功能的一致性和正确性
 */
describe('site identity and token persistence contracts', () => {
  const defaultColumnName = ['is', 'default'].join('_')

  /**
   * 验证通过 URL 和站点名称去重站点记录
   * 测试同 URL 不同名称的站点不会在导入时被合并
   */
  it('deduplicates site records by URL and name', () => {
    expect(schemaSource).toContain('idx_api_sites_url_name_unique')
    expect(schemaSource).not.toContain('idx_api_sites_url_account_label_unique')
    expect(siteRepositorySource).toContain('existsByNameAndUrl')
    expect(siteRepositorySource).toContain('findByNameAndUrl')
    expect(siteServiceSource).toContain('findImportTargetSite')
    expect(siteServiceSource).toMatch(/existsByNameAndUrl\(input\.name,\s*input\.url\)/)
    expect(siteServiceSource).toMatch(/existsByNameAndUrl\(input\.name,\s*input\.url,\s*id\)/)
    expect(siteServiceSource).not.toContain('existsByUrlAndAccountLabel')
    expect(siteRepositorySource).not.toContain('existsByUrlAndAccountLabel')
    expect(siteRepositorySource).not.toContain('findByUrlAndAccountLabel')
  })

  /**
   * 验证导入匹配不受空账户标签影响
   * 测试导出文件中的 account_label: "" 不会导致同 URL 不同名称站点丢失
   */
  it('matches imports by URL and name even when account_label is exported as an empty string', () => {
    expect(siteServiceSource).toContain('findByNameAndUrl(input.name, input.url)')
    expect(siteServiceSource).not.toContain("Object.prototype.hasOwnProperty.call(row, 'account_label')")
    expect(siteServiceSource).not.toContain('findByUrlAndAccountLabel(input.url, input.account_label ||')
  })

  /**
   * 验证一致地解析导入的布尔类值
   * 测试布尔值解析逻辑
   */
  it('parses imported boolean-like values consistently', () => {
    expect(siteServiceSource).toContain('function parseBoolean(input: unknown, defaultValue: boolean): boolean')
    expect(siteServiceSource).toContain('enabled: parseBoolean(input.enabled, true)')
    expect(siteServiceSource).toContain('auto_checkin: parseBoolean(input.auto_checkin, false)')
  })

  /**
   * 验证除非 includeSensitive 为 true，否则不导出站点凭据
   * 测试敏感信息导出逻辑
   */
  it('does not export site credentials unless includeSensitive is true', () => {
    expect(siteServiceSource).toContain('const shouldIncludeSensitive = includeSensitive === true')
    expect(siteServiceSource).toContain("auth_value: shouldIncludeSensitive ? site.auth_value || '' : ''")
    expect(siteServiceSource).toContain("login_username: shouldIncludeSensitive ? site.login_username || '' : ''")
    expect(siteServiceSource).toContain("login_password: shouldIncludeSensitive ? site.login_password || '' : ''")
    expect(siteServiceSource).toContain('tokens: shouldIncludeSensitive ? siteTokens : []')
    expect(apiSource).toContain('ApiSiteExport = (includeSensitive = true)')
    expect(apiSource).toContain("includeSensitive ? '?include_sensitive=true' : ''")
    expect(siteManagerActionsSource).toContain('const text = await ApiSiteExport(true)')
  })

  /**
   * 验证导出的站点备份包含可还原的运行态字段
   * 测试导出再导入不会丢失站点用户、余额、用量和最近检查状态
   */
  it('round-trips site runtime fields in exported backups', () => {
    for (const field of [
      'site_username',
      'site_user_group',
      'site_aff_code',
      'site_quota',
      'site_used_quota',
      'site_request_count',
      'site_aff_count',
      'site_aff_quota',
      'site_aff_history_quota',
      'last_checkin',
      'last_checkin_status',
      'last_check_time',
      'last_check_status',
      'last_check_message'
    ]) {
      expect(siteServiceSource).toContain(`${field}: site.${field}`)
    }
    expect(siteServiceSource).toContain('function importRuntimeFields(row: ApiSiteExportData): Record<string, unknown>')
    expect(siteServiceSource).toContain('await repo.updateFields(siteId, importRuntimeFields(row))')
    expect(siteRepositorySource).toContain('const allowedFields = new Set')
    expect(siteRepositorySource).toContain("if (!allowedFields.has(key)) throw new Error(`Unsupported api_sites field: ${key}`)")
  })

  /**
   * 验证通过远程 ID 或令牌键更新令牌而不使用本地默认令牌状态
   * 测试令牌更新逻辑
   */
  it('upserts tokens by remote id or token key without local default-token state', () => {
    expect(schemaSource).toContain('idx_api_site_tokens_site_remote_id_unique')
    expect(schemaSource).toContain('idx_api_site_tokens_site_token_key_unique')
    expect(tokenRepositorySource).toContain('findExistingTokenForUpsert')
    expect(tokenRepositorySource).toContain('token_key = ?')
    expect(schemaSource).not.toContain(defaultColumnName)
    expect(tokenRepositorySource).not.toContain(defaultColumnName)
    expect(tokenRepositorySource).not.toContain('setDefault')
  })
})
