import type { ReactNode } from 'react'
import { Copy, Edit3, Eye, MoreHorizontal, Trash2 } from 'lucide-react'
import type { ApiSite } from '../../api/apiSite'
import type { BatchProgress } from '../../shared/types'
import { getCheckinDisplay } from '../../shared/checkin'
import { formatMoney } from '../../shared/format'
import { ButtonIcon, DialogCard, ModalShell, SiteAvatar, StatusBadge, ToneBadge } from '../../shared/ui'

/**
 * 删除确认模态框组件
 * @param site - 站点对象
 * @param deleting - 是否正在删除
 * @param confirmName - 确认名称
 * @param onConfirmNameChange - 名称变更回调
 * @param onClose - 关闭回调
 * @param onConfirm - 确认回调
 */
export function DeleteConfirmModal({ site, deleting, confirmName, onConfirmNameChange, onClose, onConfirm }: {
  site: ApiSite | null
  deleting: boolean
  confirmName: string
  onConfirmNameChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}) {
  if (!site) return null
  const currentSite = site

  /**
   * 复制站点名称
   */
  async function copyName() {
    await navigator.clipboard?.writeText(currentSite.name).catch(() => undefined)
    onConfirmNameChange(currentSite.name)
  }

  return (
    <ModalShell>
      <DialogCard
        title="删除确认"
        description="此操作不可撤销，请输入站点名称以确认删除。"
        icon={<Trash2 size={18} />}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose}>取消</button>
            <button className="btn btn-danger" disabled={deleting || confirmName !== currentSite.name} onClick={onConfirm}>
              <ButtonIcon><Trash2 size={16} /></ButtonIcon>{deleting ? '删除中...' : '确定删除'}
            </button>
          </>
        }
      >
        <button
          type="button"
          className="mt-5 flex w-full items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-left font-mono text-sm font-semibold text-red-700 hover:border-red-200 hover:bg-red-100"
          onClick={() => void copyName()}
        >
          <span className="truncate">{currentSite.name}</span>
          <span className="ml-3 inline-flex items-center gap-1 text-xs font-medium text-red-500"><Copy size={13} />点击复制</span>
        </button>
        <label className="label mt-5">请输入站点名称</label>
        <input
          className="field"
          value={confirmName}
          onChange={event => onConfirmNameChange(event.target.value)}
          autoFocus
          onKeyDown={event => {
            if (event.key === 'Enter' && confirmName === currentSite.name) onConfirm()
          }}
        />
      </DialogCard>
    </ModalShell>
  )
}

/**
 * 站点移动端卡片组件
 * @param site - 站点对象
 * @param onDetail - 详情回调
 * @param onEdit - 编辑回调
 * @param onDelete - 删除回调
 */
export function SiteMobileCard({ site, onDetail, onEdit, onDelete }: {
  site: ApiSite
  onDetail: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const checkin = getCheckinDisplay(site)
  return (
    <article className="soft-card p-4">
      <div className="grid grid-cols-[auto,minmax(0,1fr),auto] items-center gap-3">
        <SiteAvatar site={site} />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-slate-950">{site.name}</h3>
          <p className="mt-1 truncate text-sm text-slate-500">{site.url}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">{site.api_type}</span>
            <StatusBadge enabled={site.enabled}>{site.enabled ? '启用' : '未启用'}</StatusBadge>
          </div>
        </div>
        <button className="btn-icon h-10 w-10 border-transparent bg-slate-50 shadow-none" onClick={onDetail} aria-label="详情">
          <MoreHorizontal size={20} />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-[1fr,auto] items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ToneBadge tone={checkin.tone}>{checkin.text}</ToneBadge>
          </div>
          <p className="mt-1 text-sm text-slate-500">{checkin.hint}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-slate-950">{formatMoney(site.site_quota)}</p>
          <p className="mt-1 text-sm text-slate-500">已用 {formatMoney(site.site_used_quota)}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
        <button className="btn h-9" onClick={onDetail}><ButtonIcon><Eye size={16} /></ButtonIcon>详情</button>
        <button className="btn h-9" onClick={onEdit}><ButtonIcon><Edit3 size={16} /></ButtonIcon>编辑</button>
        <button className="btn btn-danger h-9" onClick={onDelete}><ButtonIcon><Trash2 size={16} /></ButtonIcon>删除</button>
      </div>
    </article>
  )
}

/**
 * 批量操作进度面板组件
 * @param progress - 批量操作进度
 */
export function BatchProgressPanel({ progress }: { progress: BatchProgress }) {
  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  return (
    <section className="mt-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-950">{progress.title}</p>
          <p className="mt-1 text-sm text-blue-800">
            {progress.phase}{progress.currentName ? `：${progress.currentName}` : ''} ({progress.current}/{progress.total})
          </p>
        </div>
        <p className="text-xs text-blue-700">
          成功 {progress.success} / 失败 {progress.failed}{progress.skipped ? ` / 跳过 ${progress.skipped}` : ''}
        </p>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-white"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
      </div>
    </section>
  )
}

/**
 * 统计卡片组件
 * @param label - 标签
 * @param value - 值
 * @param hint - 提示
 * @param tone - 颜色主题
 * @param hintTone - 提示颜色主题
 * @param icon - 图标
 */
export function StatCard({ label, value, hint, tone, hintTone = 'default', icon }: {
  label: string
  value: number | string
  hint: string
  tone: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  hintTone?: 'default' | 'success' | 'accent'
  icon: ReactNode
}) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-violet-50 text-violet-600',
    orange: 'bg-orange-50 text-orange-500',
    red: 'bg-red-50 text-red-500'
  }
  const hintClasses = {
    default: 'text-slate-500',
    success: 'text-emerald-600',
    accent: 'text-violet-600'
  }
  return (
    <div className="soft-card min-w-0 p-3 sm:p-5">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 ${toneClasses[tone]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold leading-tight text-slate-950 tabular-nums sm:text-2xl">{value}</p>
          <p className={`mt-2 truncate text-xs sm:text-sm ${hintClasses[hintTone]}`}>{hint}</p>
        </div>
      </div>
    </div>
  )
}
