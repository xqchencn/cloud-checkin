import { checkinLogRepository } from '../repositories/checkin-log-repository'
import { taskLogRepository, type TaskStatus } from '../repositories/task-log-repository'
import { siteRepository } from '../repositories/site-repository'
import { settingsRepository } from '../repositories/settings-repository'
import { WRANGLER_CHECKIN_CRON, WRANGLER_CLEANUP_CRON, WRANGLER_HF_KEEPALIVE_CRON } from '../../../shared/generated/wrangler-crons'
import type { ApiSite, Env } from '../types'
import { balanceService } from './balance-service'
import { checkinService } from './checkin-service'
import { hfSpaceService } from './hf-space-service'
import { settingsService } from './settings-service'
import { tokenService } from './token-service'

/** 站点间隔毫秒数 */
const SITE_INTERVAL_MS = 1000
/** 任务间隔毫秒数 */
const TASK_INTERVAL_MS = 500
/** Free 计划下每次 Cron 最多处理的站点数 */
export const CHECKIN_TASK_BATCH_SIZE = 3
/** 失败站点每日最大重试次数 */
export const CHECKIN_RETRY_LIMIT = 3
/** 中国时间每日签到任务开始小时 */
const CHECKIN_START_HOUR = 8
/** 中国时间每日签到任务开始分钟 */
const CHECKIN_START_MINUTE = 30
/** 每日签到调度状态设置键 */
const CHECKIN_DAILY_STATE_KEY = 'scheduler.checkin_daily_state'

type CheckinSchedulePhase = 'primary' | 'retry' | 'complete'

export interface DailyCheckinState {
  date: string
  phase: CheckinSchedulePhase
  cursor: number
  failedSiteIds: number[]
  retryAttempts: Record<string, number>
}

export interface DailyCheckinBatch {
  phase: CheckinSchedulePhase
  siteIds: number[]
  state: DailyCheckinState
}

/**
 * 获取上海日期字符串
 * @param date - 日期对象
 * @returns 上海日期字符串
 */
export function getShanghaiDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

/**
 * 获取上海时间时分
 * @param date - 日期对象
 * @returns 时分
 */
function getShanghaiHourMinute(date: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  return {
    hour: Number(parts.find(part => part.type === 'hour')?.value ?? 0),
    minute: Number(parts.find(part => part.type === 'minute')?.value ?? 0)
  }
}

/**
 * 判断签到执行窗口是否已打开
 * @param date - 日期对象
 * @returns 是否已到中国时间 08:30
 */
export function isCheckinWindowOpen(date: Date = new Date()): boolean {
  const { hour, minute } = getShanghaiHourMinute(date)
  return hour > CHECKIN_START_HOUR || (hour === CHECKIN_START_HOUR && minute >= CHECKIN_START_MINUTE)
}

/**
 * 创建每日签到状态
 * @param date - 上海日期字符串
 * @returns 每日签到状态
 */
export function createDailyCheckinState(date: string): DailyCheckinState {
  return {
    date,
    phase: 'primary',
    cursor: 0,
    failedSiteIds: [],
    retryAttempts: {}
  }
}

/**
 * 去重并过滤站点 ID
 * @param siteIds - 站点 ID 列表
 * @returns 规范化站点 ID 列表
 */
function normalizeSiteIds(siteIds: number[]): number[] {
  return Array.from(new Set(siteIds.map(id => Number(id)).filter(id => Number.isFinite(id) && id > 0)))
}

/**
 * 克隆每日签到状态
 * @param state - 状态
 * @returns 克隆后的状态
 */
function cloneDailyCheckinState(state: DailyCheckinState): DailyCheckinState {
  return {
    date: state.date,
    phase: state.phase,
    cursor: Math.max(0, Math.floor(Number(state.cursor || 0))),
    failedSiteIds: normalizeSiteIds(state.failedSiteIds),
    retryAttempts: Object.fromEntries(Object.entries(state.retryAttempts || {}).map(([key, value]) => [key, Math.max(0, Math.floor(Number(value || 0)))]))
  }
}

/**
 * 完成每日签到状态
 * @param state - 当前状态
 * @returns 完成状态
 */
function completeDailyCheckinState(state: DailyCheckinState): DailyCheckinState {
  return {
    ...cloneDailyCheckinState(state),
    phase: 'complete',
    cursor: 0,
    failedSiteIds: [],
    retryAttempts: {}
  }
}

/**
 * 选择本次 Cron 要处理的站点批次
 * @param state - 当前每日状态
 * @param allSiteIds - 当天候选站点 ID
 * @returns 本次批次
 */
