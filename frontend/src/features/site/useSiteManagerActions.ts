import type { Dispatch, SetStateAction } from 'react'
import { ApiSite, ApiSiteCreate, ApiSiteDelete, ApiSiteExport, ApiSiteImport, ApiSiteUpdate, SiteFormPayload } from '../../api/apiSite'
import { PAGE_PATHS } from '../../shared/constants'
import type { ConfirmAction, PageKey } from '../../shared/types'
import { useToast } from '../../toast'

/**
 * 使用站点管理操作 Hook
 * @param load - 加载函数
 * @param onLogout - 登出回调
 * @param editingSite - 编辑中的站点
 * @param deleteSite - 删除中的站点
 * @param deleteConfirmName - 删除确认名称
 * @param confirmAction - 确认操作
 * @param setActivePage - 设置活动页面
 * @param setActionsOpen - 设置操作菜单打开状态
 * @param setBusyKey - 设置忙碌键
 * @param setConfirmAction - 设置确认操作
 * @param setDeleteConfirmName - 设置删除确认名称
 * @param setDeleteSite - 设置删除站点
 * @param setDeleting - 设置删除状态
 * @param setEditingSite - 设置编辑站点
 * @param setError - 设置错误
 * @param setFilterOpen - 设置筛选菜单打开状态
 * @param setFormOpen - 设置表单打开状态
 * @param setLogoutConfirmOpen - 设置登出确认打开状态
 * @param setLogoutSubmitting - 设置登出提交状态
 * @param setSaving - 设置保存状态
 * @returns 站点管理操作函数
 */
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

  /**
   * 执行操作
   * @param key - 操作键
   * @param fn - 操作函数
   * @param okMessage - 成功消息
   */
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

  /**
   * 关闭菜单
   */
  function closeMenus() {
    setActionsOpen(false)
    setFilterOpen(false)
  }

  /**
   * 打开创建表单
   */
  function openCreate() {
    setEditingSite(null)
    setFormOpen(true)
  }

  /**
   * 打开编辑表单
   * @param site - 站点对象
   */
  function openEdit(site: ApiSite) {
    setEditingSite(site)
    setFormOpen(true)
  }

  /**
   * 打开删除确认
   * @param site - 站点对象
   */
  function openDelete(site: ApiSite) {
    setDeleteSite(site)
    setDeleteConfirmName('')
  }

  /**
   * 确认删除
   */
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

  /**
   * 保存站点
   * @param payload - 站点表单数据
   */
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

  /**
   * 导出站点
   */
  async function exportSites() {
    const text = await ApiSiteExport(true)
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cloud-checkin-sites-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('导出文件已生成')
  }

  /**
   * 导入站点
   * @param file - 导入文件
   * @returns 导入结果
   */
  async function importSites(file: File): Promise<string> {
    const text = await file.text()
    const result = await ApiSiteImport(text)
    return `导入完成：成功 ${result.success_count}，跳过 ${result.skip_count}，失败 ${result.fail_count}`
  }

  /**
   * 导航到页面
   * @param page - 页面键
   */
  function navigatePage(page: PageKey) {
    closeMenus()
    setActivePage(page)
    const nextPath = PAGE_PATHS[page]
    if (window.location.pathname !== nextPath) window.history.pushState({ page }, '', nextPath)
  }

  /**
   * 请求登出
   */
  function requestLogout() {
    closeMenus()
    setLogoutConfirmOpen(true)
  }

  /**
   * 请求确认操作
   * @param confirm - 确认操作
   */
  function requestConfirmAction(confirm: ConfirmAction) {
    closeMenus()
    setConfirmAction(confirm)
  }

  /**
   * 确认待处理操作
   */
  function confirmPendingAction() {
    if (!confirmAction) return
    setConfirmAction(null)
    confirmAction.run()
  }

  /**
   * 确认登出
   */
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
