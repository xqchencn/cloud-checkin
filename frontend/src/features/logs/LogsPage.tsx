import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CalendarCheck, FileText, RotateCcw, Trash2 } from 'lucide-react'
import { ApiCheckinLogs, ApiClearCheckinLogs, ApiClearTaskLogs, ApiTaskLogs, CheckinLog, Paginated, TaskLog } from '../../api/apiSite'
import { CHECKIN_LOG_WITH_SITE_COLUMNS, CHECKIN_LOG_WITH_SITE_HEADERS, TASK_LOG_WITH_SITE_COLUMNS, TASK_LOG_WITH_SITE_HEADERS, buildCheckinLogRows, buildTaskLogRows } from '../../components/logs/LogTables'
import { LogMobileCards } from '../../components/logs/LogCards'
import { SimpleTable } from '../../shared/SimpleTable'
import { ButtonIcon, DialogCard, ModalShell } from '../../shared/ui'
import { useLogPageSize } from '../../shared/useLogPageSize'
import { useToast } from '../../toast'

/**
 * 日志页面组件
 */
export function LogsPage() {
  const { pageSize, listRef, paginationRef } = useLogPageSize()
  const [tab, setTab] = useState<'checkin' | 'task'>('checkin')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [clearTarget, setClearTarget] = useState<'checkin' | 'task' | null>(null)
  const [checkinData, setCheckinData] = useState<Paginated<CheckinLog>>({ logs: [], total: 0, page: 1, page_size: pageSize, total_pages: 0 })
  const [taskData, setTaskData] = useState<Paginated<TaskLog>>({ logs: [], total: 0, page: 1, page_size: pageSize, total_pages: 0 })
  const toast = useToast()

  /**
   * 加载日志
   */
  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize, status: status === 'all' ? undefined : status }
      if (tab === 'checkin') setCheckinData(await ApiCheckinLogs(params))
      else setTaskData(await ApiTaskLogs(params))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '日志加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, status, tab, toast])

  /**
   * 初始化加载日志
   */
  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  /**
   * 页面大小变更时重置页码
   */
  useEffect(() => {
    setPage(1)
  }, [pageSize])

  /**
   * 清空日志
   */
  async function clearLogs() {
    if (!clearTarget) return
    setLoading(true)
    try {
      const result = clearTarget === 'checkin' ? await ApiClearCheckinLogs() : await ApiClearTaskLogs()
      toast.success(result.message || '日志已清空')
      setClearTarget(null)
      setPage(1)
      await loadLogs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '清空日志失败')
    } finally {
      setLoading(false)
    }
  }

  const data = tab === 'checkin' ? checkinData : taskData
  const statusOptions = tab === 'checkin'
    ? [
      ['all', '全部状态'],
      ['success', '成功'],
      ['already_checked_in', '已签到'],
      ['failed', '失败'],
      ['error', '错误']
    ]
    : [
      ['all', '全部状态'],
      ['success', '成功'],
      ['failed', '失败'],
      ['pending', '等待']
    ]
  const rows = tab === 'checkin' ? buildCheckinLogRows(checkinData.logs) : buildTaskLogRows(taskData.logs)
  const headers = tab === 'checkin' ? CHECKIN_LOG_WITH_SITE_HEADERS : TASK_LOG_WITH_SITE_HEADERS
  const columnClassNames = tab === 'checkin' ? CHECKIN_LOG_WITH_SITE_COLUMNS : TASK_LOG_WITH_SITE_COLUMNS

  return (
    <section className="mt-6 space-y-4">
      <div className="soft-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button className={`${tab === 'checkin' ? 'btn btn-primary' : 'btn'} w-full sm:w-auto`} onClick={() => { setTab('checkin'); setStatus('all'); setPage(1) }}>
              <ButtonIcon><CalendarCheck size={16} /></ButtonIcon>签到日志
            </button>
            <button className={`${tab === 'task' ? 'btn btn-primary' : 'btn'} w-full sm:w-auto`} onClick={() => { setTab('task'); setStatus('all'); setPage(1) }}>
              <ButtonIcon><FileText size={16} /></ButtonIcon>定时任务日志
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select className="field w-full sm:w-40" value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}>
              {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button className="btn w-full sm:w-auto" onClick={() => void loadLogs()} disabled={loading}>
              <ButtonIcon><RotateCcw size={16} /></ButtonIcon>{loading ? '刷新中...' : '刷新'}
            </button>
            <button className="btn btn-danger w-full sm:w-auto" onClick={() => setClearTarget(tab)}>
              <ButtonIcon><Trash2 size={16} /></ButtonIcon>{tab === 'checkin' ? '清空签到日志' : '清空定时任务日志'}
            </button>
          </div>
        </div>
      </div>

      <div ref={listRef}>
        <LogMobileCards tab={tab} checkinLogs={checkinData.logs} taskLogs={taskData.logs} />
        <SimpleTable headers={headers} rows={rows} mobile="none" columnClassNames={columnClassNames} />
      </div>
      <div ref={paginationRef} className="flex flex-col gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <span>共 {data.total} 条，每页 {pageSize} 条，当前第 {data.total_pages ? data.page : 0} / {data.total_pages || 0} 页</span>
        <div className="flex gap-2">
          <button className="btn" disabled={loading || page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>上一页</button>
          <button className="btn" disabled={loading || page >= (data.total_pages || 1)} onClick={() => setPage(current => current + 1)}>下一页</button>
        </div>
      </div>

      <ClearLogsModal
        target={clearTarget}
        loading={loading}
        onClose={() => setClearTarget(null)}
        onConfirm={() => void clearLogs()}
      />
    </section>
  )
}

/**
 * 清空日志模态框组件
 * @param target - 清空目标
 * @param loading - 是否正在加载
 * @param onClose - 关闭回调
 * @param onConfirm - 确认回调
 */
function ClearLogsModal({ target, loading, onClose, onConfirm }: {
  target: 'checkin' | 'task' | null
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!target) return null
  const label = target === 'checkin' ? '签到日志' : '定时任务日志'
  return (
    <ModalShell>
      <DialogCard
        title={`清空${label}`}
        description={`此操作会删除全部${label}数据，执行后不可撤销。`}
        icon={<AlertTriangle size={18} />}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose}>取消</button>
            <button className="btn btn-danger" disabled={loading} onClick={onConfirm}>
              <ButtonIcon><Trash2 size={16} /></ButtonIcon>{loading ? '清空中...' : '确认清空'}
            </button>
          </>
        }
      >
        <div className="modal-note-danger">
          请确认你确实要清空{label}。站点配置不会被删除。
        </div>
      </DialogCard>
    </ModalShell>
  )
}