export function selectCheckinBatch(state: DailyCheckinState, allSiteIds: number[]): DailyCheckinBatch {
  const ids = normalizeSiteIds(allSiteIds)
  const activeIds = new Set(ids)
  const current = cloneDailyCheckinState(state)
  current.failedSiteIds = current.failedSiteIds.filter(id => activeIds.has(id))

  if (!ids.length || current.phase === 'complete') {
    const complete = completeDailyCheckinState(current)
    return { phase: complete.phase, siteIds: [], state: complete }
  }

  if (current.phase === 'primary') {
    const cursor = Math.min(current.cursor, ids.length)
    if (cursor < ids.length) {
      current.cursor = cursor
      return {
        phase: 'primary',
        siteIds: ids.slice(cursor, cursor + CHECKIN_TASK_BATCH_SIZE),
        state: current
      }
    }
    if (!current.failedSiteIds.length) {
      const complete = completeDailyCheckinState(current)
      return { phase: complete.phase, siteIds: [], state: complete }
    }
    current.phase = 'retry'
    current.cursor = 0
  }

  if (current.phase === 'retry') {
    if (!current.failedSiteIds.length) {
      const complete = completeDailyCheckinState(current)
      return { phase: complete.phase, siteIds: [], state: complete }
    }
    return {
      phase: 'retry',
      siteIds: current.failedSiteIds.slice(0, CHECKIN_TASK_BATCH_SIZE),
      state: current
    }
  }

  const complete = completeDailyCheckinState(current)
  return { phase: complete.phase, siteIds: [], state: complete }
}

/**
 * 应用本次批次执行结果
 * @param state - 批次开始状态
 * @param result - 批次结果
 * @returns 更新后的每日状态
 */
export function applyCheckinBatchResult(
  state: DailyCheckinState,
  result: { allSiteIds: number[]; processedSiteIds: number[]; failedSiteIds: number[] }
): DailyCheckinState {
  const current = cloneDailyCheckinState(state)
  const allSiteIds = normalizeSiteIds(result.allSiteIds)
  const processedSiteIds = normalizeSiteIds(result.processedSiteIds)
  const failedSiteIds = normalizeSiteIds(result.failedSiteIds)

  if (!allSiteIds.length || current.phase === 'complete') return completeDailyCheckinState(current)

  if (current.phase === 'primary') {
    const failed = normalizeSiteIds([...current.failedSiteIds, ...failedSiteIds])
    const nextCursor = Math.min(allSiteIds.length, current.cursor + processedSiteIds.length)
    const next: DailyCheckinState = {
      ...current,
      cursor: nextCursor,
      failedSiteIds: failed
    }
    if (nextCursor < allSiteIds.length) return next
    if (failed.length) return { ...next, phase: 'retry', cursor: 0 }
    return completeDailyCheckinState(next)
  }

  if (current.phase === 'retry') {
    const processed = new Set(processedSiteIds)
    const failed = new Set(failedSiteIds)
    const retryAttempts = { ...current.retryAttempts }
    const nextQueue = current.failedSiteIds.filter(id => !processed.has(id))

    for (const siteId of processedSiteIds) {
      if (!failed.has(siteId)) {
        delete retryAttempts[String(siteId)]
        continue
      }
      const attempts = (retryAttempts[String(siteId)] ?? 0) + 1
      retryAttempts[String(siteId)] = attempts
      if (attempts < CHECKIN_RETRY_LIMIT && !nextQueue.includes(siteId)) {
        nextQueue.push(siteId)
      }
    }

    const next: DailyCheckinState = {
      ...current,
      cursor: 0,
      failedSiteIds: normalizeSiteIds(nextQueue),
      retryAttempts
    }
    return next.failedSiteIds.length ? next : completeDailyCheckinState(next)
  }

  return completeDailyCheckinState(current)
}

/**
 * 解析每日签到状态
 * @param value - 原始设置值
 * @param date - 上海日期字符串
 * @returns 每日签到状态
 */
function parseDailyCheckinState(value: string | undefined, date: string): DailyCheckinState {
  if (!value) return createDailyCheckinState(date)
  try {
    const parsed = JSON.parse(value) as Partial<DailyCheckinState>
    if (parsed.date !== date) return createDailyCheckinState(date)
    if (!['primary', 'retry', 'complete'].includes(String(parsed.phase))) return createDailyCheckinState(date)
    return cloneDailyCheckinState({
      date,
      phase: parsed.phase as CheckinSchedulePhase,
      cursor: Number(parsed.cursor ?? 0),
      failedSiteIds: Array.isArray(parsed.failedSiteIds) ? parsed.failedSiteIds.map(Number) : [],
      retryAttempts: parsed.retryAttempts && typeof parsed.retryAttempts === 'object' ? parsed.retryAttempts as Record<string, number> : {}
    })
  } catch {
    return createDailyCheckinState(date)
  }
}

