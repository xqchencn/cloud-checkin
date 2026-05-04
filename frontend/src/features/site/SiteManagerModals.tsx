import type { ApiSite, SiteFormPayload } from '../../api/apiSite'
import type { ConfirmAction } from '../../shared/types'
import { ActionConfirmModal, LogoutConfirmModal } from '../../shared/ConfirmModals'
import { DeleteConfirmModal } from './SiteCards'
import { SiteDetailDrawer } from './SiteDetailDrawer'
import { SiteFormModal } from './SiteFormModal'

/**
 * 站点管理模态框组件
 * @param editingSite - 正在编辑的站点
 * @param formOpen - 表单是否打开
 * @param saving - 是否正在保存
 * @param detailSite - 详情站点
 * @param busyKey - 忙碌键
 * @param deleteSite - 要删除的站点
 * @param deleting - 是否正在删除
 * @param deleteConfirmName - 删除确认名称
 * @param logoutConfirmOpen - 登出确认是否打开
 * @param logoutSubmitting - 登出提交中
 * @param confirmAction - 确认操作
 * @param onCloseForm - 关闭表单回调
 * @param onSaveSite - 保存站点回调
 * @param onCloseDetail - 关闭详情回调
 * @param onDetailAction - 详情操作回调
 * @param onDeleteConfirmNameChange - 删除确认名称变更回调
 * @param onCloseDelete - 关闭删除确认回调
 * @param onConfirmDelete - 确认删除回调
 * @param onCloseLogout - 关闭登出确认回调
 * @param onConfirmLogout - 确认登出回调
 * @param onCloseConfirmAction - 关闭确认操作回调
 * @param onConfirmPendingAction - 确认待处理操作回调
 */
export function SiteManagerModals({
  editingSite,
  formOpen,
  saving,
  detailSite,
  busyKey,
  deleteSite,
  deleting,
  deleteConfirmName,
  logoutConfirmOpen,
  logoutSubmitting,
  confirmAction,
  onCloseForm,
  onSaveSite,
  onCloseDetail,
  onDetailAction,
  onDeleteConfirmNameChange,
  onCloseDelete,
  onConfirmDelete,
  onCloseLogout,
  onConfirmLogout,
  onCloseConfirmAction,
  onConfirmPendingAction
}: {
  editingSite: ApiSite | null
  formOpen: boolean
  saving: boolean
  detailSite: ApiSite | null
  busyKey: string
  deleteSite: ApiSite | null
  deleting: boolean
  deleteConfirmName: string
  logoutConfirmOpen: boolean
  logoutSubmitting: boolean
  confirmAction: ConfirmAction | null
  onCloseForm: () => void
  onSaveSite: (payload: SiteFormPayload) => Promise<void>
  onCloseDetail: () => void
  onDetailAction: (key: string, fn: () => Promise<unknown>, okMessage: string) => Promise<void>
  onDeleteConfirmNameChange: (value: string) => void
  onCloseDelete: () => void
  onConfirmDelete: () => void
  onCloseLogout: () => void
  onConfirmLogout: () => void
  onCloseConfirmAction: () => void
  onConfirmPendingAction: () => void
}) {
  return (
    <>
      <SiteFormModal site={editingSite} open={formOpen} saving={saving} onClose={onCloseForm} onSaved={onSaveSite} />
      <SiteDetailDrawer site={detailSite} open={Boolean(detailSite)} busyKey={busyKey} onClose={onCloseDetail} onAction={onDetailAction} />
      <DeleteConfirmModal
        site={deleteSite}
        deleting={deleting}
        confirmName={deleteConfirmName}
        onConfirmNameChange={onDeleteConfirmNameChange}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
      />
      <LogoutConfirmModal open={logoutConfirmOpen} loading={logoutSubmitting} onClose={onCloseLogout} onConfirm={onConfirmLogout} />
      <ActionConfirmModal action={confirmAction} onClose={onCloseConfirmAction} onConfirm={onConfirmPendingAction} />
    </>
  )
}
