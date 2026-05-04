import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const balanceSource = readFileSync('worker/src/services/balance-service.ts', 'utf8')
const checkinSource = readFileSync('worker/src/services/checkin-service.ts', 'utf8')
const tokenSource = readFileSync('worker/src/services/token-service.ts', 'utf8')
const modelSource = readFileSync('worker/src/services/model-service.ts', 'utf8')

describe('remote request runtime scope contracts', () => {
  it('does not select alternate endpoint pools for current site operations', () => {
    expect(existsSync('worker/src/services/site-endpoint-service.ts')).toBe(false)
    for (const source of [balanceSource, checkinSource, tokenSource, modelSource]) {
      expect(source).not.toContain('withSelectedEndpoint')
      expect(source).not.toContain('cooldownSeconds')
      expect(source).not.toContain('markFailure')
    }
  })

  it('uses configured site URL and platform adapter endpoint metadata directly', () => {
    expect(balanceSource).toContain("getEndpointCandidates(site.api_type, 'userInfo')")
    expect(checkinSource).toContain('buildCheckinEndpoints(site)')
    expect(tokenSource).toContain('tokenListEndpoint(site)')
    expect(modelSource).toContain('modelEndpointCandidates(site.api_type)')
    expect(modelSource).toContain("getEndpointCandidates(apiType, 'models')")
  })
})
