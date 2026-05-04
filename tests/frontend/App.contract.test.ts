import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { apiSiteSource, appChromeSource, appSource, entryAppSource, logCardsSource, npmrcSource, siteDetailDrawerSource, siteDetailTokenListSource, siteListViewSource, stylesSource } from '../sources'

/**
 * App 前端布局和安全合约测试
 * 验证前端应用布局和安全的一致性
 */
describe('App frontend layout and safety contracts', () => {
  it('keeps App.tsx as a small application entry instead of a page implementation dump', () => {
    expect(entryAppSource.split(/\r?\n/).length).toBeLessThanOrEqual(300)
    expect(entryAppSource).toContain('AppExperience')
    expect(entryAppSource).not.toContain('function Manager(')
    expect(entryAppSource).not.toContain('function SiteFormModal(')
    expect(entryAppSource).not.toContain('function SiteDetailDrawer(')
    expect(entryAppSource).not.toContain('function LogsPage(')
    expect(entryAppSource).not.toContain('function SettingsPage(')
  })

  it('keeps frontend implementation files componentized below 300 lines', () => {
    function collectFiles(dir: string): string[] {
      return readdirSync(dir).flatMap(name => {
        const path = join(dir, name)
        return statSync(path).isDirectory() ? collectFiles(path) : [path]
      })
    }
    const oversized = collectFiles('frontend/src')
      .filter(path => /\.(ts|tsx)$/.test(path))
      .filter(path => !path.includes(`${join('frontend', 'src', 'api')}`))
      .map(path => ({ path, lines: readFileSync(path, 'utf8').split(/\r?\n/).length }))
      .filter(item => item.lines > 300)
    expect(oversized).toEqual([])
  })

  it('keeps the desktop site table action column inside the default 1440px layout', () => {
    expect(appSource).toContain('min-w-[980px]')
    expect(appSource).toContain('w-[116px] px-3 py-4 font-medium')
    expect(appSource).toContain('flex justify-end gap-1')
    expect(appSource).not.toContain('min-w-[1060px]')
    expect(appSource).not.toContain('flex min-w-max gap-2')
  })

  it('keeps mobile detail actions and toolbar buttons from squeezing text', () => {
    expect(appSource).toContain('grid grid-cols-2 gap-2 border-b border-line bg-slate-50/60 px-4 py-3 sm:px-5 lg:grid-cols-4')
    expect(appSource).toContain('grid grid-cols-2 gap-2 border-b border-line px-4 py-3 sm:flex sm:flex-wrap sm:px-5')
    expect(appSource).toContain("key: 'overview', label: '总览', icon: <List size={16} />")
    expect(appSource).toContain("key: 'tasks', label: '定时任务日志', icon: <FileText size={16} />")
    expect(appSource).toContain("className={`${tab === item.key ? 'btn btn-primary' : 'btn'} w-full sm:w-auto sm:shrink-0`}")
    expect(appSource).toContain('className="btn w-full sm:ml-auto sm:w-auto sm:shrink-0"')
    expect(appSource).not.toContain('flex gap-2 overflow-x-auto border-b border-line px-4 py-3 sm:px-5')
    expect(appSource).toContain('title="刷新" aria-label="刷新"')
    expect(appSource).toContain('<span className="hidden xl:inline">刷新</span>')
    expect(appSource).toContain('aria-label={`筛选：${filterLabel}`}')
    expect(appSource).toContain('<span className="hidden xl:inline">{filterLabel}</span>')
    expect(appSource).toContain('title="更多操作" aria-label="更多操作"')
    expect(appSource).toContain('<span className="hidden xl:inline">更多</span>')
    expect(appSource).toContain('title="新增站点" aria-label="新增站点"')
    expect(appSource).toContain('<span className="hidden xl:inline">新增站点</span>')
  })

  it('lets site statistic cards use available mobile width instead of forcing one column', () => {
    expect(appSource).toContain('grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]')
    expect(appSource).toContain('gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5')
    expect(appSource).not.toContain('grid grid-cols-1 gap-4 min-[420px]:grid-cols-2')
    expect(appSource).toContain('soft-card min-w-0 p-3 sm:p-5')
    expect(appSource).toContain('h-10 w-10 shrink-0')
    expect(appSource).toContain('text-xl font-bold leading-tight')
    expect(appSource).toContain('text-xs sm:text-sm')
  })

  it('requires confirmation before high-impact batch actions', () => {
    expect(appSource).toContain('ActionConfirmModal')
    expect(appSource).toContain('confirmAction')
    expect(appSource).toContain("title: '批量全部'")
    expect(appSource).toContain("title: '批量查询余额'")
    expect(appSource).toContain("title: '批量签到'")
    expect(appSource).toContain("title: '批量同步 Token'")
  })

  it('makes the import menu item keyboard accessible', () => {
    expect(appSource).toContain('role="button"')
    expect(appSource).toContain('tabIndex={0}')
    expect(appSource).toContain('handleImportKeyDown')
    expect(appSource).toContain("querySelector<HTMLInputElement>('input[type=\"file\"]')")
    expect(appSource).not.toContain('id="import-input"')
  })

  it('annotates password fields for browser password managers', () => {
    expect(appSource).toContain('autoComplete="current-password"')
    expect(appSource).toContain('autoComplete="new-password"')
    expect(appSource).toContain('name="username"')
    expect(appSource).toContain('autoComplete="username"')
    expect(appSource).toContain('value="cloud-checkin"')
    expect(appSource).toContain("autoComplete={item.type === 'secret' ? 'off' : undefined}")
  })

  it('keeps long modal forms usable on mobile by pinning the footer and scrolling the body', () => {
    expect(stylesSource).toContain('max-height: calc(100dvh - 3rem)')
    expect(stylesSource).toContain('overflow-hidden')
    expect(stylesSource).toContain('overflow-y-auto')
    expect(stylesSource).toContain('shrink-0')
  })

  it('keeps project npm config platform-neutral', () => {
    expect(npmrcSource).not.toContain('script-shell=')
    expect(npmrcSource).not.toContain('C:\\Windows\\System32\\cmd.exe')
  })

  it('keeps site detail checkin actions and log layout aligned with checkin support', () => {
    expect(appSource).toContain('function supportsSiteCheckin(site: ApiSite): boolean')
    expect(appSource).toContain('function getCheckinDisabledReason(site: ApiSite): string')
    expect(appSource).toContain("if (!site.auto_checkin) return '自动签到未启用，无法签到'")
    expect(appSource).not.toContain("if (!site.enabled) return '站点未启用，无法签到'")
    expect(appSource).toContain('const checkinDisabledReason = getCheckinDisabledReason(site)')
    expect(appSource).toContain('disabled={Boolean(busyKey) || Boolean(checkinDisabledReason)}')
    expect(appSource).toContain('title={checkinDisabledReason || \'签到\'}')
    expect(appSource).toContain('当前站点类型不支持签到，下方记录为历史签到数据。')
    expect(appSource).toContain('当前站点类型不支持签到，暂无可执行的签到数据。')
    expect(appSource).toContain('CHECKIN_LOG_HEADERS')
    expect(appSource).toContain('TASK_LOG_HEADERS')
    expect(appSource).toContain('CHECKIN_LOG_COLUMNS')
    expect(appSource).toContain('TASK_LOG_COLUMNS')
    expect(siteDetailDrawerSource).toContain("import { LogMobileCards } from '../../components/logs/LogCards'")
    expect(siteDetailDrawerSource).toContain("import { CHECKIN_LOG_COLUMNS, CHECKIN_LOG_HEADERS, TASK_LOG_COLUMNS, TASK_LOG_HEADERS, buildCheckinLogRows, buildTaskLogRows } from '../../components/logs/LogTables'")
    expect(siteDetailDrawerSource).toContain('<LogMobileCards tab="checkin" checkinLogs={checkinLogs} taskLogs={[]} showSiteName={false} />')
    expect(siteDetailDrawerSource).toContain('<LogMobileCards tab="task" checkinLogs={[]} taskLogs={taskLogs} showSiteName={false} />')
    expect(siteDetailDrawerSource).toContain('rows={buildCheckinLogRows(checkinLogs, false)}')
    expect(siteDetailDrawerSource).toContain('rows={buildTaskLogRows(taskLogs, false)}')
    expect(logCardsSource).toContain('showSiteName = true')
    expect(logCardsSource).toContain('grid min-w-0 gap-3 lg:hidden')
    expect(logCardsSource).not.toContain('grid min-w-0 gap-3 md:hidden')
    expect(logCardsSource).toContain('const title = showSiteName ? log.site_name || `#${log.api_site_id ?? \'-\'}` : formatDate(log.checkin_time)')
  })

  it('does not present skipped or already-checked checkin reward and balance as real zero values', () => {
    expect(appSource).toContain('function formatCheckinReward(log: Pick<CheckinLog')
    expect(appSource).toContain("return log.status === 'success' && log.reward_amount != null ? formatMoney(log.reward_amount) : '-'")
    expect(appSource).toContain('function formatCheckinBalance(log: Pick<CheckinLog')
    expect(appSource).toContain("return log.status === 'success' && log.new_balance != null ? formatMoney(log.new_balance) : '-'")
    expect(appSource).toContain('formatCheckinReward(log)')
    expect(appSource).toContain('formatCheckinBalance(log)')
    expect(appSource).not.toContain('formatMoney(log.reward_amount),')
    expect(appSource).not.toContain('formatMoney(log.new_balance),')
    expect(appSource).not.toContain('{formatMoney(log.reward_amount)}')
    expect(appSource).not.toContain('{formatMoney(log.new_balance)}')
  })

  it('keeps detail tables inside the drawer instead of forcing horizontal scrolling', () => {
    expect(siteDetailTokenListSource).toContain('grid gap-3')
    expect(siteDetailTokenListSource).toContain('grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))]')
    expect(siteDetailTokenListSource).not.toContain('lg:grid-cols-2')
    expect(siteDetailTokenListSource).not.toContain('grid gap-3 xl:hidden')
    expect(siteDetailTokenListSource).not.toContain('sm:grid-cols-2')
    expect(appSource).not.toContain('hidden rounded-lg border border-line bg-white xl:block')
    expect(appSource).toContain('hidden rounded-lg border border-line bg-white lg:block')
    expect(appSource).toContain('w-full table-fixed divide-y divide-line text-sm')
    expect(appSource).not.toContain('min-w-[760px] w-full table-fixed divide-y divide-line text-sm')
    expect(appSource).not.toContain('min-w-[1040px] w-full table-fixed divide-y divide-line text-sm')
    expect(appSource).not.toContain('hidden overflow-x-auto rounded-lg border border-line bg-white md:block')
    expect(appSource).not.toContain('hidden overflow-hidden rounded-lg border border-line bg-white md:block')
    expect(siteDetailTokenListSource).not.toContain('<th className="w-[12%] px-3 py-2 font-semibold">名称</th>')
    expect(siteDetailTokenListSource).not.toContain('<th className="w-[11%] px-3 py-2 font-semibold">操作</th>')
  })

  it('keeps the remote Token toolbar readable on mobile and desktop', () => {
    expect(siteDetailTokenListSource).toContain('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between')
    expect(siteDetailTokenListSource).toContain('className="btn btn-primary w-full sm:w-auto sm:shrink-0" disabled={remoteGroupLoading}')
    expect(siteDetailTokenListSource).toContain("{remoteGroupLoading ? '加载分组中...' : '新建远端 Token'}")
    expect(siteDetailTokenListSource).toContain('className="text-sm leading-6 text-slate-500 sm:max-w-2xl"')
    expect(siteDetailTokenListSource).not.toContain('flex flex-wrap items-center justify-between gap-2')
  })

  it('uses a full-screen drawer shell with a right-side panel so detail content is not clipped', () => {
    expect(stylesSource).toContain('@apply fixed inset-0 z-40 flex justify-center bg-slate-950/20 p-0 sm:items-stretch sm:justify-end')
    expect(stylesSource).toContain('.drawer-panel')
    expect(stylesSource).toContain('@apply flex h-full w-full max-w-5xl flex-col bg-white shadow-panel sm:border-l sm:border-line')
    expect(appSource).toContain('<aside className="drawer-shell">')
    expect(appSource).toContain('<div className="drawer-panel">')
    expect(stylesSource).not.toContain('@apply fixed inset-y-0 right-0 z-40 flex w-full max-w-5xl')
  })

  it('preloads remote token groups when the detail drawer opens instead of waiting for the Token tab', () => {
    expect(appSource).toContain("const [remoteGroupOptions, setRemoteGroupOptions] = useState<string[]>(['default'])")
    expect(appSource).toContain('const [remoteGroupLoading, setRemoteGroupLoading] = useState(false)')
    expect(appSource).toContain('const remoteGroupRequestId = useRef(0)')
    expect(appSource).toContain('const loadRemoteGroupsForSite = useCallback(async (siteId: number) => {')
    expect(appSource).toContain("setRemoteGroupOptions(['default'])")
    expect(appSource).toContain('const result = await ApiSiteGetRemoteTokenGroups(siteId)')
    expect(appSource).toContain('if (requestId !== remoteGroupRequestId.current) return')
    expect(appSource).toContain('setRemoteGroupOptions(normalizeRemoteGroupOptions(result.groups))')
    expect(appSource).toContain('if (open && site) void loadRemoteGroupsForSite(site.id)')
    expect(appSource).toContain('remoteGroupOptions={remoteGroupOptions}')
    expect(appSource).toContain('remoteGroupLoading={remoteGroupLoading}')
    expect(appSource).toContain('remoteGroupError={remoteGroupError}')
    expect(siteDetailTokenListSource).toContain('groups={remoteGroupOptions}')
    expect(siteDetailTokenListSource).toContain('ensureGroupOption(groups, null)')
    expect(siteDetailTokenListSource).toContain('loading={remoteGroupLoading}')
    expect(siteDetailTokenListSource).toContain('<select className="field" value={group} onChange={event => setGroup(event.target.value)} disabled={loading && groupOptions.length <= 1}>')
    expect(siteDetailTokenListSource).toContain('{groupOptions.map(value => <option key={value} value={value}>{value}</option>)}')
    expect(siteDetailTokenListSource).not.toContain('void onRefreshRemoteGroups()')
    expect(siteDetailTokenListSource).not.toContain('onRefreshRemoteGroups')
    expect(siteDetailTokenListSource).not.toContain('list={groupListId}')
    expect(siteDetailTokenListSource).not.toContain('<datalist id={groupListId}>')
    expect(appSource).not.toContain('const loadRemoteGroups = useCallback(async () => {')
    expect(appSource).not.toContain('setRemoteGroups({ default: token?.token_group || \'default\' })')
  })

  it('keeps URL aggregation in the top site toolbar instead of under the statistics cards', () => {
    expect(appChromeSource).toContain('urlAggregatedView')
    expect(appChromeSource).toContain('onToggleUrlAggregated')
    expect(appChromeSource).toContain('按 URL 聚合')
    expect(appSource).toContain("const URL_AGGREGATED_VIEW_STORAGE_KEY = 'cloud-checkin:url-aggregated-view'")
    expect(appSource).toContain('function readUrlAggregatedViewPreference(): boolean')
    expect(appSource).toContain('window.localStorage.getItem(URL_AGGREGATED_VIEW_STORAGE_KEY) === \'true\'')
    expect(appSource).toContain('window.localStorage.setItem(URL_AGGREGATED_VIEW_STORAGE_KEY, String(nextValue))')
    expect(appSource).toContain('const [urlAggregatedView, setUrlAggregatedView] = useState(readUrlAggregatedViewPreference)')
    expect(appSource).toContain('function toggleUrlAggregatedView()')
    expect(appSource).toContain('onToggleUrlAggregated={toggleUrlAggregatedView}')
    expect(siteListViewSource).not.toContain('按 URL 聚合')
  })

  it('keeps remote Token detail UI outside the main App file', () => {
    expect(appSource).toContain("import { TokenList } from '../../components/site-detail/TokenList'")
    expect(appSource).not.toContain('function TokenList(')
    expect(appSource).not.toContain('function RemoteTokenModal(')
    expect(appSource).not.toContain('function RemoteTokenDeleteModal(')
    expect(appSource).not.toContain('function TokenKeyValue(')
    expect(siteDetailTokenListSource).toContain('export function TokenList')
  })

  it('keeps token keys, copy action, and token time fields aligned in the card layout', () => {
    expect(siteDetailTokenListSource).toContain('className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-3"')
    expect(siteDetailTokenListSource).toContain('className="flex min-w-0 items-center gap-2"')
    expect(siteDetailTokenListSource).toContain('className="min-w-0 flex-1 truncate rounded-lg border border-line bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700"')
    expect(siteDetailTokenListSource).toContain('className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900"')
    expect(siteDetailTokenListSource).not.toContain('code className="block break-all rounded-lg border border-line bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700"')
    expect(siteDetailTokenListSource).toContain('function TokenTimeValue({ value }: { value: string })')
    expect(siteDetailTokenListSource).toContain('className="block truncate whitespace-nowrap"')
    expect(siteDetailTokenListSource).toContain("['创建时间', <TokenTimeValue value={formatDate(token.created_time)} />]")
    expect(siteDetailTokenListSource).toContain("['访问时间', <TokenTimeValue value={formatDate(token.accessed_time)} />]")
    expect(siteDetailTokenListSource).toContain("['过期时间', <TokenTimeValue value={formatTokenExpiry(token.expired_time)} />]")
  })
})

