import { checkinLogRepository } from '../repositories/checkin-log-repository'
import { taskLogRepository, type TaskStatus } from '../repositories/task-log-repository'
import { siteRepository } from '../repositories/site-repository'
import { WRANGLER_CHECKIN_CRON, WRANGLER_CLEANUP_CRON } from '../../../shared/generated/wrangler-crons'
import type { ApiSite, Env } from '../types'
import { balanceService } from './balance-service'
import { checkinService } from './checkin-service'
import { settingsService } from './settings-service'
import { tokenService } from './token-service'

const SITE_INTERVAL_MS = 1000
const TASK_INTERVAL_MS = 500

export function getShanghaiDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function recordTask(env: Env, site: ApiSite, logDate: string, taskType: 'checkin' | 'sync_token' | 'query_balance', fn: () => Promise<unknown>): Promise<void> {
  const logs = taskLogRepository(env.DB)
  let status: TaskStatus = 'success'
  let message = '执行成功'
  let error = ''
  try {
    const result = await fn()
    message = typeof result === 'object' ? JSON.stringify(result) : String(result)
  } catch (err) {
    status = 'failed'
    error = err instanceof Error ? err.message : String(err)
    message = '执行失败'
  }
  await logs.insertTask(site.id, logDate, taskType, status, message, error)
}

export async function cleanupOldLogs(env: Env): Promise<{ retention_days: number; deleted_checkin_logs: number; deleted_task_logs: number }> {
  const retentionDays = (await settingsService(env).getRuntimeSettings()).logs.retention_days
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
  const [deletedCheckinLogs, deletedTaskLogs] = await Promise.all([
    checkinLogRepository(env.DB).deleteOlderThan(cutoff),
    taskLogRepository(env.DB).deleteOlderThan(cutoff)
  ])
  return {
    retention_days: retentionDays,
    deleted_checkin_logs: deletedCheckinLogs,
    deleted_task_logs: deletedTaskLogs
  }
}

export async function runCheckinTaskCycle(env: Env, source: 'scheduled' | 'manual' = 'scheduled'): Promise<void> {
  const sites = await siteRepository(env.DB).findEnabled()
  const logDate = getShanghaiDateString(new Date())

  for (let index = 0; index < sites.length; index++) {
    const site = sites[index]

    if (site.auto_checkin) {
      // 签到保持和 Go 版本一致：站点启用 auto_checkin 才执行，之后再串行跑 Token 和余额。
      await recordTask(env, site, logDate, 'checkin', () => checkinService(env).checkin(site.id, source))
      await sleep(TASK_INTERVAL_MS)
    }

    await recordTask(env, site, logDate, 'sync_token', () => tokenService(env).syncTokens(site.id))
    await sleep(TASK_INTERVAL_MS)

    await recordTask(env, site, logDate, 'query_balance', () => balanceService(env).queryUserInfo(site.id))

    if (index < sites.length - 1) await sleep(SITE_INTERVAL_MS)
  }
}

export async function runScheduledEvent(
  env: Env,
  event: {
    cron: string
  }
): Promise<void> {
  const normalized = event.cron.trim().replace(/\s+/g, ' ')

  // Worker 由 Wrangler 管理时，scheduled 事件的 cron 字符串就是配置文件里的真实触发值。
  if (normalized === WRANGLER_CHECKIN_CRON) {
    await runCheckinTaskCycle(env, 'scheduled')
    return
  }

  // 清理任务单独走一条 Trigger，避免把日志维护和签到链路绑在同一个入口里。
  if (normalized === WRANGLER_CLEANUP_CRON) {
    await cleanupOldLogs(env)
  }
}
