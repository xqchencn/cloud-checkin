import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { CalendarCheck, CheckCircle2, Database, FileText, KeyRound, List, RefreshCcw, RotateCcw, X } from 'lucide-react'
import { ApiModel, ApiSite, ApiSiteCheckin, ApiSiteGetCheckinLogs, ApiSiteGetModels, ApiSiteGetRemoteTokenGroups, ApiSiteGetTaskLogs, ApiSiteGetTokens, ApiSiteRefreshBalance, ApiSiteRefreshModels, ApiSiteSyncTokens, ApiToken, CheckinLog, Paginated, TaskLog } from '../../api/apiSite'
import { LogMobileCards } from '../../components/logs/LogCards'
import { CHECKIN_LOG_COLUMNS, CHECKIN_LOG_HEADERS, TASK_LOG_COLUMNS, TASK_LOG_HEADERS, buildCheckinLogRows, buildTaskLogRows } from '../../components/logs/LogTables'
import { TokenList } from '../../components/site-detail/TokenList'
import { getCheckinDisabledReason, getCheckinDisplay, supportsSiteCheckin } from '../../shared/checkin'
import { formatDate, formatMoney, normalizeRemoteGroupOptions, siteCredentialDetails } from '../../shared/format'
import { SimpleTable } from '../../shared/SimpleTable'
import { ButtonIcon, DetailGrid, SiteAvatar, ToneBadge } from '../../shared/ui'

