import { describe, expect, it } from 'vitest'
import { __tokenServiceTestHooks } from '../../worker/src/services/token-service'

describe('token platform coverage', () => {
  it('uses size=100 for remote token list', () => {
    expect(__tokenServiceTestHooks.tokenListPath('NewApi')).toBe('/api/token/?p=0&size=100')
    expect(__tokenServiceTestHooks.tokenListPath('OneApi')).toBe('/api/token/?p=0&size=100')
  })

  it('uses both known group endpoints in adapter order', () => {
    expect(__tokenServiceTestHooks.tokenGroupEndpointCandidates('OneHub')).toEqual(['/api/user_group_map', '/api/user/self/groups'])
    expect(__tokenServiceTestHooks.tokenGroupEndpointCandidates('NewApi')).toEqual(['/api/user/self/groups', '/api/user_group_map'])
  })

  it('does not expose remote token update as a supported upstream action', () => {
    expect(__tokenServiceTestHooks.supportsRemoteTokenUpdate('NewApi')).toBe(false)
    expect(__tokenServiceTestHooks.supportsRemoteTokenUpdate('DoneHub')).toBe(false)
  })

  it('converts token quota with the platform quota factor', () => {
    expect(__tokenServiceTestHooks.convertQuotaForPlatform(500000, 'NewApi')).toBe(1)
    expect(__tokenServiceTestHooks.convertQuotaForPlatform(1000000, 'Veloera')).toBe(1)
  })
})
