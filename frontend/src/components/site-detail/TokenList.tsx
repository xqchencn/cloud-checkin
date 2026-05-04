import { type ReactNode, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  ApiSiteCreateRemoteToken,
  ApiSiteDeleteRemoteToken,
  ApiToken
} from '../../api/apiSite'
import { ButtonIcon, ToneBadge } from '../../shared/ui'
import { useToast } from '../../toast'
import { RemoteTokenDeleteModal, RemoteTokenModal, TokenKeyValue } from './TokenDialogs'

/**
 * Token 列表组件属性接口
 */
interface TokenListProps {
  siteId: number
  tokens: ApiToken[]
  remoteGroupOptions: string[]
  remoteGroupLoading: boolean
  remoteGroupError: string
  onSaved: () => Promise<void>
}

/**
 * 格式化数字为两位小数
 * @param value - 数值
 * @returns 格式化后的字符串
 */
function formatNumber(value: number | null | undefined): string {
  return Number(value || 0).toFixed(2)
}

/**
 * 格式化金额为美元显示
 * @param value - 金额数值
 * @returns 格式化后的货币字符串
 */
function formatMoney(value: number | null | undefined): string {
  return `$${formatNumber(value)}`
}

/**
 * 格式化日期时间
 * @param value - 日期字符串或时间戳
 * @returns 本地化显示的日期时间字符串
 */
function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  if (value === '-1') return '-'
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) {
    const date = new Date(numeric > 1000000000000 ? numeric : numeric * 1000)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN')
  }
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) return date.toLocaleString('zh-CN')
  return value.replace('T', ' ').replace(/\.\d+Z$/, ' UTC')
}

/**
 * 判断是否为无限额度的 Token
 * @param token - Token 对象
 * @returns 是否无限额度
 */
function isUnlimitedToken(token: ApiToken): boolean {
  return token.token_unlimited_quota || token.token_quota === 0
}

/**
 * 格式化 Token 额度显示
 * @param token - Token 对象
 * @returns 格式化后的额度字符串
 */
function formatTokenQuota(token: ApiToken): string {
  if (isUnlimitedToken(token)) return '不限'
  if (token.token_quota == null) return '-'
  return formatMoney(token.token_quota)
}

/**
 * 格式化 Token 剩余额度
 * @param token - Token 对象
 * @returns 格式化后的剩余额度字符串
 */
function formatTokenRemainingQuota(token: ApiToken): string {
  if (isUnlimitedToken(token)) return '不限'
  if (token.token_quota == null || token.token_used_quota == null) return '-'
  return formatMoney(token.token_quota - token.token_used_quota)
}

/**
 * 格式化 Token 过期时间
 * @param value - 过期时间值
 * @returns 格式化后的过期时间字符串
 */
function formatTokenExpiry(value: string | null | undefined): string {
  if (!value || value === '-1') return '永不过期'
  return formatDate(value)
}

/**
 * 格式化 Token 值状态
 * @param value - 值状态
 * @returns 可读的状态字符串
 */
function formatTokenValueStatus(value: ApiToken['value_status']): string {
  if (value === 'ready') return '完整'
  if (value === 'masked_pending') return '待补全'
  return '缺失'
}

/**
 * Token 时间值显示组件
 * @param value - 时间值
 * @returns 时间显示元素
 */
function TokenTimeValue({ value }: { value: string }) {
  return <span className="block truncate whitespace-nowrap" title={value}>{value}</span>
}

/**
 * Token 详情网格布局组件
 * @param items - 键值对数组
 * @returns 网格布局的详情展示
 */
