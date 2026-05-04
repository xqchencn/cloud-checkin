import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { quotaConversionFactor } from '../../worker/src/services/balance-service'
import { getPlatformAdapter, listPlatformAdapters } from '../../worker/src/services/platforms/index'
import { getEndpointCandidates, getEndpointCheckin, getEndpointModels, getSiteTypeConfig, getUserIdHeader, getUserIdHeaders, supportsCheckin } from '../../worker/src/services/site-types'

describe('platform adapter contracts', () => {
  it('exposes every current site type through the adapter registry', () => {
    const adapters = listPlatformAdapters()
    const names = adapters.map(adapter => adapter.name).sort()

    expect(names).toEqual(['AnyRouter', 'DoneHub', 'NewApi', 'OneApi', 'OneHub', 'RixApi', 'Veloera', 'VoApi'])
    expect(getPlatformAdapter('NewApi')?.endpoints.userInfo).toEqual(['/api/user/self'])
    expect(getPlatformAdapter('OneHub')?.endpoints.userInfo).toEqual(['/api/user/self'])
    expect(getPlatformAdapter('Veloera')?.endpoints.userInfo).toEqual(['/api/user/self'])
    expect(getPlatformAdapter('AnyRouter')?.endpoints.userInfo).toEqual(['/api/user/self'])
    expect(getPlatformAdapter('DoneHub')?.endpoints.userInfo).toEqual(['/api/user/self'])
    expect(getPlatformAdapter('OneHub')?.endpoints.models).toEqual(['/v1/models', '/api/available_model'])
    expect(getPlatformAdapter('DoneHub')?.capabilities.checkin).toBe(false)
  })

  it('keeps platform-specific quota unit conversion explicit', () => {
    expect(quotaConversionFactor('NewApi')).toBe(500000)
    expect(quotaConversionFactor('AnyRouter')).toBe(500000)
    expect(quotaConversionFactor('OneHub')).toBe(500000)
    expect(quotaConversionFactor('DoneHub')).toBe(500000)
    expect(quotaConversionFactor('Veloera')).toBe(1000000)
  })

  it('keeps legacy site type helpers backed by adapter metadata', () => {
    expect(getSiteTypeConfig('AnyRouter')?.displayName).toBe('Any Router')
    expect(supportsCheckin('DoneHub')).toBe(false)
    expect(getUserIdHeader('Veloera')).toBe('Veloera-User')
    expect(getUserIdHeaders('NewApi')).toContain('Rix-Api-User')
    expect(getUserIdHeaders('NewApi')).toContain('voapi-user')
    expect(getEndpointCheckin('VoApi')).toBe('/api/user/checkin')
    expect(getEndpointCandidates('VoApi', 'checkin')).toContain('/api/user/clock_in')
    expect(getEndpointModels('OneHub')).toBe('/v1/models')
    expect(getEndpointCandidates('OneHub', 'models')).toEqual(['/v1/models', '/api/available_model'])
  })

  it('declares token management as current site-management capability across all 8 types', () => {
    for (const adapter of listPlatformAdapters()) {
      expect(adapter.token.listPageSize).toBe(100)
      expect(adapter.token.createRemote).toBe(true)
      expect(adapter.token.deleteRemote).toBe(true)
      expect(adapter.token.updateRemote).toBe(false)
    }
  })
})

describe('platform adapter usage contracts', () => {
  const balanceSource = readFileSync('worker/src/services/balance-service.ts', 'utf8')
  const tokenSource = readFileSync('worker/src/services/token-service.ts', 'utf8')
  const modelSource = readFileSync('worker/src/services/model-service.ts', 'utf8')
  const checkinSource = readFileSync('worker/src/services/checkin-service.ts', 'utf8')

  it('routes default endpoints through site type adapter helpers', () => {
    expect(balanceSource).toContain('getEndpointCandidates(site.api_type, \'userInfo\')')
    expect(tokenSource).toContain('getEndpointTokens(site.api_type)')
    expect(tokenSource).toContain('getEndpointCandidates(apiType, \'tokenGroups\')')
    expect(modelSource).toContain('modelEndpointCandidates(site.api_type)')
    expect(modelSource).toContain('getEndpointCandidates(apiType, \'models\')')
    expect(checkinSource).toContain('checkinEndpointCandidates(site.api_type)')
    expect(checkinSource).toContain('getEndpointCandidates(apiType, \'checkin\')')
  })
})
