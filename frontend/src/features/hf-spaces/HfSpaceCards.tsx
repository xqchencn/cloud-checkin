import { useState } from 'react'
import { Edit3, ToggleLeft, ToggleRight, Trash2, Zap } from 'lucide-react'
import type { HfSpaceTarget } from '../../api/apiHfSpaces'
import { formatDate } from '../../shared/format'
import { buildAvatarLabel, ButtonIcon, LetterAvatar, ToneBadge } from '../../shared/ui'
import { HfSpaceEditDialog } from './HfSpaceEditDialog'
import { formatRuntimeStage, runtimeStageTone } from './hfSpacesLabels'

export function SpaceCardGrid({ targets, layoutMode = 'grid', busyId, onToggle, onPing, onUpdateUrl, onDelete }: {
  targets: HfSpaceTarget[]
  layoutMode?: 'grid' | 'list'
  busyId: number | null
  onToggle: (target: HfSpaceTarget, enabled: boolean) => Promise<void>
  onPing: (target: HfSpaceTarget) => Promise<void>
  onUpdateUrl: (target: HfSpaceTarget, payload: { alias: string; keepaliveUrl: string }) => Promise<void>
  onDelete: (target: HfSpaceTarget) => Promise<void>
}) {
  const gridClass = layoutMode === 'list' ? 'grid gap-3' : 'grid gap-4 md:grid-cols-2 xl:grid-cols-3'
  if (!targets.length) return <div className="rounded-lg border border-line bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-panel">暂无保活 Space</div>
  return (
    <div className={gridClass}>
      {targets.map(target => <SpaceTargetCard key={target.id} target={target} layoutMode={layoutMode} busyId={busyId} onToggle={onToggle} onPing={onPing} onUpdateUrl={onUpdateUrl} onDelete={onDelete} />)}
    </div>
  )
}

