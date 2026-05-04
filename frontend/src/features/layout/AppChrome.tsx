import { ReactNode } from 'react'
import { ChevronDown, ChevronsLeft, ChevronsRight, Filter, List, LogOut, Menu, MoreHorizontal, Plus, RotateCcw, Search, UserRound } from 'lucide-react'
import type { PageKey } from '../../shared/types'
import { formatMoney } from '../../shared/format'
import { BrandMark, ButtonIcon } from '../../shared/ui'

/**
 * 应用程序外壳组件
 * @param activePage - 活动页面
 * @param pageMeta - 页面元数据
 * @param navItems - 导航项
 * @param sidebarCollapsed - 侧边栏是否折叠
 * @param totalBalance - 总余额
 * @param usedBalance - 已用余额
 * @param query - 查询关键词
 * @param filterLabel - 筛选标签
 * @param urlAggregatedView - URL 聚合视图
 * @param loading - 是否加载中
 * @param children - 子元素
 * @param onToggleSidebar - 切换侧边栏回调
 * @param onNavigatePage - 导航页面回调
 * @param onRequestLogout - 请求登出回调
 * @param onOpenCreate - 打开创建回调
 * @param onQueryChange - 查询变更回调
 * @param onRefresh - 刷新回调
 * @param onToggleUrlAggregated - 切换 URL 聚合视图回调
 * @param onToggleFilterMenu - 切换筛选菜单回调
 * @param onToggleActionMenu - 切换操作菜单回调
 * @param renderFilterMenu - 渲染筛选菜单函数
 * @param renderActionMenu - 渲染操作菜单函数
 */
