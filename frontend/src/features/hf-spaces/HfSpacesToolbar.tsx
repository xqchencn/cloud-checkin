import { LayoutGrid, List, RefreshCcw, Search, SlidersHorizontal } from 'lucide-react'
import type { HfSpaceUserSummary } from '../../api/apiHfSpaces'
import { ButtonIcon } from '../../shared/ui'

export type HfSpaceStatusFilter = 'all' | 'running' | 'paused' | 'failed'
export type HfSpaceLayoutMode = 'grid' | 'list'

export function HfSpacesToolbar({
  searchQuery,
  statusFilter,
  userFilter,
  layoutMode,
  users,
  loading,
  onSearchChange,
  onStatusChange,
  onUserChange,
  onLayoutModeChange,
  onRefresh
}: {
  searchQuery: string
  statusFilter: HfSpaceStatusFilter
  userFilter: string
  layoutMode: HfSpaceLayoutMode
  users: HfSpaceUserSummary[]
  loading: boolean
  onSearchChange: (value: string) => void
  onStatusChange: (value: HfSpaceStatusFilter) => void
  onUserChange: (value: string) => void
  onLayoutModeChange: (value: HfSpaceLayoutMode) => void
  onRefresh: () => void
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr),160px,160px]">
        <label className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input className="field bg-white pl-10" value={searchQuery} onChange={event => onSearchChange(event.target.value)} placeholder="搜索 Space 名称或地址" />
        </label>
        <label className="relative">
          <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select className="field bg-white pl-9" value={statusFilter} onChange={event => onStatusChange(event.target.value as HfSpaceStatusFilter)}>
            <option value="all">全部状态</option>
            <option value="running">运行中</option>
            <option value="paused">已暂停</option>
            <option value="failed">最近失败</option>
          </select>
        </label>
        <select className="field bg-white" value={userFilter} onChange={event => onUserChange(event.target.value)}>
          <option value="all">全部用户</option>
          {users.map(user => <option key={user.id} value={String(user.id)}>{user.username}</option>)}
        </select>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button className="btn h-11 px-3" disabled={loading} onClick={onRefresh}>
          <ButtonIcon><RefreshCcw size={16} /></ButtonIcon>刷新
        </button>
        <div className="flex rounded-lg border border-line bg-white p-1 shadow-sm">
          <button className={layoutMode === 'grid' ? 'btn-icon h-9 w-9 border-brand bg-brandSoft text-brand shadow-none' : 'btn-icon h-9 w-9 border-transparent shadow-none'} onClick={() => onLayoutModeChange('grid')} aria-label="网格视图" title="网格视图">
            <LayoutGrid size={16} />
          </button>
          <button className={layoutMode === 'list' ? 'btn-icon h-9 w-9 border-brand bg-brandSoft text-brand shadow-none' : 'btn-icon h-9 w-9 border-transparent shadow-none'} onClick={() => onLayoutModeChange('list')} aria-label="列表视图" title="列表视图">
            <List size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
