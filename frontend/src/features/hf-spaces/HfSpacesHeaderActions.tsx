import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Layers3, MoreHorizontal, Plus, RefreshCcw, Server, ToggleRight } from 'lucide-react'
import { ButtonIcon } from '../../shared/ui'

export type HfSpaceViewMode = 'all' | 'users'

export function HfSpacesHeaderActions({
  viewMode,
  loading,
  hasTargets,
  onViewModeChange,
  onOpenAdd,
  onRefresh,
  onBatchEnable
}: {
  viewMode: HfSpaceViewMode
  loading: boolean
  hasTargets: boolean
  onViewModeChange: (value: HfSpaceViewMode) => void
  onOpenAdd: () => void
  onRefresh: () => void
  onBatchEnable: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [menuOpen])

  function chooseView(mode: HfSpaceViewMode) {
    onViewModeChange(mode)
    setMenuOpen(false)
  }

  function runAction(action: () => void) {
    action()
    setMenuOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn btn-primary h-11 px-3 xl:px-5" disabled={loading} onClick={onOpenAdd} title="新增HF" aria-label="新增HF">
        <ButtonIcon><Plus size={17} /></ButtonIcon><span className="hidden xl:inline">新增HF</span>
      </button>
      <div ref={menuRef} className="relative" data-hf-actions-menu-root="true">
        <button className="btn h-11 px-3 xl:px-4" onClick={() => setMenuOpen(open => !open)} title="更多" aria-label="更多">
          <ButtonIcon><MoreHorizontal size={16} /></ButtonIcon><span className="hidden xl:inline">更多</span>
        </button>
        {menuOpen ? (
          <div className="absolute right-0 top-12 z-30 w-52 overflow-hidden rounded-lg border border-line bg-white p-1 shadow-panel">
            <MenuButton active={viewMode === 'all'} icon={<Layers3 size={16} />} label="全部 Spaces" onClick={() => chooseView('all')} />
            <MenuButton active={viewMode === 'users'} icon={<Server size={16} />} label="按用户查看" onClick={() => chooseView('users')} />
            <MenuButton disabled={loading} icon={<RefreshCcw size={16} />} label="刷新" onClick={() => runAction(onRefresh)} />
            <MenuButton disabled={loading || !hasTargets} icon={<ToggleRight size={16} />} label="批量启用" onClick={() => runAction(onBatchEnable)} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function MenuButton({ active = false, disabled = false, icon, label, onClick }: {
  active?: boolean
  disabled?: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition ${active ? 'bg-brandSoft text-brand' : 'text-slate-600 hover:bg-slate-50 hover:text-brand'} disabled:cursor-not-allowed disabled:opacity-50`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