export function AppChrome({
  activePage,
  pageMeta,
  navItems,
  sidebarCollapsed,
  totalBalance,
  usedBalance,
  query,
  filterLabel,
  urlAggregatedView,
  loading,
  children,
  onToggleSidebar,
  onNavigatePage,
  onRequestLogout,
  onOpenCreate,
  onQueryChange,
  onRefresh,
  onToggleUrlAggregated,
  onToggleFilterMenu,
  onToggleActionMenu,
  renderFilterMenu,
  renderActionMenu
}: {
  activePage: PageKey
  pageMeta: { title: string; subtitle: string }
  navItems: Array<{ key: PageKey; label: string; icon: ReactNode }>
  sidebarCollapsed: boolean
  totalBalance: number
  usedBalance: number
  query: string
  filterLabel: string
  urlAggregatedView: boolean
  loading: boolean
  children: ReactNode
  onToggleSidebar: () => void
  onNavigatePage: (page: PageKey) => void
  onRequestLogout: () => void
  onOpenCreate: () => void
  onQueryChange: (value: string) => void
  onRefresh: () => void
  onToggleUrlAggregated: () => void
  onToggleFilterMenu: () => void
  onToggleActionMenu: () => void
  renderFilterMenu: () => ReactNode
  renderActionMenu: () => ReactNode
}) {
  return (
    <main className="min-h-screen bg-surface text-ink">
      <div className="app-shell">
        <aside className="app-sidebar" data-collapsed={sidebarCollapsed}>
          <button
            className="sidebar-collapse-trigger"
            type="button"
            aria-label={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
            title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
            onClick={onToggleSidebar}
          >
            {sidebarCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
          <div className={`flex min-w-0 items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <BrandMark />
            {!sidebarCollapsed ? <span className="truncate text-lg font-semibold text-slate-950">Cloud Checkin</span> : null}
          </div>
          <nav className="mt-10 space-y-2">
            {navItems.map(item => (
              <button
                key={item.key}
                title={item.label}
                className={`flex w-full items-center rounded-lg px-4 py-3 text-sm font-semibold transition ${sidebarCollapsed ? 'justify-center px-3' : 'gap-3'} ${activePage === item.key ? 'bg-brandSoft text-brand' : 'text-slate-600 hover:bg-slate-50 hover:text-brand'}`}
                onClick={() => onNavigatePage(item.key)}
              >
                {item.icon}
                {!sidebarCollapsed ? item.label : null}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-footer-card">
              <p className="text-xs text-slate-500">{sidebarCollapsed ? '余额' : '当前总余额'}</p>
              <p className={`mt-2 font-bold text-slate-950 ${sidebarCollapsed ? 'text-lg' : 'text-2xl'}`}>{formatMoney(totalBalance)}</p>
              {!sidebarCollapsed ? <p className="mt-2 text-sm text-emerald-600">已用 {formatMoney(usedBalance)}</p> : null}
            </div>
            <div className="sidebar-footer-actions">
              <button className="sidebar-footer-action" type="button" title="Admin">
                <span className={`inline-flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
                  <UserRound size={18} />
                  {!sidebarCollapsed ? 'Admin' : null}
                </span>
              </button>
              <button className="sidebar-footer-action" type="button" title="退出登录" onClick={onRequestLogout}>
                <span className={`inline-flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
                  <LogOut size={16} />
                  {!sidebarCollapsed ? '退出登录' : null}
                </span>
              </button>
            </div>
          </div>
        </aside>

        <section className="page-shell">
          <div className="page-content">
            <MobileHeader
              activePage={activePage}
              pageMeta={pageMeta}
              navItems={navItems}
              query={query}
              loading={loading}
              urlAggregatedView={urlAggregatedView}
              onOpenCreate={onOpenCreate}
              onQueryChange={onQueryChange}
              onRefresh={onRefresh}
              onToggleUrlAggregated={onToggleUrlAggregated}
              onNavigatePage={onNavigatePage}
              onToggleFilterMenu={onToggleFilterMenu}
              onToggleActionMenu={onToggleActionMenu}
              renderFilterMenu={renderFilterMenu}
              renderActionMenu={renderActionMenu}
            />
            <DesktopHeader
              activePage={activePage}
              pageMeta={pageMeta}
              query={query}
              filterLabel={filterLabel}
              urlAggregatedView={urlAggregatedView}
              loading={loading}
              onOpenCreate={onOpenCreate}
              onQueryChange={onQueryChange}
              onRefresh={onRefresh}
              onToggleUrlAggregated={onToggleUrlAggregated}
              onToggleFilterMenu={onToggleFilterMenu}
              onToggleActionMenu={onToggleActionMenu}
              renderFilterMenu={renderFilterMenu}
              renderActionMenu={renderActionMenu}
            />
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}

function MobileHeader({ activePage, pageMeta, navItems, query, loading, urlAggregatedView, onOpenCreate, onQueryChange, onRefresh, onToggleUrlAggregated, onNavigatePage, onToggleFilterMenu, onToggleActionMenu, renderFilterMenu, renderActionMenu }: {
  activePage: PageKey
  pageMeta: { title: string; subtitle: string }
  navItems: Array<{ key: PageKey; label: string; icon: ReactNode }>
  query: string
  loading: boolean
  urlAggregatedView: boolean
  onOpenCreate: () => void
  onQueryChange: (value: string) => void
  onRefresh: () => void
  onToggleUrlAggregated: () => void
  onNavigatePage: (page: PageKey) => void
  onToggleFilterMenu: () => void
  onToggleActionMenu: () => void
  renderFilterMenu: () => ReactNode
  renderActionMenu: () => ReactNode
}) {
  return (
    <header className="md:hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark compact />
          <div className="min-w-0">
            <h1 className="text-3xl font-bold leading-tight text-slate-950">{pageMeta.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{pageMeta.subtitle}</p>
          </div>
        </div>
        {activePage === 'sites' ? (
          <button className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-soft" onClick={onOpenCreate} aria-label="新增站点">
            <Plus size={30} />
          </button>
        ) : null}
      </div>
      <div className={`mt-5 flex gap-2 ${activePage === 'sites' ? '' : 'justify-end'}`}>
        {activePage === 'sites' ? (
          <>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="field pl-10" value={query} onChange={event => onQueryChange(event.target.value)} placeholder="搜索站点名称或 URL" />
            </div>
            <button className="btn-icon h-11 w-11" onClick={onRefresh} disabled={loading} aria-label="刷新">
              <RotateCcw size={18} />
            </button>
            <button
              className={`${urlAggregatedView ? 'btn-icon bg-brand text-white hover:bg-brand' : 'btn-icon'} h-11 w-11`}
              onClick={onToggleUrlAggregated}
              aria-label="按 URL 聚合"
              title="按 URL 聚合"
              aria-pressed={urlAggregatedView}
            >
              <List size={18} />
            </button>
            <div className="relative" data-filter-menu-root="true">
              <button className="btn-icon h-11 w-11" onClick={onToggleFilterMenu} aria-label="筛选">
                <Filter size={19} />
              </button>
              {renderFilterMenu()}
            </div>
          </>
        ) : null}
        <div className="relative" data-actions-menu-root="true">
          <button className="btn-icon h-11 w-11" onClick={onToggleActionMenu} aria-label="更多操作">
            <Menu size={20} />
          </button>
          {renderActionMenu()}
        </div>
      </div>
      <nav className="mt-4 grid grid-cols-3 gap-2">
        {navItems.map(item => (
          <button
            key={item.key}
            type="button"
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold transition ${activePage === item.key ? 'bg-brand text-white' : 'border border-line bg-white text-slate-600'}`}
            onClick={() => onNavigatePage(item.key)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  )
}

function DesktopHeader({ activePage, pageMeta, query, filterLabel, urlAggregatedView, loading, onOpenCreate, onQueryChange, onRefresh, onToggleUrlAggregated, onToggleFilterMenu, onToggleActionMenu, renderFilterMenu, renderActionMenu }: {
  activePage: PageKey
  pageMeta: { title: string; subtitle: string }
  query: string
  filterLabel: string
  urlAggregatedView: boolean
  loading: boolean
  onOpenCreate: () => void
  onQueryChange: (value: string) => void
  onRefresh: () => void
  onToggleUrlAggregated: () => void
  onToggleFilterMenu: () => void
  onToggleActionMenu: () => void
  renderFilterMenu: () => ReactNode
  renderActionMenu: () => ReactNode
}) {
  return (
    <header className="hidden items-start justify-between gap-5 md:flex">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">{pageMeta.title}</h1>
        <p className="mt-2 text-sm text-slate-500">{pageMeta.subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        {activePage === 'sites' ? (
          <>
            <div className="relative w-[340px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="field pl-10" value={query} onChange={event => onQueryChange(event.target.value)} placeholder="搜索站点名称或 URL..." />
            </div>
            <button className="btn h-11 px-3 xl:px-4" onClick={onRefresh} disabled={loading} title="刷新" aria-label="刷新">
              <ButtonIcon><RotateCcw size={16} /></ButtonIcon><span className="hidden xl:inline">刷新</span>
            </button>
            <button className={`${urlAggregatedView ? 'btn btn-primary' : 'btn'} h-11 px-3 xl:px-4`} onClick={onToggleUrlAggregated} aria-pressed={urlAggregatedView}>
              <ButtonIcon><List size={16} /></ButtonIcon><span className="hidden xl:inline">按 URL 聚合</span>
            </button>
            <div className="relative" data-filter-menu-root="true">
              <button className="btn h-11 px-3 xl:min-w-[104px] xl:px-4" onClick={onToggleFilterMenu} title={filterLabel} aria-label={`筛选：${filterLabel}`}>
                <ButtonIcon><Filter size={16} /></ButtonIcon><span className="hidden xl:inline">{filterLabel}</span><ChevronDown className="hidden xl:block" size={15} />
              </button>
              {renderFilterMenu()}
            </div>
          </>
        ) : null}
        <div className="relative" data-actions-menu-root="true">
          <button className="btn h-11 px-3 xl:px-4" onClick={onToggleActionMenu} title="更多操作" aria-label="更多操作">
            <ButtonIcon><MoreHorizontal size={16} /></ButtonIcon><span className="hidden xl:inline">更多</span>
          </button>
          {renderActionMenu()}
        </div>
        {activePage === 'sites' ? (
          <button className="btn btn-primary h-11 px-3 xl:px-5" onClick={onOpenCreate} title="新增站点" aria-label="新增站点">
            <ButtonIcon><Plus size={17} /></ButtonIcon><span className="hidden xl:inline">新增站点</span>
          </button>
        ) : null}
      </div>
    </header>
  )
}
