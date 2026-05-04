import type { ReactNode } from 'react'
import type { CheckinLog, TaskLog } from '../../api/apiSite'
import { formatCheckinBalance, formatCheckinReward, formatCheckinType, formatDate, formatLogStatus, formatTaskStatus, formatTaskType, logStatusTone, taskStatusTone } from '../../shared/format'
import { JsonMessagePreview } from '../../shared/JsonMessagePreview'
import { ToneBadge } from '../../shared/ui'

/**
 * 签到日志表格列头
 */
export const CHECKIN_LOG_HEADERS = ['时间', '类型', '状态', '奖励', '新余额', 'HTTP', '耗时', '消息']

/**
 * 带站点名称的签到日志表格列头
 */
export const CHECKIN_LOG_WITH_SITE_HEADERS = ['站点', ...CHECKIN_LOG_HEADERS]

/**
 * 任务日志表格列头
 */
export const TASK_LOG_HEADERS = ['日期', '定时任务', '状态', '执行时间', '消息']

/**
 * 带站点名称的任务日志表格列头
 */
export const TASK_LOG_WITH_SITE_HEADERS = ['站点', ...TASK_LOG_HEADERS]

/**
 * 签到日志表格列宽度配置
 */
export const CHECKIN_LOG_COLUMNS = ['w-[18%]', 'w-[10%]', 'w-[8%]', 'w-[8%]', 'w-[10%]', 'w-[7%]', 'w-[7%]', 'w-[32%]']

/**
 * 带站点名称的签到日志表格列宽度配置
 */
export const CHECKIN_LOG_WITH_SITE_COLUMNS = ['w-[14%]', 'w-[15%]', 'w-[10%]', 'w-[8%]', 'w-[8%]', 'w-[10%]', 'w-[7%]', 'w-[7%]', 'w-[21%]']

/**
 * 任务日志表格列宽度配置
 */
export const TASK_LOG_COLUMNS = ['w-[16%]', 'w-[14%]', 'w-[8%]', 'w-[20%]', 'w-[42%]']

/**
 * 带站点名称的任务日志表格列宽度配置
 */
export const TASK_LOG_WITH_SITE_COLUMNS = ['w-[18%]', 'w-[13%]', 'w-[12%]', 'w-[10%]', 'w-[17%]', 'w-[30%]']

/**
 * 获取日志的站点名称
 * @param log - 签到或任务日志对象
 * @returns 站点名称或站点ID
 */
function siteName(log: Pick<CheckinLog | TaskLog, 'site_name' | 'api_site_id'>): string {
  return log.site_name || `#${log.api_site_id ?? '-'}`
}

/**
 * 构建签到日志表格行数据
 * @param logs - 签到日志列表
 * @param showSiteName - 是否显示站点名称
 * @returns 表格行数据数组
 */
export function buildCheckinLogRows(logs: CheckinLog[], showSiteName = true): ReactNode[][] {
  return logs.map(log => [
    ...(showSiteName ? [siteName(log)] : []),
    formatDate(log.checkin_time),
    formatCheckinType(log.checkin_type),
    <ToneBadge tone={logStatusTone(log.status)}>{formatLogStatus(log.status)}</ToneBadge>,
    formatCheckinReward(log),
    formatCheckinBalance(log),
    String(log.http_status_code || 0),
    `${log.response_time || 0}ms`,
    <JsonMessagePreview message={log.message} error={log.error_details} />
  ])
}

/**
 * 构建任务日志表格行数据
 * @param logs - 任务日志列表
 * @param showSiteName - 是否显示站点名称
 * @returns 表格行数据数组
 */
export function buildTaskLogRows(logs: TaskLog[], showSiteName = true): ReactNode[][] {
  return logs.map(log => [
    ...(showSiteName ? [siteName(log)] : []),
    log.log_date,
    formatTaskType(log.task_type),
    <ToneBadge tone={taskStatusTone(log.status)}>{formatTaskStatus(log.status)}</ToneBadge>,
    formatDate(log.exec_time),
    <JsonMessagePreview message={log.message} error={log.error} />
  ])
}