function TokenDetailGrid({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-3">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-lg border border-line bg-slate-50/80 px-3 py-2">
          <dt className="text-xs font-medium text-slate-500">{label}</dt>
          <dd className="mt-1 min-w-0 break-words text-sm font-medium text-slate-800">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Token 列表组件
 * @param siteId - 站点 ID
 * @param tokens - Token 列表
 * @param remoteGroupOptions - 远程分组选项
 * @param remoteGroupLoading - 是否正在加载远程分组
 * @param remoteGroupError - 远程分组错误信息
 * @param onSaved - 数据保存成功回调
 */
export function TokenList({ siteId, tokens, remoteGroupOptions, remoteGroupLoading, remoteGroupError, onSaved }: TokenListProps) {
  const [remoteModalOpen, setRemoteModalOpen] = useState(false)
  const [savingRemoteToken, setSavingRemoteToken] = useState(false)
  const [deleteRemoteTarget, setDeleteRemoteTarget] = useState<ApiToken | null>(null)
  const [deletingRemoteTokenId, setDeletingRemoteTokenId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const toast = useToast()

  // 分组由详情抽屉打开时预拉取；弹窗只消费已有选项，避免点新增时才请求。
  function openRemoteTokenModal() {
    setError('')
    setRemoteModalOpen(true)
  }

  /**
   * 保存远端 Token
   * @param payload - Token 创建参数
   */
  async function saveRemoteToken(payload: { tokenName: string; group: string }) {
    if (!remoteModalOpen) return
    setSavingRemoteToken(true)
    setError('')
    try {
      await ApiSiteCreateRemoteToken(siteId, payload)
      toast.success('远端 Token 已创建')
      setRemoteModalOpen(false)
      await onSaved()
    } catch (err) {
      const message = err instanceof Error ? err.message : '远端 Token 保存失败'
      setError(message)
      toast.error(message)
    } finally {
      setSavingRemoteToken(false)
    }
  }

  /**
   * 删除远端 Token
   */
  async function deleteRemoteToken() {
    const token = deleteRemoteTarget
    if (!token?.remote_token_id) return
    setDeletingRemoteTokenId(token.id)
    setError('')
    try {
      await ApiSiteDeleteRemoteToken(siteId, token.remote_token_id)
      setDeleteRemoteTarget(null)
      await onSaved()
      toast.success('远端 Token 已删除')
    } catch (err) {
      const message = err instanceof Error ? err.message : '远端 Token 删除失败'
      setError(message)
      toast.error(message)
    } finally {
      setDeletingRemoteTokenId(null)
    }
  }

  /**
   * 渲染 Token 操作按钮
   * @param token - Token 对象
   * @returns 操作按钮元素
   */
  function renderTokenActions(token: ApiToken) {
    return (
      <>
        {token.remote_token_id ? (
          <button className="btn btn-danger px-2 py-1 text-xs" onClick={() => setDeleteRemoteTarget(token)}>
            <ButtonIcon><Trash2 size={14} /></ButtonIcon>删除远端
          </button>
        ) : null}
      </>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm leading-6 text-slate-500 sm:max-w-2xl">远端 Token 操作会调用当前站点自身的 Token 管理接口，成功后同步本地列表。</p>
        <button className="btn btn-primary w-full sm:w-auto sm:shrink-0" disabled={remoteGroupLoading} title={remoteGroupLoading ? '远端分组加载完成后可新建' : '新建远端 Token'} onClick={openRemoteTokenModal}>
          <ButtonIcon><Plus size={16} /></ButtonIcon>{remoteGroupLoading ? '加载分组中...' : '新建远端 Token'}
        </button>
      </div>
      {error ? <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
      {remoteGroupError ? <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">远端 Token 分组拉取失败：{remoteGroupError}</p> : null}
      {remoteGroupLoading ? <p className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-700">正在拉取远端 Token 分组...</p> : null}
      {!tokens.length ? <div className="soft-card px-4 py-8 text-center text-sm text-slate-500">暂无 Token</div> : null}
      {tokens.length ? <div className="grid gap-3">
        {tokens.map(token => (
          <article key={token.id} className="soft-card min-w-0 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="break-words text-sm font-semibold text-slate-950">{token.token_name || '-'}</h4>
                <div className="mt-2">
                  <TokenKeyValue token={token} />
                </div>
              </div>
              <ToneBadge tone={token.is_active === 1 ? 'success' : 'danger'}>{token.is_active === 1 ? '启用' : '禁用'}</ToneBadge>
            </div>
            <TokenDetailGrid items={[
              ['分组', token.token_group || 'default'],
              ['密钥状态', formatTokenValueStatus(token.value_status)],
              ['来源', token.source || '-'],
              ['总额度', formatTokenQuota(token)],
              ['已用额度', formatMoney(token.token_used_quota)],
              ['剩余额度', formatTokenRemainingQuota(token)],
              ['创建时间', <TokenTimeValue value={formatDate(token.created_time)} />],
              ['访问时间', <TokenTimeValue value={formatDate(token.accessed_time)} />],
              ['过期时间', <TokenTimeValue value={formatTokenExpiry(token.expired_time)} />]
            ]} />
            <div className="mt-3 flex flex-wrap gap-2">
              {renderTokenActions(token)}
            </div>
          </article>
        ))}
      </div> : null}
      {remoteModalOpen ? (
        <RemoteTokenModal
          groups={remoteGroupOptions}
          loading={remoteGroupLoading}
          error={remoteGroupError}
          saving={savingRemoteToken}
          onClose={() => setRemoteModalOpen(false)}
          onSave={saveRemoteToken}
        />
      ) : null}
      <RemoteTokenDeleteModal
        token={deleteRemoteTarget}
        deleting={deletingRemoteTokenId !== null}
        onClose={() => setDeleteRemoteTarget(null)}
        onConfirm={() => void deleteRemoteToken()}
      />
    </div>
  )
}
