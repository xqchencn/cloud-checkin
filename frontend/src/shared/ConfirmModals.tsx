
import { AlertTriangle, CheckCircle2, LogOut } from 'lucide-react'
import type { ConfirmAction } from './types'
import { ButtonIcon, DialogCard, ModalShell } from './ui'

/**
 * 退出登录确认模态框组件
 * @param open - 是否打开
 * @param loading - 是否正在加载
 * @param onClose - 关闭回调
 * @param onConfirm - 确认回调
 */
export function LogoutConfirmModal({ open, loading, onClose, onConfirm }: {
  open: boolean
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  return (
    <ModalShell>
      <DialogCard
        title="退出登录"
        description="退出后需要重新输入管理密码。"
        icon={<LogOut size={18} />}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose} disabled={loading}>取消</button>
            <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
              <ButtonIcon><LogOut size={16} /></ButtonIcon>{loading ? '退出中...' : '确认退出'}
            </button>
          </>
        }
      >
        <p className="rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm text-slate-700">当前本地会话将结束。</p>
      </DialogCard>
    </ModalShell>
  )
}

/**
 * 操作确认模态框组件
 * @param action - 确认操作
 * @param onClose - 关闭回调
 * @param onConfirm - 确认回调
 */
export function ActionConfirmModal({ action, onClose, onConfirm }: {
  action: ConfirmAction | null
  onClose: () => void
  onConfirm: () => void
}) {
  if (!action) return null
  const danger = action.tone === 'danger'
  return (
    <ModalShell>
      <DialogCard
        title={action.title}
        description={action.description}
        icon={danger ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose}>取消</button>
            <button className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm}>
              <ButtonIcon>{danger ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}</ButtonIcon>{action.confirmLabel}
            </button>
          </>
        }
      >
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">该操作会使用已保存的站点认证信息向远端站点发起请求，请确认后继续。</p>
      </DialogCard>
    </ModalShell>
  )
}