/**
 * 延迟函数
 * @param ms - 毫秒数
 * @returns Promise<void>
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 记录任务
 * @param env - 环境变量
 * @param site - 站点信息
 * @param logDate - 日志日期
 * @param taskType - 任务类型
 * @param fn - 任务函数
 */
async function recordTask(env: Env, site: ApiSite, logDate: string, taskType: 'checkin' | 'sync_token' | 'query_balance', fn: () => Promise<unknown>): Promise<TaskStatus> {
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
  return status
}

/**
 * 清理旧日志
 * @param env - 环境变量
 * @returns Promise<CleanupResult> - 清理结果
 */
export async function cleanupOldLogs(env: Env): Promise<{ retention_days: number; deleted_checkin_logs: number; deleted_task_logs: number; deleted_hf_space_keepalive_logs: number }> {
  const retentionDays = (await settingsService(env).getRuntimeSettings()).logs.retention_days
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
  const [deletedCheckinLogs, deletedTaskLogs, deletedHfSpaceKeepaliveLogs] = await Promise.all([
    checkinLogRepository(env.DB).deleteOlderThan(cutoff),
    taskLogRepository(env.DB).deleteOlderThan(cutoff),
    hfSpaceService(env).deleteOlderHfSpaceKeepaliveLogs(cutoff)
  ])
  return {
    retention_days: retentionDays,
    deleted_checkin_logs: deletedCheckinLogs,
    deleted_task_logs: deletedTaskLogs,
    deleted_hf_space_keepalive_logs: deletedHfSpaceKeepaliveLogs
  }
}

/**
 * 运行签到任务周期
 * @param env - 环境变量
 * @param source - 任务来源
 */
export async function runCheckinTaskCycle(env: Env, source: 'scheduled' | 'manual' = 'scheduled'): Promise<void> {
  const now = new Date()
  if (source === 'scheduled' && !isCheckinWindowOpen(now)) return

  const sites = await siteRepository(env.DB).findEnabled()
  const logDate = getShanghaiDateString(now)
  const settings = settingsRepository(env.DB)
  const values = await settings.getMany([CHECKIN_DAILY_STATE_KEY])
  const state = parseDailyCheckinState(values[CHECKIN_DAILY_STATE_KEY], logDate)
  const batch = selectCheckinBatch(state, sites.map(site => site.id))

  if (!batch.siteIds.length) {
    if (JSON.stringify(batch.state) !== JSON.stringify(state)) {
      await settings.setInternal(CHECKIN_DAILY_STATE_KEY, JSON.stringify(batch.state))
    }
    return
  }

  const siteById = new Map(sites.map(site => [site.id, site]))
  const failedSiteIds: number[] = []

  for (let index = 0; index < batch.siteIds.length; index++) {
    const site = siteById.get(batch.siteIds[index])
    if (!site) continue
    let siteFailed = false

    const markFailed = (status: TaskStatus) => {
      if (status === 'failed') siteFailed = true
    }

    if (site.auto_checkin) {
      // 站点启用 auto_checkin 才执行签到，之后再串行跑 Token 和余额。
      markFailed(await recordTask(env, site, logDate, 'checkin', () => checkinService(env).checkin(site.id, source)))
      await sleep(TASK_INTERVAL_MS)
    }

    markFailed(await recordTask(env, site, logDate, 'sync_token', () => tokenService(env).syncTokens(site.id)))
    await sleep(TASK_INTERVAL_MS)

    markFailed(await recordTask(env, site, logDate, 'query_balance', () => balanceService(env).queryUserInfo(site.id)))

    if (siteFailed) failedSiteIds.push(site.id)

    if (index < batch.siteIds.length - 1) await sleep(SITE_INTERVAL_MS)
  }

  await settings.setInternal(CHECKIN_DAILY_STATE_KEY, JSON.stringify(applyCheckinBatchResult(batch.state, {
    allSiteIds: sites.map(site => site.id),
    processedSiteIds: batch.siteIds,
    failedSiteIds
  })))
}

export async function runHfSpaceKeepaliveCycle(env: Env): Promise<{ total: number }> {
  return hfSpaceService(env).pingEnabledTargets()
}

/**
 * 运行定时任务
 * @param env - 环境变量
 * @param event - 定时任务事件
 */
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

  if (normalized === WRANGLER_HF_KEEPALIVE_CRON) {
    await runHfSpaceKeepaliveCycle(env)
    return
  }

  // 清理任务单独走一条 Trigger，避免把日志维护和签到链路绑在同一个入口里。
  if (normalized === WRANGLER_CLEANUP_CRON) {
    await cleanupOldLogs(env)
  }
}
