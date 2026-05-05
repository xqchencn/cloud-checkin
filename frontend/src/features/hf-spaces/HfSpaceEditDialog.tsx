import { useEffect, useState, type FormEvent } from 'react'
import { Edit3, Save } from 'lucide-react'
import type { HfSpaceTarget } from '../../api/apiHfSpaces'
import { ButtonIcon, DialogCard, ModalShell, ToneBadge } from '../../shared/ui'
import { formatRuntimeStage, runtimeStageTone } from './hfSpacesLabels'

export function HfSpaceEditDialog({ target, open, saving, onCancel, onSave }: {
  target: HfSpaceTarget
  open: boolean
  saving: boolean
  onCancel: () => void
  onSave: (payload: { alias: string; keepaliveUrl: string }) => Promise<void>
}) {
  const originalTitle = target.title || target.space_name
  const [alias, setAlias] = useState(target.alias)
  const [keepaliveUrl, setKeepaliveUrl] = useState(target.keepalive_url)

  useEffect(() => {
    if (!open) return
    setAlias(target.alias)
    setKeepaliveUrl(target.keepalive_url)
  }, [open, target.alias, target.keepalive_url])

  if (!open) return null

  async function submit(event: FormEvent) {
    event.preventDefault()
    await onSave({ alias: alias.trim(), keepaliveUrl: keepaliveUrl.trim() })
  }

  return (
    <ModalShell>
      <form onSubmit={event => void submit(event)} className="w-full max-w-2xl">
        <DialogCard
          title="编辑 HF 保活地址"
          description="调整展示别名和定时请求使用的保活 URL，应用地址只用于对照。"
          icon={<Edit3 size={18} />}
          onClose={onCancel}
          size="lg"
          footer={
            <>
              <button type="button" className="btn" disabled={saving} onClick={onCancel}>取消</button>
              <button className="btn btn-primary" disabled={saving || !alias.trim() || !keepaliveUrl.trim()}>
                <ButtonIcon><Save size={16} /></ButtonIcon>{saving ? '保存中...' : '保存别名与地址'}
              </button>
            </>
          }
        >
          <div className="rounded-lg border border-line bg-slate-50/80 px-3 py-3">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-950">{target.alias}</h3>
                <p className="mt-1 truncate text-sm text-slate-500">{target.space_id}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <ToneBadge tone={runtimeStageTone(target.runtime_stage)}>{formatRuntimeStage(target.runtime_stage)}</ToneBadge>
                <ToneBadge tone={target.enabled ? 'info' : 'danger'}>{target.enabled ? '保活中' : '已停用'}</ToneBadge>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <label>
              <span className="label">别名</span>
              <input className="field bg-white" value={alias} onChange={event => setAlias(event.target.value)} autoFocus />
              <p className="mt-2 text-xs text-slate-500">原项目名：{originalTitle}</p>
            </label>
            <ReadonlyUrl label="应用地址" value={target.base_url} />
            <label>
              <span className="label">保活地址</span>
              <input
                className="field bg-white font-mono text-sm"
                value={keepaliveUrl}
                onChange={event => setKeepaliveUrl(event.target.value)}
              />
              <p className="mt-2 truncate text-xs text-slate-500" title={target.base_url}>Base URL：{target.base_url}</p>
            </label>
          </div>
        </DialogCard>
      </form>
    </ModalShell>
  )
}

function ReadonlyUrl({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 truncate font-mono text-xs text-slate-700" title={value}>{value}</p>
    </div>
  )
}
