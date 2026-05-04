import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const indexSource = readFileSync('worker/src/index.ts', 'utf8')
const checkinRouteSource = readFileSync('worker/src/routes/checkin.ts', 'utf8')
const apiSiteSource = readFileSync('frontend/src/api/apiSite.ts', 'utf8')
const appSource = readFileSync('frontend/src/App.tsx', 'utf8')

describe('batch execution scope contracts', () => {
  it('does not expose a separate task center for current site operations', () => {
    expect(indexSource).not.toContain("url.pathname.startsWith('/api/tasks')")
    expect(indexSource).not.toContain('handleTaskRoutes')
    expect(apiSiteSource).not.toContain('export interface BackgroundTask')
    expect(apiSiteSource).not.toContain('export const ApiTasks')
    expect(appSource).not.toContain('后台任务')
  })

  it('keeps batch checkin, balance and token sync as direct API calls', () => {
    expect(checkinRouteSource).toContain("url.pathname === '/api/sites/batch-checkin'")
    expect(checkinRouteSource).toContain("url.pathname === '/api/sites/batch-refresh-balance'")
    expect(checkinRouteSource).toContain("url.pathname === '/api/sites/batch-sync-tokens'")
    expect(checkinRouteSource).not.toContain('wait?: boolean')
    expect(checkinRouteSource).not.toContain('createBatchTask')
    expect(checkinRouteSource).not.toContain('_ctx.waitUntil')
    expect(apiSiteSource).not.toContain('wait?: boolean')
  })
})
