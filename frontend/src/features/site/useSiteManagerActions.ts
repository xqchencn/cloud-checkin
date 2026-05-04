import type { Dispatch, SetStateAction } from 'react'
import { ApiSite, ApiSiteCreate, ApiSiteDelete, ApiSiteExport, ApiSiteImport, ApiSiteUpdate, SiteFormPayload } from '../../api/apiSite'
import { PAGE_PATHS } from '../../shared/constants'
import type { ConfirmAction, PageKey } from '../../shared/types'
import { useToast } from '../../toast'

export function useSiteManagerActions({
  load,
  onLogout,
  editingSite,
  deleteSite,
  deleteConfirmName,
  confirmAction,
  setActivePage,
  setActionsOpen,
  setBusyKey,
  setConfirmAction,
  setDeleteConfirmName,
  setDeleteSite,
  setDeleting,
  setEditingSite,
  setError,
  setFilterOpen,
  setFormOpen,
  setLogoutConfirmOpen,
  setLogoutSubmitting,
  setSaving
}: {
  load: () => Promise<void>
  onLogout: () => void
  editingSite: ApiSite | null
  deleteSite: ApiSite | null
  deleteConfirmName: string
  confirmAction: ConfirmAction | null
  setActivePage: Dispatch<SetStateAction<PageKey>>
  setActionsOpen: Dispatch<SetStateAction<boolean>>
  setBusyKey: Dispatch<SetStateAction<string>>
  setConfirmAction: Dispatch<SetStateAction<ConfirmAction | null>>
  setDeleteConfirmName: Dispatch<SetStateAction<string>>
  setDeleteSite: Dispatch<SetStateAction<ApiSite | null>>
  setDeleting: Dispatch<SetStateAction<boolean>>
  setEditingSite: Dispatch<SetStateAction<ApiSite | null>>
  setError: Dispatch<SetStateAction<string>>
  setFilterOpen: Dispatch<SetStateAction<boolean>>
  setFormOpen: Dispatch<SetStateAction<boolean>>
  setLogoutConfirmOpen: Dispatch<SetStateAction<boolean>>
  setLogoutSubmitting: Dispatch<SetStateAction<boolean>>
  setSaving: Dispatch<SetStateAction<boolean>>
}) {
  const toast = useToast()

  async function action(key: string, fn: () => Promise<unknown>, okMessage: string) {
    setBusyKey(key)
    setError('')
    try {
      const result = await fn()
      toast.success(typeof result === 'string' ? result : okMessage)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败')
    } finally {
      setBusyKey('')
    }
  }

  function closeMenus() {
    setActionsOpen(false)
    setFilterOpen(false)
  }

  function openCreate() {
    setEditingSite(null)
    setFormOpen(true)
  }

  function openEdit(site: ApiSite) {
    setEditingSite(site)
    setFormOpen(true)
  }

  function openDelete(site: ApiSite) {
    setDeleteSite(site)
    setDeleteConfirmName('')
  }

  async function confirmDelete() {
    if (!deleteSite || deleteConfirmName !== deleteSite.name) return
    setDeleting(true)
    setBusyKey(`delete-${deleteSite.id}`)
    setError('')
    try {
      await ApiSiteDelete(deleteSite.id)
      toast.success('站点删除成功')
      setDeleteSite(null)
      setDeleteConfirmName('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeleting(false)
      setBusyKey('')
    }
  }

  async function saveSite(payload: SiteFormPayload) {
    setSaving(true)
    setError('')
    try {
      if (editingSite) await ApiSiteUpdate(editingSite.id, payload)
      else await ApiSiteCreate(payload)
      setFormOpen(false)
      toast.success('保存成功')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function exportSites() {
    const text = await ApiSiteExport()
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cloud-checkin-sites-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('导出文件已生成')
  }

  async function importSites(file: File): Promise<string> {
    const text = await file.text()
    const result = await ApiSiteImport(text)
    return `导入完成：成功 ${result.success_count}，跳过 ${result.skip_count}，失败 ${result.fail_count}`
  }

  function navigatePage(page: PageKey) {
    closeMenus()
    setActivePage(page)
    const nextPath = PAGE_PATHS[page]
    if (window.location.pathname !== nextPath) window.history.pushState({ page }, '', nextPath)
  }

  function requestLogout() {
    closeMenus()
    setLogoutConfirmOpen(true)
  }

  function requestConfirmAction(confirm: ConfirmAction) {
    closeMenus()
    setConfirmAction(confirm)
  }

  function confirmPendingAction() {
    if (!confirmAction) return
    setConfirmAction(null)
    confirmAction.run()
  }

  async function confirmLogout() {
    setLogoutSubmitting(true)
    try {
      await onLogout()
    } finally {
      setLogoutSubmitting(false)
      setLogoutConfirmOpen(false)
    }
  }

  return {
    action,
    closeMenus,
    confirmDelete,
    confirmLogout,
    confirmPendingAction,
    exportSites,
    importSites,
    navigatePage,
    openCreate,
    openDelete,
    openEdit,
    requestConfirmAction,
    requestLogout,
    saveSite
  }
}
