import type { Dispatch, SetStateAction } from 'react'
import {
  ApiSite,
  ApiSiteCheckin,
  ApiSiteRefreshBalance,
  ApiSiteSyncTokens
} from '../../api/apiSite'
import type { BatchProgress } from '../../shared/types'
import { useToast } from '../../toast'

type BatchCounts = {
  success: number
  failed: number
  skipped: number
}

/**
 * 汇总批量操作结果
 * @param title - 操作标题
 * @param counts - 批量计数
 * @returns 汇总后的字符串
 */
function summarizeBatchOperation(title: string, counts: BatchCounts): string {
  const { success, failed, skipped } = counts
  return `${title}完成：成功 ${success}，失败 ${failed}${skipped ? `，跳过 ${skipped}` : ''}`
}

/**
 * 使用站点批量操作 Hook
 * @param sites - 站点列表
 * @param load - 加载函数
 * @param setBusyKey - 设置忙碌键
 * @param setError - 设置错误
 * @returns 批量操作函数
 */
export function useSiteBatchActions({
  sites,
  load,
  setBusyKey,
  setError,
  setBatchProgress
}: {
  sites: ApiSite[]
  load: () => Promise<void>
  setBusyKey: Dispatch<SetStateAction<string>>
  setError: Dispatch<SetStateAction<string>>
  setBatchProgress: Dispatch<SetStateAction<BatchProgress | null>>
}) {
  const toast = useToast()

  async function runProgressItems({
    title,
    phase,
    targets,
    total,
    startCurrent = 0,
    initialCounts = { success: 0, failed: 0, skipped: 0 },
    run
  }: {
    title: string
    phase: string
    targets: ApiSite[]
    total: number
    startCurrent?: number
    initialCounts?: BatchCounts
    run: (site: ApiSite) => Promise<unknown>
  }): Promise<BatchCounts> {
    const counts = { ...initialCounts }
    for (let index = 0; index < targets.length; index++) {
      const site = targets[index]
      setBatchProgress({
        title,
        phase,
        current: startCurrent + index,
        total,
        currentName: site.name,
        ...counts
      })
      try {
        await run(site)
        counts.success += 1
      } catch {
        counts.failed += 1
      }
      setBatchProgress({
        title,
        phase,
        current: startCurrent + index + 1,
        total,
        currentName: site.name,
        ...counts
      })
    }
    return counts
  }

  /**
   * 运行直接批量操作
   * @param key - 操作键
   * @param title - 操作标题
   * @param targets - 目标站点
   * @param emptyMessage - 空消息
   * @param run - 运行函数
   */
  async function runDirectBatch(
    key: string,
    title: string,
    targets: ApiSite[],
    emptyMessage: string,
    run: (site: ApiSite) => Promise<unknown>
  ) {
    if (!targets.length) {
      setBatchProgress(null)
      toast.error(emptyMessage)
      return
    }
    setBusyKey(key)
    setError('')
    setBatchProgress({
      title,
      phase: '正在执行',
      current: 0,
      total: targets.length,
      currentName: targets[0]?.name || '',
      success: 0,
      failed: 0,
      skipped: 0
    })
    try {
      const counts = await runProgressItems({ title, phase: '正在执行', targets, total: targets.length, run })
      setBatchProgress({ title, phase: '完成', current: targets.length, total: targets.length, currentName: '', ...counts })
      toast.success(summarizeBatchOperation(title, counts))
      await load()
    } catch (err) {
      setBatchProgress(current => current ? { ...current, phase: '执行失败', current: current.total, failed: Math.max(current.failed, current.total - current.success - current.skipped) } : null)
      toast.error(err instanceof Error ? err.message : `${title}失败`)
    } finally {
      setBusyKey('')
    }
  }

  /**
   * 运行批量查询余额
   */
  async function runBatchBalance() {
    const targets = sites.filter(site => site.enabled)
    await runDirectBatch('batch-balance', '批量查询余额', targets, '没有已启用的站点可查询余额', site => ApiSiteRefreshBalance(site.id))
  }

  /**
   * 运行批量签到
   */
  async function runBatchCheckin() {
    const targets = sites.filter(site => site.enabled && site.auto_checkin)
    await runDirectBatch('batch-checkin', '批量签到', targets, '没有已启用自动签到的站点', site => ApiSiteCheckin(site.id))
  }

  /**
   * 运行批量同步 Token
   */
  async function runBatchTokens() {
    const targets = sites.filter(site => site.enabled)
    await runDirectBatch('batch-tokens', '批量同步 Token', targets, '没有已启用的站点可同步 Token', site => ApiSiteSyncTokens(site.id))
  }

  /**
   * 运行批量全部操作
   */
  async function runBatchAll() {
    const enabledSites = sites.filter(site => site.enabled)
    const checkinSites = sites.filter(site => site.enabled && site.auto_checkin)
    if (!enabledSites.length && !checkinSites.length) {
      toast.error('没有可执行批量操作的站点')
      return
    }
    setBusyKey('batch-all')
    setError('')
    const total = enabledSites.length + checkinSites.length + enabledSites.length
    setBatchProgress({
      title: '批量全部',
      phase: '正在查询余额',
      current: 0,
      total,
      currentName: '',
      success: 0,
      failed: 0,
      skipped: 0
    })
    try {
      const balanceCounts = await runProgressItems({
        title: '批量全部',
        phase: '正在查询余额',
        targets: enabledSites,
        total,
        run: site => ApiSiteRefreshBalance(site.id)
      })
      const checkinCounts = await runProgressItems({
        title: '批量全部',
        phase: '正在签到',
        targets: checkinSites,
        total,
        startCurrent: enabledSites.length,
        initialCounts: balanceCounts,
        run: site => ApiSiteCheckin(site.id)
      })
      const tokenCounts = await runProgressItems({
        title: '批量全部',
        phase: '正在同步 Token',
        targets: enabledSites,
        total,
        startCurrent: enabledSites.length + checkinSites.length,
        initialCounts: checkinCounts,
        run: site => ApiSiteSyncTokens(site.id)
      })
      setBatchProgress({
        title: '批量全部',
        phase: '完成',
        current: total,
        total,
        currentName: '',
        ...tokenCounts
      })
      toast.success(summarizeBatchOperation('批量全部', tokenCounts))
      await load()
    } catch (err) {
      setBatchProgress(current => current ? { ...current, phase: '执行失败', current: current.total, failed: Math.max(current.failed, current.total - current.success - current.skipped) } : null)
      toast.error(err instanceof Error ? err.message : '批量全部失败')
    } finally {
      setBusyKey('')
    }
  }

  return { runBatchAll, runBatchBalance, runBatchCheckin, runBatchTokens }
}
