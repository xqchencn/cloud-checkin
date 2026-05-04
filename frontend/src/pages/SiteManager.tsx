import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, List, Settings } from 'lucide-react'
import { ApiSite, ApiSiteGetTodayCheckinStatistics, ApiSiteList, TodayCheckinStats } from '../api/apiSite'
import { SITE_FILTERS } from '../shared/constants'
import { getPageFromPath } from '../shared/format'
import type { ConfirmAction, PageKey, SiteFilter } from '../shared/types'
import { AppChrome } from '../features/layout/AppChrome'
import { LogsPage } from '../features/logs/LogsPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { SiteManagerModals } from '../features/site/SiteManagerModals'
import { SiteActionMenu, SiteFilterMenu } from '../features/site/SiteMenus'
import { SiteListView } from '../features/site/SiteListView'
import { useSiteBatchActions } from '../features/site/useSiteBatchActions'
import { useSiteManagerActions } from '../features/site/useSiteManagerActions'
import { useVisibleSiteRows } from '../features/site/useVisibleSiteRows'

const URL_AGGREGATED_VIEW_STORAGE_KEY = 'cloud-checkin:url-aggregated-view'

function readUrlAggregatedViewPreference(): boolean {
  try {
    return window.localStorage.getItem(URL_AGGREGATED_VIEW_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function SiteManager({ onLogout }: { onLogout: () => void }) {
  const [sites, setSites] = useState<ApiSite[]>([])
  const [stats, setStats] = useState<TodayCheckinStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingSite, setEditingSite] = useState<ApiSite | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [detailSite, setDetailSite] = useState<ApiSite | null>(null)
  const [deleteSite, setDeleteSite] = useState<ApiSite | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [busyKey, setBusyKey] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<SiteFilter>('all')
  const [urlAggregatedView, setUrlAggregatedView] = useState(readUrlAggregatedViewPreference)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [activePage, setActivePage] = useState<PageKey>(() => getPageFromPath(window.location.pathname))
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [logoutSubmitting, setLogoutSubmitting] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // 列表和今日签到统计互不依赖，并行加载能让首页反馈更快。
      const [siteRows, todayStats] = await Promise.all([
        ApiSiteList(),
        ApiSiteGetTodayCheckinStatistics().catch(() => null)
      ])
      setSites(siteRows)
      setDetailSite(current => current ? siteRows.find(site => site.id === current.id) ?? null : null)
      setStats(todayStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const { runBatchAll, runBatchBalance, runBatchCheckin, runBatchTokens } = useSiteBatchActions({ sites, load, setBusyKey, setError })
  const {
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
  } = useSiteManagerActions({
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
  })

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    function syncPageFromUrl() {
      closeMenus()
      setActivePage(getPageFromPath(window.location.pathname))
    }
    window.addEventListener('popstate', syncPageFromUrl)
    return () => window.removeEventListener('popstate', syncPageFromUrl)
  }, [])

  useEffect(() => {
    if (!actionsOpen && !filterOpen) return

    function closeByTarget(target: EventTarget | null) {
      if (!(target instanceof Element)) return
      if (actionsOpen && !target.closest('[data-actions-menu-root="true"]')) {
        setActionsOpen(false)
      }
      if (filterOpen && !target.closest('[data-filter-menu-root="true"]')) {
        setFilterOpen(false)
      }
    }

    function handlePointerDown(event: PointerEvent) {
      closeByTarget(event.target)
    }

    function handleFocusIn(event: FocusEvent) {
      closeByTarget(event.target)
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') closeMenus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [actionsOpen, filterOpen])

  const enabledCount = useMemo(() => sites.filter(site => site.enabled).length, [sites])
  const totalBalance = useMemo(() => sites.reduce((sum, site) => sum + Number(site.site_quota || 0), 0), [sites])
  const usedBalance = useMemo(() => sites.reduce((sum, site) => sum + Number(site.site_used_quota || 0), 0), [sites])
  const { visibleSites, visibleUrlRows } = useVisibleSiteRows({ sites, query, filter, urlAggregatedView })

  const filterLabel = SITE_FILTERS.find(item => item.value === filter)?.label || '全部站点'
  const emptyText = loading ? '加载中...' : sites.length ? '没有匹配的站点' : '暂无站点'
  const pageMeta = {
    sites: { title: '站点管理', subtitle: '管理您的站点，自动签到与余额监控' },
    logs: { title: '日志', subtitle: '查看全局签到日志与任务执行记录' },
    settings: { title: '系统设置', subtitle: '系统概览、任务维护与数据操作' }
  }[activePage]
  const navItems: Array<{ key: PageKey; label: string; icon: ReactNode }> = [
    { key: 'sites', label: '站点管理', icon: <List size={18} /> },
    { key: 'logs', label: '日志', icon: <ClipboardList size={18} /> },
    { key: 'settings', label: '系统设置', icon: <Settings size={18} /> }
  ]

  function renderFilterMenu() {
    return (
      <SiteFilterMenu
        open={filterOpen}
        filter={filter}
        onSelect={value => {
          setFilter(value)
          setFilterOpen(false)
        }}
      />
    )
  }

  function renderActionMenu() {
    return (
      <SiteActionMenu
        open={actionsOpen}
        busyKey={busyKey}
        onBatchAll={() => void runBatchAll()}
        onBatchBalance={() => void runBatchBalance()}
        onBatchCheckin={() => void runBatchCheckin()}
        onBatchTokens={() => void runBatchTokens()}
        onConfirmAction={requestConfirmAction}
        onExport={() => { closeMenus(); void action('export', exportSites, '导出完成') }}
        onImport={file => { closeMenus(); void action('import', () => importSites(file), '导入完成') }}
        onLogout={requestLogout}
      />
    )
  }

  function toggleUrlAggregatedView() {
    setUrlAggregatedView(current => {
      const nextValue = !current
      try {
        window.localStorage.setItem(URL_AGGREGATED_VIEW_STORAGE_KEY, String(nextValue))
      } catch {}
      return nextValue
    })
  }

  return (
    <>
      <AppChrome
        activePage={activePage}
        pageMeta={pageMeta}
        navItems={navItems}
        sidebarCollapsed={sidebarCollapsed}
        totalBalance={totalBalance}
        usedBalance={usedBalance}
        query={query}
        filterLabel={filterLabel}
        urlAggregatedView={urlAggregatedView}
        loading={loading}
        onToggleSidebar={() => setSidebarCollapsed(current => !current)}
        onNavigatePage={navigatePage}
        onRequestLogout={requestLogout}
        onOpenCreate={openCreate}
        onQueryChange={setQuery}
        onRefresh={() => void load()}
        onToggleUrlAggregated={toggleUrlAggregatedView}
        onToggleFilterMenu={() => { setActionsOpen(false); setFilterOpen(open => !open) }}
        onToggleActionMenu={() => { setFilterOpen(false); setActionsOpen(open => !open) }}
        renderFilterMenu={renderFilterMenu}
        renderActionMenu={renderActionMenu}
      >
        {activePage === 'sites' ? (
          <>
            {error ? <p className="mt-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            <SiteListView
              sites={sites}
              stats={stats}
              enabledCount={enabledCount}
              totalBalance={totalBalance}
              usedBalance={usedBalance}
              visibleSites={visibleSites}
              visibleUrlRows={visibleUrlRows}
              emptyText={emptyText}
              onDetail={setDetailSite}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          </>
        ) : null}

        {activePage === 'logs' ? <LogsPage /> : null}
        {activePage === 'settings' ? (
          <SettingsPage
            onOpenLogs={() => navigatePage('logs')}
            onLogoutNow={onLogout}
          />
        ) : null}
      </AppChrome>

      <SiteManagerModals
        editingSite={editingSite}
        formOpen={formOpen}
        saving={saving}
        detailSite={detailSite}
        busyKey={busyKey}
        deleteSite={deleteSite}
        deleting={deleting}
        deleteConfirmName={deleteConfirmName}
        logoutConfirmOpen={logoutConfirmOpen}
        logoutSubmitting={logoutSubmitting}
        confirmAction={confirmAction}
        onCloseForm={() => setFormOpen(false)}
        onSaveSite={saveSite}
        onCloseDetail={() => setDetailSite(null)}
        onDetailAction={action}
        onDeleteConfirmNameChange={setDeleteConfirmName}
        onCloseDelete={() => setDeleteSite(null)}
        onConfirmDelete={() => void confirmDelete()}
        onCloseLogout={() => setLogoutConfirmOpen(false)}
        onConfirmLogout={() => void confirmLogout()}
        onCloseConfirmAction={() => setConfirmAction(null)}
        onConfirmPendingAction={confirmPendingAction}
      />
    </>
  )
}
