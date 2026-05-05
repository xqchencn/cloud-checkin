import { describe, expect, it } from 'vitest'
import {
  CHECKIN_RETRY_LIMIT,
  CHECKIN_TASK_BATCH_SIZE,
  applyCheckinBatchResult,
  createDailyCheckinState,
  isCheckinWindowOpen,
  selectCheckinBatch
} from '../../worker/src/services/scheduler-service'

/**
 * Free 计划下的每日签到调度合约。
 * 验证单次 Cron 只跑少量站点，并在当天全量完成后再处理失败重试。
 */
describe('daily scheduled checkin batching for Workers Free plan', () => {
  it('opens at 08:30 Asia/Shanghai and skips earlier triggers', () => {
    expect(isCheckinWindowOpen(new Date('2026-05-04T00:29:00.000Z'))).toBe(false)
    expect(isCheckinWindowOpen(new Date('2026-05-04T00:30:00.000Z'))).toBe(true)
  })

  it('runs primary batches first, then retries failed sites up to three times, then completes the day', () => {
    const allSiteIds = [1, 2, 3, 4, 5]
    let state = createDailyCheckinState('2026-05-04')

    expect(CHECKIN_TASK_BATCH_SIZE).toBe(3)
    expect(CHECKIN_RETRY_LIMIT).toBe(3)

    let batch = selectCheckinBatch(state, allSiteIds)
    expect(batch.phase).toBe('primary')
    expect(batch.siteIds).toEqual([1, 2, 3])
    state = applyCheckinBatchResult(batch.state, {
      allSiteIds,
      processedSiteIds: batch.siteIds,
      failedSiteIds: [2]
    })

    batch = selectCheckinBatch(state, allSiteIds)
    expect(batch.phase).toBe('primary')
    expect(batch.siteIds).toEqual([4, 5])
    state = applyCheckinBatchResult(batch.state, {
      allSiteIds,
      processedSiteIds: batch.siteIds,
      failedSiteIds: [4]
    })

    batch = selectCheckinBatch(state, allSiteIds)
    expect(batch.phase).toBe('retry')
    expect(batch.siteIds).toEqual([2, 4])
    state = applyCheckinBatchResult(batch.state, {
      allSiteIds,
      processedSiteIds: batch.siteIds,
      failedSiteIds: [2, 4]
    })
    expect(state.retryAttempts).toMatchObject({ 2: 1, 4: 1 })

    for (let attempt = 2; attempt <= CHECKIN_RETRY_LIMIT; attempt++) {
      batch = selectCheckinBatch(state, allSiteIds)
      expect(batch.phase).toBe('retry')
      expect(batch.siteIds).toEqual([2, 4])
      state = applyCheckinBatchResult(batch.state, {
        allSiteIds,
        processedSiteIds: batch.siteIds,
        failedSiteIds: [2, 4]
      })
    }

    expect(state.phase).toBe('complete')
    expect(state.failedSiteIds).toEqual([])

    batch = selectCheckinBatch(state, allSiteIds)
    expect(batch.phase).toBe('complete')
    expect(batch.siteIds).toEqual([])
  })
})
