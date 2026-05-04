import { describe, expect, it } from 'vitest'
import { __tokenServiceTestHooks } from '../../worker/src/services/token-service'

describe('masked token persistence', () => {
  it('marks upstream masked token as masked_pending when no local full key exists', () => {
    const input = __tokenServiceTestHooks.tokenInputFromRemoteForTest(1, 'NewApi', { id: 10, key: 'sk-abc****xyz', name: 'masked' }, null)
    expect(input.value_status).toBe('masked_pending')
    expect(input.token_key).toBe('sk-abc****xyz')
  })

  it('keeps existing full key when upstream returns masked value', () => {
    const input = __tokenServiceTestHooks.tokenInputFromRemoteForTest(1, 'NewApi', { id: 10, key: 'sk-abc****xyz', name: 'masked' }, 'sk-full')
    expect(input.value_status).toBe('ready')
    expect(input.token_key).toBe('sk-full')
  })
})
