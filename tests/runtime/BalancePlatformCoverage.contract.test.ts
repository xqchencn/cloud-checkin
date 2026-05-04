import { describe, expect, it } from 'vitest'
import { __balanceServiceTestHooks } from '../../worker/src/services/balance-service'

/**
 * 余额平台解析测试
 * 验证不同平台的余额解析和配额转换
 */
describe('balance platform parsing', () => {
  /**
   * 验证使用平台配额因子进行转换
   * 测试不同平台的配额转换因子
   */
  it('uses platform quota factors', () => {
    expect(__balanceServiceTestHooks.convertQuotaForPlatform(1000000, 'Veloera')).toBe(1)
    expect(__balanceServiceTestHooks.convertQuotaForPlatform(500000, 'NewApi')).toBe(1)
  })

  /**
   * 验证 DoneHub 配额解析为剩余量加已用量总计
   * 测试 DoneHub 平台的特殊配额解析逻辑
   */
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

  /**
   * 验证普通配额解析为总配额和已用量
   * 测试标准平台的配额解析逻辑
   */
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
