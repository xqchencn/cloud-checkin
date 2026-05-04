import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const indexSource = readFileSync('worker/src/index.ts', 'utf8')
const checkinRouteSource = readFileSync('worker/src/routes/checkin.ts', 'utf8')
const apiSiteSource = readFileSync('frontend/src/api/apiSite.ts', 'utf8')
const appSource = readFileSync('frontend/src/App.tsx', 'utf8')

/**
 * 批量执行范围合约测试
 * 验证批量执行功能的一致性和正确性
 */
describe('batch execution scope contracts', () => {
  /**
   * 验证不为当前站点操作暴露单独的任务中心
   * 确保任务中心功能未被意外引入
   */
  it('does not expose a separate task center for current site operations', () => {
    expect(indexSource).not.toContain("url.pathname.startsWith('/api/tasks')")
    expect(indexSource).not.toContain('handleTaskRoutes')
    expect(apiSiteSource).not.toContain('export interface BackgroundTask')
    expect(apiSiteSource).not.toContain('export const ApiTasks')
    expect(appSource).not.toContain('后台任务')
  })

  /**
   * 验证批量签到、余额和令牌同步作为直接 API 调用
   * 确保批量操作使用正确的 API 端点
   */
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
