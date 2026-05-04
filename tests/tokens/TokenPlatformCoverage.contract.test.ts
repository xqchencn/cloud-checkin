import { describe, expect, it } from 'vitest'
import { __tokenServiceTestHooks } from '../../worker/src/services/token-service'

/**
 * 令牌平台覆盖测试
 * 验证不同平台的令牌功能覆盖
 */
describe('token platform coverage', () => {
  /**
   * 验证远程令牌列表使用 size=100
   * 测试令牌列表分页大小
   */
  it('uses size=100 for remote token list', () => {
    expect(__tokenServiceTestHooks.tokenListPath('NewApi')).toBe('/api/token/?p=0&size=100')
    expect(__tokenServiceTestHooks.tokenListPath('OneApi')).toBe('/api/token/?p=0&size=100')
  })

  /**
   * 验证使用适配器顺序中的两个已知组端点
   * 测试令牌组端点候选
   */
  it('uses both known group endpoints in adapter order', () => {
    expect(__tokenServiceTestHooks.tokenGroupEndpointCandidates('OneHub')).toEqual(['/api/user_group_map', '/api/user/self/groups'])
    expect(__tokenServiceTestHooks.tokenGroupEndpointCandidates('NewApi')).toEqual(['/api/user/self/groups', '/api/user_group_map'])
  })

  /**
   * 验证不将远程令牌更新暴露为支持的上游操作
   * 测试远程令牌更新支持
   */
  it('does not expose remote token update as a supported upstream action', () => {
    expect(__tokenServiceTestHooks.supportsRemoteTokenUpdate('NewApi')).toBe(false)
    expect(__tokenServiceTestHooks.supportsRemoteTokenUpdate('DoneHub')).toBe(false)
  })

  /**
   * 验证使用平台配额因子转换令牌配额
   * 测试令牌配额转换
   */
  it('converts token quota with the platform quota factor', () => {
    expect(__tokenServiceTestHooks.convertQuotaForPlatform(500000, 'NewApi')).toBe(1)
    expect(__tokenServiceTestHooks.convertQuotaForPlatform(1000000, 'Veloera')).toBe(1)
  })
})
