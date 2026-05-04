import { describe, expect, it } from 'vitest'
import { __balanceServiceTestHooks } from '../../worker/src/services/balance-service'

describe('balance platform parsing', () => {
  it('uses platform quota factors', () => {
    expect(__balanceServiceTestHooks.convertQuotaForPlatform(1000000, 'Veloera')).toBe(1)
    expect(__balanceServiceTestHooks.convertQuotaForPlatform(500000, 'NewApi')).toBe(1)
  })

  it('parses DoneHub quota as remaining plus used total', () => {
    const parsed = __balanceServiceTestHooks.parseBalanceFields('DoneHub', {
      username: 'done',
      quota: 500000,
      used_quota: 250000
    })
    expect(parsed.site_username).toBe('done')
    expect(parsed.site_quota).toBe(1.5)
    expect(parsed.site_used_quota).toBe(0.5)
  })

  it('parses normal quota as total quota and used quota', () => {
    const parsed = __balanceServiceTestHooks.parseBalanceFields('NewApi', {
      username: 'new',
      quota: 500000,
      used_quota: 250000
    })
    expect(parsed.site_username).toBe('new')
    expect(parsed.site_quota).toBe(1)
    expect(parsed.site_used_quota).toBe(0.5)
  })
})