describe('site detection frontend API contract', () => {
  it('exposes site detection request and response types', () => {
    expect(apiSiteSource).toContain('export interface SiteDetectPayload')
    expect(apiSiteSource).toContain('export interface SiteDetectResult')
    expect(apiSiteSource).toContain('export const ApiSiteDetect')
    expect(apiSiteSource).toContain("apiRequest<SiteDetectResult>('/api/sites/detect'")
  })
})

describe('site form detection UX contract', () => {
  it('adds a detect action that fills only empty or URL-derived fields', () => {
    expect(appSource).toContain('ApiSiteDetect')
    expect(appSource).toContain('detectingSite')
    expect(appSource).toContain('handleDetectSite')
    expect(appSource).toContain('检测站点')
    expect(appSource).toContain('检测来源')
    expect(appSource).toContain('api_type_source')
    expect(appSource).toContain('site_name_source')
    expect(appSource).toContain('url_action')
    expect(appSource).toContain('apiTypeTouched')
    expect(appSource).toContain('setApiTypeTouched(true)')
    expect(appSource).toContain('current.name.trim() ? current.name : result.site_name')
    expect(appSource).toContain("current.url.trim() === result.input_url.trim() ? result.url : current.url")
    expect(appSource).toContain('!apiTypeTouched && !site')
    expect(appSource).toContain('current.checkin_endpoint.trim() ? current.checkin_endpoint : result.default_checkin_endpoint')
  })
})
