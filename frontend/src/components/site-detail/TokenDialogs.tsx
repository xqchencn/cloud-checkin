import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Copy, KeyRound, Plus, Trash2 } from 'lucide-react'
import { ApiToken, ApiTokenValue } from '../../api/apiSite'
import { ButtonIcon, DialogCard, ModalShell } from '../../shared/ui'

function maskTokenKey(value: string | null | undefined): string {
  if (!value) return '-'
  if (value.length <= 12) return value
  return `${value.slice(0, 8)}****${value.slice(-4)}`
}

function ensureGroupOption(groups: string[], group: string | null | undefined): string[] {
  const current = String(group || '').trim()
  if (!current || groups.includes(current)) return groups
  return [...groups, current]
}

export function RemoteTokenModal({ groups, loading, error, saving, onClose, onSave }: {
  groups: string[]
  loading: boolean
  error: string
  saving: boolean
  onClose: () => void
  onSave: (payload: { tokenName: string; group: string }) => Promise<void>
}) {
  const groupOptions = useMemo(() => ensureGroupOption(groups, null), [groups])
  const [tokenName, setTokenName] = useState('')
  const [group, setGroup] = useState(groupOptions[0] || 'default')

  useEffect(() => {
    setGroup(current => {
      const trimmed = current.trim()
      if (!trimmed || (trimmed === 'default' && groupOptions[0] !== 'default')) return groupOptions[0] || 'default'
      return groupOptions.includes(trimmed) ? trimmed : groupOptions[0] || 'default'
    })
  }, [groupOptions])

  async function submit(event: FormEvent) {
    event.preventDefault()
    await onSave({ tokenName: tokenName.trim(), group: group.trim() || 'default' })
  }

  return (
    <ModalShell>
      <form onSubmit={event => void submit(event)}>
        <DialogCard
          title="新建远端 Token"
          description="这里会直接调用远端站点的 Token 管理接口，成功后重新同步本地 Token 列表。"
          icon={<KeyRound size={18} />}
          onClose={onClose}
          footer={
            <>
              <button type="button" className="btn" onClick={onClose}>取消</button>
              <button className="btn btn-primary" disabled={saving || loading || !tokenName.trim()} type="submit">
                <ButtonIcon><Plus size={16} /></ButtonIcon>{saving ? '创建中...' : '创建'}
              </button>
            </>
          }
        >
          <div className="grid gap-4">
            <div>
              <label className="label">Token 名称</label>
              <input className="field" value={tokenName} required onChange={event => setTokenName(event.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Token 分组</label>
              <select className="field" value={group} onChange={event => setGroup(event.target.value)} disabled={loading && groupOptions.length <= 1}>
                {groupOptions.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
              {loading ? <p className="mt-2 text-xs text-slate-500">正在拉取远端分组...</p> : null}
              {error ? <p className="mt-2 text-xs text-amber-700">分组拉取失败，已保留当前可用选项。</p> : null}
            </div>
          </div>
        </DialogCard>
      </form>
    </ModalShell>
  )
}

export function RemoteTokenDeleteModal({ token, deleting, onClose, onConfirm }: {
  token: ApiToken | null
  deleting: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!token) return null
  return (
    <ModalShell>
      <DialogCard
        title="删除远端 Token"
        description="此操作会调用远端站点删除 Token，并重新同步本地 Token 列表。"
        icon={<Trash2 size={18} />}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose}>取消</button>
            <button className="btn btn-danger" disabled={deleting} onClick={onConfirm}>
              <ButtonIcon><Trash2 size={16} /></ButtonIcon>{deleting ? '删除中...' : '删除远端'}
            </button>
          </>
        }
      >
        <div className="rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <div className="font-medium text-slate-950">{token.token_name || token.remote_token_id || '-'}</div>
          <div className="mt-1 break-all text-xs text-slate-500">{token.remote_token_id}</div>
        </div>
      </DialogCard>
    </ModalShell>
  )
}

export function TokenKeyValue({ token }: { token: ApiToken }) {
  const [copying, setCopying] = useState(false)
  const [copyError, setCopyError] = useState('')
  const placeholder = token.value_status !== 'ready'

  async function copyFullToken() {
    setCopying(true)
    setCopyError('')
    try {
      const value = await ApiTokenValue(token.id)
      await navigator.clipboard?.writeText(value.token_key)
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : '完整密钥读取失败')
    } finally {
      setCopying(false)
    }
  }

  const maskedValue = maskTokenKey(token.token_key)

  return (
    <div className="min-w-0 space-y-1">
      <div className="flex min-w-0 items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700" title={maskedValue}>{maskedValue}</code>
        {!placeholder ? (
          <button className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900" disabled={copying} onClick={copyFullToken}>
            <Copy className="h-3.5 w-3.5" />
            {copying ? '读取中' : '复制完整密钥'}
          </button>
        ) : null}
      </div>
      {placeholder ? <p className="text-xs text-amber-700">本地不是完整密钥，不能复制。</p> : null}
      {copyError ? <p className="text-xs text-red-600">{copyError}</p> : null}
    </div>
  )
}
