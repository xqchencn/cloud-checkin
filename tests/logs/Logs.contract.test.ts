import { describe, expect, it } from 'vitest'
import {
  apiSiteSource,
  appSource,
  checkinLogRepositorySource,
  logTableSource,
  mainSource,
  schedulerServiceSource,
  taskLogRepositorySource,
  toastSource
} from '../sources'

/**
 * 日志和通知合约测试
 * 验证日志和通知功能的一致性和正确性
 */
describe('Log and notification contracts', () => {
  it('labels scheduled task logs separately from existing manual actions and keeps task logs paginated', () => {
    expect(appSource).toContain('定时任务日志')
    expect(appSource).not.toContain('执行定时任务')
    expect(appSource).not.toContain('RunTasksNow')
    expect(apiSiteSource).not.toContain('/api/tasks/run-now')
    expect(appSource).toContain('buildTaskLogRows(taskData.logs)')
    expect(logTableSource).toContain('export function buildTaskLogRows')
    expect(logTableSource).toContain('return logs.map(log => [')
    expect(appSource).toContain('ApiTaskLogs(params)')
    expect(appSource).toContain('共 {data.total} 条，每页 {pageSize} 条')
    expect(appSource).not.toContain("useState<{ tab: 'checkin' | 'task'; text: string } | null>(null)")
    expect(appSource).not.toContain('message?.tab === tab')
  })

  it('uses global toast notifications instead of page-scoped success banners', () => {
    expect(toastSource).toContain('export function ToastProvider')
    expect(toastSource).toContain('export function useToast')
    expect(toastSource).toContain('window.setTimeout')
    expect(toastSource).toContain('fixed right-4 top-4')
    expect(mainSource).toContain('<ToastProvider>')
    expect(appSource).toContain('const toast = useToast()')
    expect(appSource).not.toContain('border border-emerald-100 bg-emerald-50')
  })

  it('renders long and JSON log messages as readable summaries without dumping raw dictionaries by default', () => {
    expect(appSource).toContain('JsonMessagePreview')
    expect(appSource).toContain('formatStructuredMessage(raw)')
    expect(appSource).toContain('summary className="flex min-w-0 cursor-pointer list-none items-center gap-1')
    expect(appSource).toContain('inline-flex h-4')
    expect(appSource).toContain('>JSON</span>')
    expect(appSource).not.toContain('查看原始 JSON')
    expect(appSource).toContain("if (typeof value === 'object') return '已返回数据'")
    expect(appSource).toContain('formatCheckinType(log.checkin_type)')
    expect(appSource).toContain('formatLogStatus(log.status)')
    expect(appSource).toContain('soft-card min-w-0 p-4')
    expect(appSource).toContain('truncate')
    expect(appSource).not.toContain('line-clamp-1')
    expect(appSource).toContain('whitespace-pre-wrap break-words')
    expect(appSource).toContain('JSON.stringify(parsed, null, 2)')
    expect(appSource).toContain('<pre')
    expect(schedulerServiceSource).not.toContain('JSON.stringify(result).slice(0, 500)')
  })

  it('orders checkin and scheduled task logs newest first with deterministic ties', () => {
    expect(checkinLogRepositorySource).toContain('ORDER BY datetime(l.checkin_time) DESC, l.id DESC')
    expect(taskLogRepositorySource).toContain('ORDER BY datetime(exec_time) DESC, id DESC')
  })

  it('uses the latest task-log row for today status per site', () => {
    expect(taskLogRepositorySource).toContain('WITH latest_task_logs AS')
    expect(taskLogRepositorySource).toContain('ROW_NUMBER() OVER (PARTITION BY api_site_id')
    expect(taskLogRepositorySource).toContain('ORDER BY datetime(updated_at) DESC, id DESC')
    expect(taskLogRepositorySource).toContain('AND l.row_number = 1')
  })
})