export function SiteDetailDrawer({ site, open, busyKey, onClose, onAction }: {
  site: ApiSite | null
  open: boolean
  busyKey: string
  onClose: () => void
  onAction: (key: string, fn: () => Promise<unknown>, okMessage: string) => Promise<void>
}) {
  const [tab, setTab] = useState<'overview' | 'tokens' | 'models' | 'checkin' | 'tasks'>('overview')  // 当前选中的标签页
  const [loading, setLoading] = useState(false)  // 加载状态
  const [error, setError] = useState('')  // 错误信息
  const [tokens, setTokens] = useState<ApiToken[]>([])  // 令牌列表
  const [models, setModels] = useState<ApiModel[]>([])  // 模型列表
  const [checkinLogs, setCheckinLogs] = useState<CheckinLog[]>([])  // 签到日志列表
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([])  // 任务日志列表
  const [remoteGroupOptions, setRemoteGroupOptions] = useState<string[]>(['default'])  // 远程令牌分组选项
  const [remoteGroupLoading, setRemoteGroupLoading] = useState(false)
  const [remoteGroupError, setRemoteGroupError] = useState('')
  const remoteGroupRequestId = useRef(0)

  const loadRemoteGroupsForSite = useCallback(async (siteId: number) => {
    const requestId = remoteGroupRequestId.current + 1
    remoteGroupRequestId.current = requestId
    setRemoteGroupLoading(true)
    setRemoteGroupError('')
    setRemoteGroupOptions(['default'])
    try {
      const result = await ApiSiteGetRemoteTokenGroups(siteId)
      if (requestId !== remoteGroupRequestId.current) return
      setRemoteGroupOptions(normalizeRemoteGroupOptions(result.groups))
    } catch (err) {
      if (requestId !== remoteGroupRequestId.current) return
      setRemoteGroupError(err instanceof Error ? err.message : '远端分组加载失败')
      setRemoteGroupOptions(current => normalizeRemoteGroupOptions(current))
    } finally {
      if (requestId === remoteGroupRequestId.current) setRemoteGroupLoading(false)
    }
  }, [])

  const loadTab = useCallback(async () => {
    if (!site) return
    setLoading(true)
    setError('')
    try {
      if (tab === 'overview') {
        // 总览标签页：同时加载令牌和模型数据
        const [tokenRows, modelRows] = await Promise.all([
          ApiSiteGetTokens(site.id).catch(() => []),
          ApiSiteGetModels(site.id).catch(() => ({ models: [] }))
        ])
        setTokens(tokenRows)
        setModels(modelRows.models || [])
      }
      if (tab === 'tokens') setTokens(await ApiSiteGetTokens(site.id))
      if (tab === 'models') {
        // 模型标签页：加载站点模型列表
        setModels((await ApiSiteGetModels(site.id)).models || [])
      }
      if (tab === 'checkin') setCheckinLogs(await ApiSiteGetCheckinLogs(site.id))
      if (tab === 'tasks') {
        const result: Paginated<TaskLog> = await ApiSiteGetTaskLogs(site.id)
        setTaskLogs(result.logs || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [site, tab])

  /**
   * 打开时加载标签页数据
   */
  useEffect(() => {
    if (open) void loadTab()
  }, [open, loadTab])

  /**
   * 打开时加载远程分组
   */
  useEffect(() => {
    if (open && site) void loadRemoteGroupsForSite(site.id)
  }, [open, site, loadRemoteGroupsForSite])

  if (!open || !site) return null
  const checkinDisabledReason = getCheckinDisabledReason(site)
  const checkinUnsupported = !supportsSiteCheckin(site)
  const checkinUnsupportedMessage = checkinLogs.length
    ? '当前站点类型不支持签到，下方记录为历史签到数据。'
    : '当前站点类型不支持签到，暂无可执行的签到数据。'

  /**
   * 运行详情操作
   * @param key - 操作键
   * @param fn - 操作函数
   * @param okMessage - 成功消息
   */
  async function runDetailAction(key: string, fn: () => Promise<unknown>, okMessage: string) {
    await onAction(key, fn, okMessage)
    await loadTab()
  }

  return (
    <aside className="drawer-shell">
      <div className="drawer-panel">
      <div className="flex items-start justify-between gap-4 border-b border-line p-5">
        <div className="flex min-w-0 items-center gap-3">
          <SiteAvatar site={site} />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-slate-950">{site.name}</h2>
            <p className="mt-1 break-all text-sm text-slate-500">{site.url}</p>
          </div>
        </div>
        <button className="btn-icon" onClick={onClose} aria-label="关闭"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2 border-b border-line bg-slate-50/60 px-4 py-3 sm:px-5 lg:grid-cols-4">
        <button
          className="btn"
          disabled={Boolean(busyKey) || Boolean(checkinDisabledReason)}
          title={checkinDisabledReason || '签到'}
          onClick={() => void runDetailAction(`checkin-${site.id}`, () => ApiSiteCheckin(site.id), '签到完成')}
        >
          <ButtonIcon><CheckCircle2 size={16} /></ButtonIcon>签到
        </button>
        <button className="btn" disabled={Boolean(busyKey)} onClick={() => void runDetailAction(`balance-${site.id}`, () => ApiSiteRefreshBalance(site.id), '余额刷新完成')}>
          <ButtonIcon><Database size={16} /></ButtonIcon>余额
        </button>
        <button className="btn" disabled={Boolean(busyKey)} onClick={() => void runDetailAction(`tokens-${site.id}`, () => ApiSiteSyncTokens(site.id), 'Token 同步完成')}>
          <ButtonIcon><KeyRound size={16} /></ButtonIcon>Token
        </button>
        <button className="btn" disabled={Boolean(busyKey)} onClick={() => void runDetailAction(`models-${site.id}`, () => ApiSiteRefreshModels(site.id), '模型刷新完成')}>
          <ButtonIcon><RefreshCcw size={16} /></ButtonIcon>模型
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 border-b border-line px-4 py-3 sm:flex sm:flex-wrap sm:px-5">
        {[
          { key: 'overview', label: '总览', icon: <List size={16} /> },
          { key: 'tokens', label: 'Token', icon: <KeyRound size={16} /> },
          { key: 'models', label: '模型', icon: <Database size={16} /> },
          { key: 'checkin', label: '签到日志', icon: <CalendarCheck size={16} /> },
          { key: 'tasks', label: '定时任务日志', icon: <FileText size={16} /> }
        ].map(item => (
          <button key={item.key} className={`${tab === item.key ? 'btn btn-primary' : 'btn'} w-full sm:w-auto sm:shrink-0`} onClick={() => setTab(item.key as typeof tab)}>
            <ButtonIcon>{item.icon}</ButtonIcon>{item.label}
          </button>
        ))}
        <button className="btn w-full sm:ml-auto sm:w-auto sm:shrink-0" onClick={loadTab} disabled={loading}>
          <ButtonIcon><RotateCcw size={16} /></ButtonIcon>{loading ? '刷新中...' : '刷新'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-surface/60 p-4 sm:p-5">
        {error ? <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {tab === 'overview' ? <SiteOverview site={site} tokenCount={tokens.length} modelCount={models.length} /> : null}
        {tab === 'tokens' ? (
          <TokenList
            siteId={site.id}
            tokens={tokens}
            remoteGroupOptions={remoteGroupOptions}
            remoteGroupLoading={remoteGroupLoading}
            remoteGroupError={remoteGroupError}
            onSaved={loadTab}
          />
        ) : null}
        {tab === 'models' ? (
          // 模型列表表格：显示站点支持的所有 AI 模型
          <SimpleTable
            headers={['模型', '类型', '启用', '创建时间']}
            rows={models.map(model => [model.model_name, model.model_type || '-', model.is_active ? '是' : '否', formatDate(model.created_at)])}
          />
        ) : null}
        {tab === 'checkin' ? (
          <>
            {checkinUnsupported ? (
              <p className="mb-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">{checkinUnsupportedMessage}</p>
            ) : null}
            <LogMobileCards tab="checkin" checkinLogs={checkinLogs} taskLogs={[]} showSiteName={false} />
            <SimpleTable
              headers={CHECKIN_LOG_HEADERS}
              rows={buildCheckinLogRows(checkinLogs, false)}
              mobile="none"
              columnClassNames={CHECKIN_LOG_COLUMNS}
            />
          </>
        ) : null}
        {tab === 'tasks' ? (
          <>
            <LogMobileCards tab="task" checkinLogs={[]} taskLogs={taskLogs} showSiteName={false} />
            <SimpleTable
              headers={TASK_LOG_HEADERS}
              rows={buildTaskLogRows(taskLogs, false)}
              mobile="none"
              columnClassNames={TASK_LOG_COLUMNS}
            />
          </>
        ) : null}
      </div>
      </div>
    </aside>
  )
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="soft-card p-4">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  )
}

/**
 * 站点总览组件
 * @param site - 站点对象
 * @param tokenCount - 令牌数量
 * @param modelCount - 模型数量
 */
function SiteOverview({ site, tokenCount, modelCount }: { site: ApiSite; tokenCount: number; modelCount: number }) {
  const checkin = getCheckinDisplay(site)
  const hasAffInfo = Boolean(site.site_aff_code || site.site_aff_count || site.site_aff_quota || site.site_aff_history_quota)
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="soft-card p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">余额</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{formatMoney(site.site_quota)}</p>
          <p className="mt-1 text-xs text-slate-500">历史消耗 {formatMoney(site.site_used_quota)}，请求 {site.site_request_count || 0} 次</p>
        </div>
        <div className="soft-card p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">签到状态</p>
          <div className="mt-2"><ToneBadge tone={checkin.tone}>{checkin.text}</ToneBadge></div>
          <p className="mt-2 text-xs text-slate-500">{checkin.hint}</p>
        </div>
        <div className="soft-card p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">同步数据</p>
          <p className="mt-2 text-sm font-medium text-slate-800">Token {tokenCount} 个，模型 {modelCount} 个</p>
          <p className="mt-1 text-xs text-slate-500">余额检查 {formatDate(site.last_check_time)}</p>
        </div>
      </div>

      <DetailBlock title="站点信息">
        <DetailGrid items={[
          ['名称', site.name],
          ['URL', site.url],
          ['API 类型', site.api_type],
          ['用户 ID', site.user_id || '-'],
          ['站点用户', site.site_username || '-'],
          ['用户分组', site.site_user_group || '-'],
          ['启用状态', site.enabled ? '启用' : '禁用'],
          ['自动签到', site.auto_checkin ? '启用' : '禁用'],
          ['签到端点', site.checkin_endpoint || '默认端点'],
          ['创建时间', formatDate(site.created_at)],
          ['更新时间', formatDate(site.updated_at)]
        ]} />
      </DetailBlock>

      <DetailBlock title="认证配置">
        <DetailGrid items={[
          ...siteCredentialDetails(site)
        ]} />
      </DetailBlock>

      {hasAffInfo ? (
        <DetailBlock title="邀请信息">
          <DetailGrid items={[
            ['邀请码', site.site_aff_code || '-'],
            ['邀请数', site.site_aff_count || 0],
            ['待提现', formatMoney(site.site_aff_quota)],
            ['总收益', formatMoney(site.site_aff_history_quota)]
          ]} />
        </DetailBlock>
      ) : null}

      <DetailBlock title="备注">
        <p className="whitespace-pre-wrap break-words rounded-lg border border-line bg-slate-50/80 px-3 py-2 text-sm text-slate-700">{site.remarks || '-'}</p>
      </DetailBlock>
    </div>
  )
}
