import { RefreshCcw } from 'lucide-react'
import type { HfSpaceTarget, HfSpaceUserSummary } from '../../api/apiHfSpaces'
import { formatDate } from '../../shared/format'
import { ButtonIcon } from '../../shared/ui'
import { SpaceCardGrid } from './HfSpaceCards'
import type { HfSpaceLayoutMode } from './HfSpacesToolbar'

export function HfSpacesUserSections({
  users,
  targets,
  layoutMode,
  busyId,
  loading,
  onRefreshUser,
  onToggle,
  onPing,
  onUpdateUrl,
  onDelete
}: {
  users: HfSpaceUserSummary[]
  targets: HfSpaceTarget[]
  layoutMode: HfSpaceLayoutMode
  busyId: number | null
  loading: boolean
  onRefreshUser: (user: HfSpaceUserSummary) => Promise<void>
  onToggle: (target: HfSpaceTarget, enabled: boolean) => Promise<void>
  onPing: (target: HfSpaceTarget) => Promise<void>
  onUpdateUrl: (target: HfSpaceTarget, payload: { alias: string; keepaliveUrl: string }) => Promise<void>
  onDelete: (target: HfSpaceTarget) => Promise<void>
}) {
  if (!users.length) return <div className="rounded-lg border border-line bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-panel">暂无 HF 用户</div>

  return (
    <div className="space-y-4">
      {users.map(user => {
        const userTargets = targets.filter(target => target.hf_user_id === user.id)
        if (!userTargets.length) return null
        return (
          <section key={user.id} className="rounded-lg border border-line bg-white/90 p-4 shadow-panel">
            <div className="flex flex-col gap-3 border-b border-line pb-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{user.username}</h2>
                <p className="mt-1 text-sm text-slate-500">已选择 {user.selected_count} 个，启用 {user.enabled_count} 个，最近更新 {formatDate(user.last_synced_at)}</p>
              </div>
              <button className="btn" onClick={() => void onRefreshUser(user)} disabled={loading}>
                <ButtonIcon><RefreshCcw size={16} /></ButtonIcon>更新
              </button>
            </div>
            <div className="mt-4">
              <SpaceCardGrid
                targets={userTargets}
                layoutMode={layoutMode}
                busyId={busyId}
                onToggle={onToggle}
                onPing={onPing}
                onUpdateUrl={onUpdateUrl}
                onDelete={onDelete}
              />
            </div>
          </section>
        )
      })}
    </div>
  )
}
