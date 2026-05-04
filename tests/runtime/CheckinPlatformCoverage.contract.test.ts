import { describe, expect, it } from 'vitest'
import { __checkinServiceTestHooks } from '../../worker/src/services/checkin-service'

describe('checkin platform endpoint candidates', () => {
  it('uses NewApi-compatible checkin then sign_in fallback', () => {
    expect(__checkinServiceTestHooks.checkinEndpointCandidates('NewApi')).toEqual(['/api/user/checkin', '/api/user/sign_in'])
  })

  it('keeps AnyRouter legacy sign_in before checkin fallback', () => {
    expect(__checkinServiceTestHooks.checkinEndpointCandidates('AnyRouter')).toEqual(['/api/user/sign_in', '/api/user/checkin'])
  })

  it('uses Veloera upstream-compatible checkin endpoint', () => {
    expect(__checkinServiceTestHooks.checkinEndpointCandidates('Veloera')[0]).toBe('/api/user/checkin')
    expect(__checkinServiceTestHooks.checkinEndpointCandidates('Veloera')).not.toContain('/api/user/check_in')
  })

  it('keeps DoneHub unsupported', () => {
    expect(__checkinServiceTestHooks.checkinEndpointCandidates('DoneHub')).toEqual([])
  })

  it('keeps RixApi and VoApi compatibility fallbacks after NewApi-compatible endpoints', () => {
    expect(__checkinServiceTestHooks.checkinEndpointCandidates('RixApi')).toEqual(['/api/user/checkin', '/api/user/sign_in', '/panel'])
    expect(__checkinServiceTestHooks.checkinEndpointCandidates('VoApi')).toEqual(['/api/user/checkin', '/api/user/sign_in', '/api/user/clock_in'])
  })
})
