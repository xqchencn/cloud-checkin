import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const routeSource = readFileSync('worker/src/routes/checkin.ts', 'utf8')
const apiSource = readFileSync('frontend/src/api/apiSite.ts', 'utf8')

describe('batch execution correction contracts', () => {
  it('does not keep the previous async job creation path', () => {
    expect(existsSync('worker/src/services/background-task-service.ts')).toBe(false)
    expect(existsSync('worker/src/repositories/background-task-repository.ts')).toBe(false)
    expect(routeSource).not.toContain('{ status: 202 }')
    expect(apiSource).not.toContain('BatchTaskResult')
  })

  it('submits batch APIs without wait flags', () => {
    expect(apiSource).toContain('ApiSiteBatchRefreshBalance = (siteIds: number[])')
    expect(apiSource).toContain('ApiSiteBatchCheckin = (siteIds: number[])')
    expect(apiSource).toContain('ApiSiteBatchSyncTokens = (siteIds: number[])')
    expect(apiSource).not.toContain('wait')
  })
})
