import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 数据库演进合约测试
 * 验证数据库结构演进的一致性和正确性
 */
const schemaSource = readFileSync('migrations/0001_api_site_tables.sql', 'utf8')
const typesSource = readFileSync('worker/src/types.ts', 'utf8')
const dbSource = readFileSync('worker/src/db.ts', 'utf8')
const tokenRepositorySource = readFileSync('worker/src/repositories/token-repository.ts', 'utf8')
const readmeSource = readFileSync('README.md', 'utf8')

/**
 * 数据库演进合约测试套件
 */
describe('adoption database evolution contracts', () => {
  const defaultColumnName = ['is', 'default'].join('_')

  it('creates current site-management fields directly in the final api_sites schema', () => {
    expect(schemaSource).toContain('account_label TEXT')
    expect(schemaSource).toContain('sort_order INTEGER DEFAULT 0')
    expect(schemaSource).toContain('CREATE INDEX IF NOT EXISTS idx_api_sites_enabled_sort_balance')
    expect(schemaSource).not.toContain('ALTER TABLE')
    expect(schemaSource).not.toContain('site_group_key')
    expect(typesSource).toContain('account_label: string | null')
    expect(typesSource).toContain('sort_order: number')
    expect(dbSource).toContain('account_label')
    expect(dbSource).toContain('sort_order')
  })

  it('adds token lifecycle fields to api_site_tokens', () => {
    expect(schemaSource).toContain("value_status TEXT DEFAULT 'ready'")
    expect(schemaSource).not.toContain(defaultColumnName)
    expect(schemaSource).toContain("source TEXT DEFAULT 'remote'")
    expect(tokenRepositorySource).toContain('value_status')
    expect(tokenRepositorySource).not.toContain(defaultColumnName)
    expect(tokenRepositorySource).toContain('source')
  })

  it('adds checkin diagnostic fields without separate runtime health state', () => {
    for (const column of ['skip_reason', 'failure_reason', 'balance_before', 'balance_after']) {
      expect(schemaSource).toContain(column)
      expect(typesSource).toContain(`${column}:`)
    }
    expect(schemaSource).not.toContain('runtime_health_state')
  })

  it('does not maintain a separate fresh-project schema contract in README', () => {
    expect(readmeSource).not.toContain('sql/schema.sql')
  })

  it('keeps runtime-facing source free of comparison labels', () => {
    const checkedSources = [
      readmeSource,
      readFileSync('frontend/src/App.tsx', 'utf8'),
      readFileSync('frontend/src/api/apiSite.ts', 'utf8'),
      readFileSync('worker/src/services/checkin-service.ts', 'utf8'),
      readFileSync('worker/src/services/scheduler-service.ts', 'utf8'),
      schemaSource,
    ].join('\n')

    for (const pattern of [/G[o0]\s*版/i, /G[o0]版/i, /G[o0]\s*版本/i, /meta[a-z]{2}/i]) {
      expect(checkedSources).not.toMatch(pattern)
    }
  })
})
