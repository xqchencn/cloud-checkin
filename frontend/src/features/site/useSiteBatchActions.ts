import type { Dispatch, SetStateAction } from 'react'
import {
  ApiSite,
  ApiSiteBatchCheckin,
  ApiSiteBatchRefreshBalance,
  ApiSiteBatchSyncTokens,
  BatchOperationResult
} from '../../api/apiSite'
import { useToast } from '../../toast'

function summarizeBatchOperation(title: string, result: BatchOperationResult): string {
  const success = Number(result.success_count ?? result.success ?? 0)
  const failed = Number(result.fail_count ?? result.failed_count ?? result.failed ?? 0)
  const skipped = Number(result.skip_count ?? result.skipped_count ?? result.skipped ?? 0)
  return `${title}完成：成功 ${success}，失败 ${failed}${skipped ? `，跳过 ${skipped}` : ''}`
}

export function useSiteBatchActions({
  sites,
  load,
  setBusyKey,
  setError
}: {
  sites: ApiSite[]
  load: () => Promise<void>
  setBusyKey: Dispatch<SetStateAction<string>>
  setError: Dispatch<SetStateAction<string>>
}) {
  const toast = useToast()

  async function runDirectBatch(
    key: string,
    title: string,
    targets: ApiSite[],
    emptyMessage: string,
    run: (targets: ApiSite[]) => Promise<BatchOperationResult>
  ) {
    if (!targets.length) {
      toast.error(emptyMessage)
      return
    }
    setBusyKey(key)
    setError('')
    try {
      const result = await run(targets)
      toast.success(summarizeBatchOperation(title, result))
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${title}失败`)
    } finally {
      setBusyKey('')
    }
  }

  async function runBatchBalance() {
    const targets = sites.filter(site => site.enabled)
    await runDirectBatch('batch-balance', '批量查询余额', targets, '没有已启用的站点可查询余额', targets => ApiSiteBatchRefreshBalance(targets.map(site => site.id)))
  }

  async function runBatchCheckin() {
    const targets = sites.filter(site => site.enabled && site.auto_checkin)
    await runDirectBatch('batch-checkin', '批量签到', targets, '没有已启用自动签到的站点', targets => ApiSiteBatchCheckin(targets.map(site => site.id)))
  }

  async function runBatchTokens() {
    const targets = sites.filter(site => site.enabled)
    await runDirectBatch('batch-tokens', '批量同步 Token', targets, '没有已启用的站点可同步 Token', targets => ApiSiteBatchSyncTokens(targets.map(site => site.id)))
  }

  async function runBatchAll() {
    const enabledSites = sites.filter(site => site.enabled)
    const checkinSites = sites.filter(site => site.enabled && site.auto_checkin)
    if (!enabledSites.length && !checkinSites.length) {
      toast.error('没有可执行批量操作的站点')
      return
    }
    setBusyKey('batch-all')
    setError('')
    try {
      const balance = await ApiSiteBatchRefreshBalance(enabledSites.map(site => site.id))
      const checkin = await ApiSiteBatchCheckin(checkinSites.map(site => site.id))
      const tokens = await ApiSiteBatchSyncTokens(enabledSites.map(site => site.id))
      toast.success(`批量全部完成：${summarizeBatchOperation('余额', balance)}；${summarizeBatchOperation('签到', checkin)}；${summarizeBatchOperation('Token', tokens)}`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '批量全部失败')
    } finally {
      setBusyKey('')
    }
  }

  return { runBatchAll, runBatchBalance, runBatchCheckin, runBatchTokens }
}
