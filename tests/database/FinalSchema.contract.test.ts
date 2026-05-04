import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 最终本地数据库模式合约测试
 * 验证数据库最终模式的一致性和正确性
 */
const migrationFiles = readdirSync('migrations').filter(file => file.endsWith('.sql'))
const schemaSource = readFileSync('migrations/0001_api_site_tables.sql', 'utf8')

/**
 * 最终本地数据库模式合约测试套件
 */
describe('final local database schema contract', () => {
  const defaultColumnName = ['is', 'default'].join('_')

  it('keeps the new-project schema in one create-table migration without incremental ALTER statements', () => {
    expect(migrationFiles).toEqual(['0001_api_site_tables.sql'])
    expect(schemaSource).toContain('CREATE TABLE IF NOT EXISTS api_sites')
    expect(schemaSource).toContain('sort_order INTEGER DEFAULT 0')
    expect(schemaSource).toContain('account_label TEXT')
    expect(schemaSource).toContain('checkin_endpoint TEXT')
    expect(schemaSource).toContain('value_status TEXT DEFAULT')
    expect(schemaSource).not.toContain(defaultColumnName)
    expect(schemaSource).toContain('source TEXT DEFAULT')
    expect(schemaSource).toContain('skip_reason TEXT')
    expect(schemaSource).toContain('failure_reason TEXT')
    expect(schemaSource).toContain('balance_before REAL')
    expect(schemaSource).toContain('balance_after REAL')
    expect(schemaSource).toContain('idx_api_sites_enabled_sort_balance')
    expect(schemaSource).not.toContain('ALTER TABLE')
    expect(schemaSource).not.toContain('site_group_key')
  })
})
