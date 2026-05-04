import type { ApiSite, SiteFormPayload } from '../../api/apiSite'
import type { ConfirmAction } from '../../shared/types'
import { ActionConfirmModal, LogoutConfirmModal } from '../../shared/ConfirmModals'
import { DeleteConfirmModal } from './SiteCards'
import { SiteDetailDrawer } from './SiteDetailDrawer'
import { SiteFormModal } from './SiteFormModal'

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
