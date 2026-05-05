import type { HfSpaceKeepaliveLog } from '../../api/apiHfSpaces'
import { formatDate, logStatusTone } from '../../shared/format'
import { SimpleTable } from '../../shared/SimpleTable'
import { ToneBadge } from '../../shared/ui'

export function HfSpaceLogsTable({ logs, statusFilter, onStatusFilterChange }: {
  logs: HfSpaceKeepaliveLog[]
  statusFilter: string
  onStatusFilterChange: (value: string) => void
}) {
  const rows = logs.map(log => [
    log.username || '-',
    log.space_id,
    <ToneBadge tone={logStatusTone(log.status)}>{log.status === 'success' ? '成功' : '失败'}</ToneBadge>,
    log.http_status ?? '-',
    log.latency_ms == null ? '-' : `${log.latency_ms}ms`,
    formatDate(log.created_at),
    log.error || log.response_excerpt || '-'
  ])

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">保活日志</h2>
          <p className="mt-1 text-sm text-slate-500">按时间倒序展示最近请求结果</p>
        </div>
        <select className="field w-full sm:w-40" value={statusFilter} onChange={event => onStatusFilterChange(event.target.value)}>
          <option value="all">全部状态</option>
          <option value="success">成功</option>
          <option value="failed">失败</option>
        </select>
      </div>
      <SimpleTable
        headers={['用户', 'Space', '状态', 'HTTP', '耗时', '时间', '消息']}
        rows={rows}
        columnClassNames={['w-[12%]', 'w-[20%]', 'w-[10%]', 'w-[8%]', 'w-[10%]', 'w-[18%]', 'w-[22%]']}
      />
    </section>
  )
}
