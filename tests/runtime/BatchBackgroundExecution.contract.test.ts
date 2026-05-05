import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const routeSource = readFileSync('worker/src/routes/checkin.ts', 'utf8')
const apiSource = readFileSync('frontend/src/api/apiSite.ts', 'utf8')

/**
 * 批量执行修正合约测试
 * 验证批量执行功能的修正和一致性
 */
describe('batch execution correction contracts', () => {
  /**
   * 验证不保留之前的异步任务创建路径
   * 确保异步任务功能已被正确移除
   */
  it('does not keep the previous async job creation path', () => {
    expect(existsSync('worker/src/services/background-task-service.ts')).toBe(false)
    expect(existsSync('worker/src/repositories/background-task-repository.ts')).toBe(false)
    expect(routeSource).not.toContain('{ status: 202 }')
    expect(apiSource).not.toContain('BatchTaskResult')
  })

  /**
   * 验证保留批量 API 兼容入口但不使用等待标志。
   */
  it('keeps batch API compatibility without wait flags', () => {
    expect(apiSource).toContain('ApiSiteBatchRefreshBalance = (siteIds: number[])')
    expect(apiSource).toContain('ApiSiteBatchCheckin = (siteIds: number[])')
    expect(apiSource).toContain('ApiSiteBatchSyncTokens = (siteIds: number[])')
    expect(apiSource).not.toContain('wait')
  })
})
