import { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { CheckCircle2, CircleCheck, Database, Download, KeyRound, Loader2, LogOut, RefreshCcw, Upload } from 'lucide-react'
import { SITE_FILTERS } from '../../shared/constants'
import type { ConfirmAction, SiteFilter } from '../../shared/types'

/**
 * 站点筛选菜单组件
 * @param open - 是否打开
 * @param filter - 当前筛选
 * @param onSelect - 选择回调
 */
export function SiteFilterMenu({ open, filter, onSelect }: {
  open: boolean
  filter: SiteFilter
  onSelect: (value: SiteFilter) => void
}) {
  if (!open) return null
  return (
    <div className="absolute right-0 top-12 z-30 w-40 overflow-hidden rounded-lg border border-line bg-white p-1 shadow-panel" data-filter-menu-root="true">
      {SITE_FILTERS.map(item => (
        <button
          key={item.value}
          type="button"
          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${filter === item.value ? 'bg-brandSoft text-brand' : 'text-slate-600 hover:bg-slate-50'}`}
          onClick={() => onSelect(item.value)}
        >
          {item.label}
          {filter === item.value ? <CircleCheck size={15} /> : null}
        </button>
      ))}
    </div>
  )
}

/**
 * 站点操作菜单组件
 * @param open - 是否打开
 * @param busyKey - 忙碌键
 * @param onBatchAll - 批量全部回调
 * @param onBatchBalance - 批量余额回调
 * @param onBatchCheckin - 批量签到回调
 * @param onBatchTokens - 批量 Token 回调
 * @param onConfirmAction - 确认操作回调
 * @param onExport - 导出回调
 * @param onImport - 导入回调
 * @param onLogout - 登出回调
 */
export function SiteActionMenu({ open, busyKey, onBatchAll, onBatchBalance, onBatchCheckin, onBatchTokens, onConfirmAction, onExport, onImport, onLogout }: {
  open: boolean
  busyKey: string
  onBatchAll: () => void
  onBatchBalance: () => void
  onBatchCheckin: () => void
  onBatchTokens: () => void
  onConfirmAction: (confirm: ConfirmAction) => void
  onExport: () => void
  onImport: (file: File) => void
  onLogout: () => void
}) {
  if (!open) return null
  const importing = busyKey === 'import'
  const actionClass = 'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-brand'

  /**
   * 处理导入按键事件
   * @param event - 键盘事件
   */
  function handleImportKeyDown(event: ReactKeyboardEvent<HTMLLabelElement>) {
    if (importing) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    event.currentTarget.querySelector<HTMLInputElement>('input[type="file"]')?.click()
  }

  return (
    <div className="absolute right-0 top-12 z-30 w-52 overflow-hidden rounded-lg border border-line bg-white p-1 shadow-panel" data-actions-menu-root="true">
      <button
        type="button"
        className={actionClass}
        onClick={() => onConfirmAction({
          title: '批量全部',
          description: '将依次查询余额、签到并同步 Token，可能对多个第三方站点发起请求。',
          confirmLabel: '确认批量执行',
          tone: 'warning',
          run: onBatchAll
        })}
        disabled={Boolean(busyKey)}
      >
        <RefreshCcw size={16} />批量全部
      </button>
      <button
        type="button"
        className={actionClass}
        onClick={() => onConfirmAction({
          title: '批量查询余额',
          description: '将使用已保存认证信息向所有启用站点查询余额。',
          confirmLabel: '确认查询',
          tone: 'warning',
          run: onBatchBalance
        })}
        disabled={Boolean(busyKey)}
      >
        <Database size={16} />批量余额
      </button>
      <button
        type="button"
        className={actionClass}
        onClick={() => onConfirmAction({
          title: '批量签到',
          description: '将使用已保存认证信息向所有启用自动签到的站点发起签到请求。',
          confirmLabel: '确认签到',
          tone: 'warning',
          run: onBatchCheckin
        })}
        disabled={Boolean(busyKey)}
      >
        <CheckCircle2 size={16} />批量签到
      </button>
      <button
        type="button"
        className={actionClass}
        onClick={() => onConfirmAction({
          title: '批量同步 Token',
          description: '将使用已保存认证信息向所有启用站点同步 Token 数据。',
          confirmLabel: '确认同步',
          tone: 'warning',
          run: onBatchTokens
        })}
        disabled={Boolean(busyKey)}
      >
        <KeyRound size={16} />批量 Token
      </button>
      <button type="button" className={actionClass} onClick={onExport} disabled={busyKey === 'export'}>
        <Download size={16} />导出
      </button>
      <label className={`${actionClass} ${importing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`} role="button" tabIndex={0} aria-disabled={importing} onKeyDown={handleImportKeyDown}>
        {importing ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
        {importing ? '导入中...' : '导入'}
        <input className="hidden" type="file" accept=".json,application/json" onChange={event => {
          if (importing) return
          const file = event.target.files?.[0]
          if (file) onImport(file)
          event.currentTarget.value = ''
        }} disabled={importing} />
      </label>
      <button type="button" className={`${actionClass} text-red-600 hover:bg-red-50 hover:text-red-700`} onClick={onLogout}>
        <LogOut size={16} />退出
      </button>
    </div>
  )
}