function SpaceTargetCard({ target, layoutMode, busyId, onToggle, onPing, onUpdateUrl, onDelete }: {
  target: HfSpaceTarget
  layoutMode: 'grid' | 'list'
  busyId: number | null
  onToggle: (target: HfSpaceTarget, enabled: boolean) => Promise<void>
  onPing: (target: HfSpaceTarget) => Promise<void>
  onUpdateUrl: (target: HfSpaceTarget, payload: { alias: string; keepaliveUrl: string }) => Promise<void>
  onDelete: (target: HfSpaceTarget) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const busy = busyId === target.id

  function startEdit() {
    setEditing(true)
  }

  async function saveUrl(payload: { alias: string; keepaliveUrl: string }) {
    await onUpdateUrl(target, payload)
    setEditing(false)
  }

  const card = layoutMode === 'list' ? (
    <SpaceTargetListItem
      target={target}
      busy={busy}
      onPing={onPing}
      onToggle={onToggle}
      onEdit={startEdit}
      onDelete={onDelete}
    />
  ) : (
    <article className="hf-space-card rounded-lg border border-line bg-white p-4 shadow-panel transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-soft">
      <div className="grid grid-cols-[auto,minmax(0,1fr),auto] items-start gap-3">
        <SpaceAvatar target={target} />
        <div className="min-w-0">
          <SpaceHeading target={target} />
        </div>
        <SpaceStatusMeta target={target} />
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <UrlBlock label="应用地址" value={target.base_url} />
        <UrlBlock label="保活地址" value={target.keepalive_url} />
      </div>

      <KeepaliveHistoryStrip logs={target.logs || []} />

      <SpaceActionBar target={target} busy={busy} editing={editing} onPing={onPing} onToggle={onToggle} onEdit={startEdit} onDelete={onDelete} />
    </article>
  )

  return (
    <>
      {card}
      <HfSpaceEditDialog target={target} open={editing} saving={busy} onCancel={() => setEditing(false)} onSave={saveUrl} />
    </>
  )
}

function SpaceTargetListItem({ target, busy, onPing, onToggle, onEdit, onDelete }: {
  target: HfSpaceTarget
  busy: boolean
  onPing: (target: HfSpaceTarget) => Promise<void>
  onToggle: (target: HfSpaceTarget, enabled: boolean) => Promise<void>
  onEdit: () => void
  onDelete: (target: HfSpaceTarget) => Promise<void>
}) {
  return (
    <article className="hf-space-card rounded-lg border border-line bg-white px-4 py-3 shadow-panel transition hover:border-blue-100 hover:shadow-soft">
      <div className="grid gap-3 xl:grid-cols-[minmax(15rem,1.1fr),minmax(18rem,1.5fr),minmax(14rem,1fr),auto] xl:items-center">
        <div className="grid grid-cols-[auto,minmax(0,1fr),auto] items-start gap-3">
          <SpaceAvatar target={target} />
          <div className="min-w-0">
            <SpaceHeading target={target} compact />
          </div>
          <SpaceStatusMeta target={target} />
        </div>

        <div className="grid min-w-0 gap-2 md:grid-cols-2">
          <CompactUrlText label="应用地址" value={target.base_url} />
          <CompactUrlText label="保活地址" value={target.keepalive_url} />
        </div>

        <KeepaliveHistoryStrip logs={target.logs || []} compact />

        <SpaceActionBar target={target} busy={busy} editing={false} compact onPing={onPing} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </article>
  )
}

function SpaceHeading({ target, compact = false }: { target: HfSpaceTarget; compact?: boolean }) {
  return (
    <div className="min-w-0">
      <h3 className={`truncate font-semibold text-slate-950 ${compact ? 'text-base leading-5' : 'text-lg leading-6'}`}>{target.alias || target.title || target.space_name}</h3>
      <p className="mt-0.5 truncate text-sm leading-5 text-slate-500">{target.space_id}</p>
    </div>
  )
}

function SpaceAvatar({ target }: { target: HfSpaceTarget }) {
  return (
    <LetterAvatar
      seed={target.alias || target.title || target.space_name || target.space_id || '?'}
      label={buildAvatarLabel(target.alias || target.title || target.space_name || target.space_id || '?')}
      className="h-11 w-11 text-sm font-bold"
    />
  )
}

function SpaceStatusMeta({ target }: { target: HfSpaceTarget }) {
  return (
    <div className="flex max-w-[7.5rem] shrink-0 flex-col items-end gap-1">
      <ToneBadge tone={runtimeStageTone(target.runtime_stage)}>{formatRuntimeStage(target.runtime_stage)}</ToneBadge>
      <ToneBadge tone={target.enabled ? 'info' : 'danger'}>{target.enabled ? '保活中' : '已停用'}</ToneBadge>
    </div>
  )
}

function SpaceActionBar({ target, busy, editing, compact = false, onPing, onToggle, onEdit, onDelete }: {
  target: HfSpaceTarget
  busy: boolean
  editing: boolean
  compact?: boolean
  onPing: (target: HfSpaceTarget) => Promise<void>
  onToggle: (target: HfSpaceTarget, enabled: boolean) => Promise<void>
  onEdit: () => void
  onDelete: (target: HfSpaceTarget) => Promise<void>
}) {
  const toggleClass = target.enabled
    ? 'border-emerald-100 bg-emerald-50 text-emerald-600 hover:border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700'
    : 'border-red-100 bg-red-50 text-red-600 hover:border-red-200 hover:bg-red-100 hover:text-red-700'

  return (
    <div className={compact ? 'grid grid-cols-[auto,auto,auto,40px] gap-1.5 xl:justify-end' : 'mt-4 grid grid-cols-[1fr,1fr,44px,44px] gap-1.5 border-t border-line pt-3'}>
      <button className="btn h-9 px-2 text-xs" disabled={busy} onClick={() => void onPing(target)}>
        <ButtonIcon><Zap size={15} /></ButtonIcon>手动保活
      </button>
      <button className="btn h-9 px-2 text-xs" disabled={busy || editing} onClick={onEdit} title="编辑地址">
        <ButtonIcon><Edit3 size={15} /></ButtonIcon>编辑
      </button>
      <button className={`${compact ? 'btn h-9 px-2 text-xs' : 'btn-icon h-9 w-9'} ${toggleClass}`} disabled={busy} onClick={() => void onToggle(target, !target.enabled)} title={target.enabled ? '停用' : '启用'} aria-label={target.enabled ? '停用' : '启用'}>
        {target.enabled ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
        {compact ? target.enabled ? '停用' : '启用' : null}
      </button>
      <button className="btn-icon h-9 w-9 text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700" disabled={busy || target.enabled} onClick={() => void onDelete(target)} title={target.enabled ? '请先停用再删除' : '删除'} aria-label="删除">
        <Trash2 size={15} />
      </button>
    </div>
  )
}

type HistorySlot = {
  key: string
  status: 'success' | 'failed' | 'empty'
  tooltip: string
}

function KeepaliveHistoryStrip({ logs, compact = false }: { logs: HfSpaceTarget['logs']; compact?: boolean }) {
  const slots = buildHistorySlots(logs)
  const total = logs.length
  const success = logs.filter(log => log.status === 'success').length
  const successRate = total ? `${((success / total) * 100).toFixed(1)}%` : '-'

  return (
    <div className={`${compact ? 'mt-0' : 'mt-3'} rounded-lg border border-line bg-slate-50/80 px-3 py-2`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-500">最近 48 小时</p>
        <p className="text-xs font-semibold text-emerald-700">{successRate}</p>
      </div>
      <div className="flex h-4 min-w-0 items-center gap-[2px]">
        {slots.map(slot => (
          <span
            key={slot.key}
            title={slot.tooltip}
            className={`h-4 min-w-[3px] flex-1 rounded-[1px] ${slot.status === 'success' ? 'bg-emerald-400' : slot.status === 'failed' ? 'bg-red-400' : 'bg-slate-200'}`}
          />
        ))}
      </div>
    </div>
  )
}

function buildHistorySlots(logs: HfSpaceTarget['logs']): HistorySlot[] {
  const hourMs = 60 * 60 * 1000
  const currentHour = new Date()
  currentHour.setMinutes(0, 0, 0)
  const startMs = currentHour.getTime() - 47 * hourMs

  return Array.from({ length: 48 }, (_, index) => {
    const slotStart = startMs + index * hourMs
    const slotEnd = slotStart + hourMs
    const slotLogs = logs.filter(log => {
      const createdAt = new Date(log.created_at).getTime()
      return Number.isFinite(createdAt) && createdAt >= slotStart && createdAt < slotEnd
    })
    const status = slotLogs.length
      ? slotLogs.some(log => log.status === 'failed') ? 'failed' : 'success'
      : 'empty'
    const range = `${formatDate(new Date(slotStart).toISOString())} - ${formatDate(new Date(slotEnd).toISOString())}`
    const details = slotLogs.length
      ? slotLogs.map(log => `${formatDate(log.created_at)} ${log.status === 'success' ? '成功' : '失败'} ${log.latency_ms ?? '-'}ms`).join('\n')
      : '暂无保活记录'
    return {
      key: String(slotStart),
      status,
      tooltip: `${range}\n${details}`
    }
  })
}

function UrlBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50/80 px-3 py-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 truncate font-mono text-xs text-slate-700" title={value}>{value}</p>
    </div>
  )
}

function CompactUrlText({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-slate-50/80 px-3 py-2">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 truncate font-mono text-xs text-slate-700" title={value}>{value}</p>
    </div>
  )
}
