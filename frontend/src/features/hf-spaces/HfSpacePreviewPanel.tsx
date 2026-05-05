import { Search } from 'lucide-react'
import type { HfSpaceOption, HfSpacePreview } from '../../api/apiHfSpaces'
import { buildAvatarLabel, DialogCard, LetterAvatar, ModalShell, ToneBadge } from '../../shared/ui'
import { formatDomainStage, formatRuntimeStage, runtimeStageTone } from './hfSpacesLabels'

export function HfSpaceAddModal({ open, input, preview, selected, keepaliveUrls, saving, onInputChange, onPreview, onToggle, onKeepaliveUrlChange, onCancel, onSave }: {
  open: boolean
  input: string
  preview: HfSpacePreview | null
  selected: Record<string, boolean>
  keepaliveUrls: Record<string, string>
  saving: boolean
  onInputChange: (value: string) => void
  onPreview: () => void
  onToggle: (spaceId: string, checked: boolean) => void
  onKeepaliveUrlChange: (spaceId: string, value: string) => void
  onCancel: () => void
  onSave: () => void
}) {
  if (!open) return null
  const orderedSpaces = [...(preview?.spaces || [])].sort((left, right) => Number(right.selectable) - Number(left.selectable) || left.space_id.localeCompare(right.space_id))
  return (
    <ModalShell>
      <DialogCard
        title="新增 HF 保活"
        description="输入 Hugging Face 用户名或地址，识别后选择需要保活的 Space。"
        icon={<Search size={18} />}
        onClose={onCancel}
        size="wide"
        footer={
          <>
            <button className="btn" onClick={onCancel}>取消</button>
            <button className="btn btn-primary" disabled={saving || !preview || !Object.values(selected).some(Boolean)} onClick={onSave}>保存选择</button>
          </>
        }
      >
        <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr),auto]" onSubmit={event => {
          event.preventDefault()
          if (input.trim() && !saving) onPreview()
        }}>
          <input className="field" value={input} onChange={event => onInputChange(event.target.value)} placeholder="cnxqchen、https://huggingface.co/cnxqchen/spaces 或 https://cnxqchen-ar.hf.space/" />
          <button className="btn" type="submit" disabled={saving || !input.trim()}>识别 Space</button>
        </form>
        {preview ? (
          <>
            <div className="mt-4 flex flex-col gap-1 border-t border-line pt-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-950">{preview.username} 的 Spaces</h3>
                <p className="text-sm text-slate-500">默认保活地址是 Space 应用地址。保存前可以把路径或查询参数改成同域名下的健康检查地址。</p>
              </div>
              <p className="shrink-0 text-sm font-medium text-slate-600">共识别 {preview.spaces.length} 个</p>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {orderedSpaces.map(space => (
                <label
                  key={space.space_id}
                  title={!space.selectable && space.disabled_reason ? `不可选择：${space.disabled_reason}` : undefined}
                  className={`space-option-list hf-space-card block rounded-lg border p-4 shadow-panel transition ${space.selectable ? 'cursor-pointer border-line bg-white hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-soft' : 'border-line bg-slate-50/80 opacity-80'}`}
                >
                  <div className="grid grid-cols-[auto,minmax(0,1fr),auto] items-start gap-3">
                    <SpaceOptionAvatar space={space} />
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold leading-6 text-slate-950">{space.title}</h3>
                      <p className="mt-0.5 truncate text-sm leading-5 text-slate-500">{space.space_id}</p>
                    </div>
                    <SpaceOptionStatusMeta
                      space={space}
                      checked={Boolean(selected[space.space_id])}
                      onToggle={checked => onToggle(space.space_id, checked)}
                    />
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    <AddressBlock label="应用地址" value={space.app_url} />
                    {space.selectable && selected[space.space_id] ? (
                      <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2">
                        <p className="text-[11px] font-medium text-slate-500">保活地址</p>
                        <input className="field mt-2 h-9 bg-white text-xs" value={keepaliveUrls[space.space_id] || space.default_keepalive_url} onChange={event => onKeepaliveUrlChange(space.space_id, event.target.value)} />
                      </div>
                    ) : (
                      <AddressBlock label="保活地址" value={space.default_keepalive_url} />
                    )}
                  </div>

                  <SpaceOptionSummary space={space} />
                </label>
              ))}
            </div>
          </>
        ) : null}
      </DialogCard>
    </ModalShell>
  )
}

function SpaceOptionSummary({ space }: { space: HfSpaceOption }) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      <InfoPill label="运行态" value={formatRuntimeStage(space.runtime_stage)} tone={runtimeStageTone(space.runtime_stage)} />
      <InfoPill label="域名状态" value={formatDomainStage(space.domain_stage)} tone={space.domain_stage === 'READY' ? 'success' : 'muted'} />
      <InfoPill label="SDK" value={space.sdk || '-'} />
    </div>
  )
}

function SpaceOptionAvatar({ space }: { space: HfSpaceOption }) {
  return (
    <LetterAvatar
      seed={space.title || space.space_id}
      label={buildAvatarLabel(space.title || space.space_id || '?')}
      className="h-11 w-11 text-sm font-bold"
    />
  )
}

function SpaceOptionStatusMeta({ space, checked, onToggle }: {
  space: HfSpaceOption
  checked: boolean
  onToggle: (checked: boolean) => void
}) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <ToneBadge tone={space.selectable ? 'info' : 'warning'}>{space.selectable ? '可添加' : '不可选'}</ToneBadge>
      </div>
      <input className="mt-0.5" type="checkbox" checked={checked} disabled={!space.selectable} onChange={event => onToggle(event.target.checked)} />
    </div>
  )
}

function InfoPill({ label, value, tone = 'muted' }: { label: string; value: string; tone?: 'success' | 'warning' | 'danger' | 'muted' }) {
  const valueClass = tone === 'success'
    ? 'text-emerald-700'
    : tone === 'warning'
      ? 'text-amber-700'
      : tone === 'danger'
        ? 'text-red-700'
        : 'text-slate-700'
  return (
    <div className="rounded-lg border border-line bg-white px-2 py-1.5">
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className={`mt-0.5 truncate font-semibold ${valueClass}`}>{value}</p>
    </div>
  )
}

function AddressBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 truncate font-mono text-xs text-slate-700" title={value}>{value}</p>
    </div>
  )
}
