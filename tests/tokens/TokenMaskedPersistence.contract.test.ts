import { describe, expect, it } from 'vitest'
import { __tokenServiceTestHooks } from '../../worker/src/services/token-service'

/**
 * 掩码令牌持久化测试
 * 验证掩码令牌的持久化逻辑
 */
describe('masked token persistence', () => {
  /**
   * 验证当本地不存在完整密钥时将上游掩码令牌标记为 masked_pending
   * 测试掩码令牌状态标记逻辑
   */
  it('marks upstream masked token as masked_pending when no local full key exists', () => {
    const input = __tokenServiceTestHooks.tokenInputFromRemoteForTest(1, 'NewApi', { id: 10, key: 'sk-abc****xyz', name: 'masked' }, null)
    expect(input.value_status).toBe('masked_pending')
    expect(input.token_key).toBe('sk-abc****xyz')
  })

  /**
   * 验证当上游返回掩码值时保持现有完整密钥
   * 测试完整密钥保持逻辑
   */
  it('keeps existing full key when upstream returns masked value', () => {
    const input = __tokenServiceTestHooks.tokenInputFromRemoteForTest(1, 'NewApi', { id: 10, key: 'sk-abc****xyz', name: 'masked' }, 'sk-full')
    expect(input.value_status).toBe('ready')
    expect(input.token_key).toBe('sk-full')
  })
})
