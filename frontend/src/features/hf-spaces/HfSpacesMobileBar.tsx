import { Search } from 'lucide-react'
import type { ReactNode } from 'react'

export function HfSpacesMobileBar({ searchQuery, headerActions, onSearchChange }: {
  searchQuery: string
  headerActions: ReactNode
  onSearchChange: (value: string) => void
}) {
  return (
    <div className="flex items-start gap-2 md:hidden">
      <label className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input className="field bg-white pl-10" value={searchQuery} onChange={event => onSearchChange(event.target.value)} placeholder="搜索 Space 名称或地址" />
      </label>
      {headerActions}
    </div>
  )
}
