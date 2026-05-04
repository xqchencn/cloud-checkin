import type { CheckinLog, TaskLog } from '../../api/apiSite'
import { formatCheckinBalance, formatCheckinReward, formatCheckinType, formatDate, formatLogStatus, formatTaskStatus, formatTaskType, logStatusTone, taskStatusTone } from '../../shared/format'
import { JsonMessagePreview } from '../../shared/JsonMessagePreview'
import { ToneBadge } from '../../shared/ui'

/**
 * 日志移动端卡片组件
 * @param tab - 标签页类型
 * @param checkinLogs - 签到日志列表
 * @param taskLogs - 任务日志列表
 * @param showSiteName - 是否显示站点名称
 */
export function LogMobileCards({ tab, checkinLogs, taskLogs, showSiteName = true }: {
  tab: 'checkin' | 'task'
  checkinLogs: CheckinLog[]
  taskLogs: TaskLog[]
  showSiteName?: boolean
}) {
  if (tab === 'checkin') {
    return (
      <div className="grid min-w-0 gap-3 lg:hidden">
        {checkinLogs.map(log => <CheckinLogCard key={log.id} log={log} showSiteName={showSiteName} />)}
      </div>
    )
  }

  return (
    <div className="grid min-w-0 gap-3 lg:hidden">
      {taskLogs.map(log => <TaskLogCard key={log.id} log={log} showSiteName={showSiteName} />)}
    </div>
  )
}

/**
 * 签到日志卡片组件
 * @param log - 签到日志
 * @param showSiteName - 是否显示站点名称
 */
function CheckinLogCard({ log, showSiteName }: { log: CheckinLog; showSiteName: boolean }) {
  const title = showSiteName ? log.site_name || `#${log.api_site_id ?? '-'}` : formatDate(log.checkin_time)
  const subtitle = showSiteName ? formatDate(log.checkin_time) : formatCheckinType(log.checkin_type)

  return (
    <article className="soft-card min-w-0 p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <ToneBadge tone={logStatusTone(log.status)}>{formatLogStatus(log.status)}</ToneBadge>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3">
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">签到类型</dt>
          <dd className="mt-1 truncate text-sm text-slate-800">{formatCheckinType(log.checkin_type)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">余额</dt>
          <dd className="mt-1 truncate text-sm font-semibold text-slate-950">{formatCheckinBalance(log)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">奖励</dt>
          <dd className="mt-1 truncate text-sm text-slate-800">{formatCheckinReward(log)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">耗时 / HTTP</dt>
          <dd className="mt-1 truncate text-sm text-slate-800">{log.response_time || 0}ms / {log.http_status_code || 0}</dd>
        </div>
      </dl>
      <div className="mt-3 min-w-0 text-sm text-slate-600"><JsonMessagePreview message={log.message} error={log.error_details} /></div>
    </article>
  )
}

/**
 * 任务日志卡片组件
 * @param log - 任务日志
 * @param showSiteName - 是否显示站点名称
 */
function TaskLogCard({ log, showSiteName }: { log: TaskLog; showSiteName: boolean }) {
  const title = showSiteName ? log.site_name || `#${log.api_site_id ?? '-'}` : log.log_date
  const subtitle = showSiteName ? log.log_date : formatDate(log.exec_time)

  return (
    <article className="soft-card min-w-0 p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <ToneBadge tone={taskStatusTone(log.status)}>{formatTaskStatus(log.status)}</ToneBadge>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3">
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">定时任务</dt>
          <dd className="mt-1 truncate text-sm text-slate-800">{formatTaskType(log.task_type)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">执行时间</dt>
          <dd className="mt-1 truncate text-sm text-slate-800">{formatDate(log.exec_time)}</dd>
        </div>
      </dl>
      <div className="mt-3 min-w-0 text-sm text-slate-600"><JsonMessagePreview message={log.message} error={log.error} /></div>
    </article>
  )
}
