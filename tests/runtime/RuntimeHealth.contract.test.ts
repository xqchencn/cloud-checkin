import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const siteRepositorySource = readFileSync('worker/src/repositories/site-repository.ts', 'utf8')
const balanceSource = readFileSync('worker/src/services/balance-service.ts', 'utf8')
const checkinSource = readFileSync('worker/src/services/checkin-service.ts', 'utf8')
const schemaSource = readFileSync('migrations/0001_api_site_tables.sql', 'utf8')

describe('runtime health correction contracts', () => {
  it('does not maintain a separate runtime health state for site management', () => {
    for (const source of [siteRepositorySource, balanceSource, checkinSource, schemaSource]) {
      expect(source).not.toContain('updateRuntimeHealth')
      expect(source).not.toContain('runtime_health_state')
      expect(source).not.toContain('runtime_health_reason')
      expect(source).not.toContain('runtime_health_source')
      expect(source).not.toContain('runtime_health_updated_at')
    }
  })

  it('keeps actionable status on existing balance and checkin fields', () => {
    expect(balanceSource).toContain('last_check_status')
    expect(balanceSource).toContain('last_check_message')
    expect(checkinSource).toContain('last_checkin_status')
    expect(checkinSource).toContain('buildCheckinDiagnostics')
  })
})
