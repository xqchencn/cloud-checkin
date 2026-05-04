import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const schemaSource = readFileSync('migrations/0001_api_site_tables.sql', 'utf8')
const siteRepositorySource = readFileSync('worker/src/repositories/site-repository.ts', 'utf8')
const siteServiceSource = readFileSync('worker/src/services/site-service.ts', 'utf8')
const tokenRepositorySource = readFileSync('worker/src/repositories/token-repository.ts', 'utf8')

describe('site identity and token persistence contracts', () => {
  const defaultColumnName = ['is', 'default'].join('_')

  it('deduplicates site credential records by URL and account label', () => {
    expect(schemaSource).toContain('idx_api_sites_url_account_label_unique')
    expect(schemaSource).toContain("WHERE account_label IS NOT NULL AND account_label != ''")
    expect(siteRepositorySource).toContain('existsByUrlAndAccountLabel')
    expect(siteRepositorySource).toContain('findByUrlAndAccountLabel')
    expect(siteServiceSource).toContain('findImportTargetSite')
    expect(siteServiceSource).toMatch(/existsByUrlAndAccountLabel\(input\.url,\s*input\.account_label \|\| ''\)/)
    expect(siteServiceSource).toMatch(/existsByUrlAndAccountLabel\(input\.url,\s*input\.account_label \|\| '',\s*id\)/)
    expect(siteServiceSource).not.toContain('existsByNameAndUrl(input.name, input.url')
  })

  it('keeps legacy import matching only when account_label is absent', () => {
    expect(siteServiceSource).toContain("Object.prototype.hasOwnProperty.call(row, 'account_label')")
    expect(siteServiceSource).toContain('findByNameAndUrl(input.name, input.url)')
    expect(siteServiceSource).toContain('findByUrlAndAccountLabel(input.url, input.account_label ||')
  })

  it('parses imported boolean-like values consistently', () => {
    expect(siteServiceSource).toContain('function parseBoolean(input: unknown, defaultValue: boolean): boolean')
    expect(siteServiceSource).toContain('enabled: parseBoolean(input.enabled, true)')
    expect(siteServiceSource).toContain('auto_checkin: parseBoolean(input.auto_checkin, false)')
  })

  it('does not export site credentials unless includeSensitive is true', () => {
    expect(siteServiceSource).toContain('const shouldIncludeSensitive = includeSensitive === true')
    expect(siteServiceSource).toContain("auth_value: shouldIncludeSensitive ? site.auth_value || '' : ''")
    expect(siteServiceSource).toContain("login_username: shouldIncludeSensitive ? site.login_username || '' : ''")
    expect(siteServiceSource).toContain("login_password: shouldIncludeSensitive ? site.login_password || '' : ''")
    expect(siteServiceSource).toContain('tokens: shouldIncludeSensitive ? siteTokens : []')
  })

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
