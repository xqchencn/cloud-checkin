import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'

const appSource = readFileSync('frontend/src/App.tsx', 'utf8')
const apiSiteSource = readFileSync('frontend/src/api/apiSite.ts', 'utf8')
const stylesSource = readFileSync('frontend/src/styles.css', 'utf8')
const viteConfigSource = readFileSync('frontend/vite.config.ts', 'utf8')
const mainSource = readFileSync('frontend/src/main.tsx', 'utf8')
const toastSource = existsSync('frontend/src/toast.tsx') ? readFileSync('frontend/src/toast.tsx', 'utf8') : ''
const packageSource = readFileSync('package.json', 'utf8')
const readmeSource = readFileSync('README.md', 'utf8')
const localScheduledDevSource = readFileSync('scripts/local-scheduled-dev.mjs', 'utf8')
const checkinLogRepositorySource = readFileSync('worker/src/repositories/checkin-log-repository.ts', 'utf8')
const taskLogRepositorySource = readFileSync('worker/src/repositories/task-log-repository.ts', 'utf8')
const schedulerServiceSource = readFileSync('worker/src/services/scheduler-service.ts', 'utf8')

describe('App UI safety and layout contracts', () => {
  it('keeps the desktop site table action column inside the default 1440px layout', () => {
    expect(appSource).toContain('min-w-[980px]')
    expect(appSource).toContain('w-[116px] px-3 py-4 font-medium')
    expect(appSource).toContain('flex justify-end gap-1')
    expect(appSource).not.toContain('min-w-[1060px]')
    expect(appSource).not.toContain('flex min-w-max gap-2')
  })

  it('keeps mobile detail actions and toolbar buttons from squeezing text', () => {
    expect(appSource).toContain('grid grid-cols-2 gap-2 border-b border-line bg-slate-50/60')
    expect(appSource).toContain('grid grid-cols-6 gap-2 sm:flex sm:flex-wrap')
    expect(appSource).toContain("key: 'overview', label: '总览', icon: <List size={16} />")
    expect(appSource).toContain("key: 'tasks', label: '定时任务日志', icon: <FileText size={16} />")
    expect(appSource).toContain("className={`${tab === item.key ? 'btn btn-primary' : 'btn'} col-span-2 sm:col-auto`}")
    expect(appSource).toContain('className="btn col-span-2 sm:ml-auto sm:w-auto"')
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
    const npmrc = existsSync('.npmrc') ? readFileSync('.npmrc', 'utf8') : ''
    expect(npmrc).not.toContain('script-shell=')
    expect(npmrc).not.toContain('C:\\Windows\\System32\\cmd.exe')
  })

  it('labels scheduled task logs separately from existing manual actions and keeps task logs paginated', () => {
    expect(appSource).toContain('定时任务日志')
    expect(appSource).not.toContain('执行定时任务')
    expect(appSource).not.toContain('RunTasksNow')
    expect(apiSiteSource).not.toContain('/api/tasks/run-now')
    expect(appSource).toContain('taskData.logs.map')
    expect(appSource).toContain('ApiTaskLogs(params)')
    expect(appSource).toContain('共 {data.total} 条，每页 {pageSize} 条')
    expect(appSource).not.toContain("useState<{ tab: 'checkin' | 'task'; text: string } | null>(null)")
    expect(appSource).not.toContain('message?.tab === tab')
  })

  it('uses global toast notifications instead of page-scoped success banners', () => {
    expect(toastSource).toContain('export function ToastProvider')
    expect(toastSource).toContain('export function useToast')
    expect(toastSource).toContain('window.setTimeout')
    expect(toastSource).toContain('fixed right-4 top-4')
    expect(mainSource).toContain('<ToastProvider>')
    expect(appSource).toContain('const toast = useToast()')
    expect(appSource).not.toContain('border border-emerald-100 bg-emerald-50')
  })

  it('renders long and JSON log messages as readable summaries without dumping raw dictionaries by default', () => {
    expect(appSource).toContain('JsonMessagePreview')
    expect(appSource).toContain('formatStructuredMessage(raw)')
    expect(appSource).toContain('summary className="flex min-w-0 cursor-pointer list-none items-center gap-1')
    expect(appSource).toContain('inline-flex h-4')
    expect(appSource).toContain('>JSON</span>')
    expect(appSource).not.toContain('查看原始 JSON')
    expect(appSource).toContain("if (typeof value === 'object') return '已返回数据'")
    expect(appSource).toContain('formatCheckinType(log.checkin_type)')
    expect(appSource).toContain('formatLogStatus(log.status)')
    expect(appSource).toContain('soft-card min-w-0 p-4')
    expect(appSource).toContain('truncate')
    expect(appSource).not.toContain('line-clamp-1')
    expect(appSource).toContain('whitespace-pre-wrap break-words')
    expect(appSource).toContain('JSON.stringify(parsed, null, 2)')
    expect(appSource).toContain('<pre')
    expect(schedulerServiceSource).not.toContain('JSON.stringify(result).slice(0, 500)')
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
    expect(appSource).toContain('const DETAIL_CHECKIN_LOG_COLUMNS')
    expect(appSource).toContain('const DETAIL_TASK_LOG_COLUMNS')
    expect(appSource).toContain('w-[8%]')
    expect(appSource).toContain('w-[32%]')
    expect(appSource).toContain('w-[42%]')
    expect(appSource).toContain('ToneBadge tone={logStatusTone(log.status)}')
    expect(appSource).toContain('ToneBadge tone={taskStatusTone(log.status)}')
    expect(appSource).toContain('columnClassNames={DETAIL_CHECKIN_LOG_COLUMNS}')
    expect(appSource).toContain('columnClassNames={DETAIL_TASK_LOG_COLUMNS}')
  })

  it('runs local scheduled triggers automatically from npm run dev', () => {
    expect(existsSync('scripts/local-scheduled-dev.mjs')).toBe(true)
    expect(packageSource).toContain('"dev": "node scripts/local-scheduled-dev.mjs"')
    expect(localScheduledDevSource).toContain('runDueScheduledTriggers(baseUrl, crons, lastTriggered)')
    expect(localScheduledDevSource).toContain('scheduled trigger sent')
    expect(localScheduledDevSource).toContain('local scheduled simulator ready')
    expect(localScheduledDevSource).toContain('FETCH_TIMEOUT_MS')
    expect(localScheduledDevSource).toContain('SERVER_READY_TIMEOUT_MS')
    expect(readmeSource).toContain('本地 dev 会按 `wrangler.toml` 自动模拟 scheduled 事件')
    expect(readmeSource).not.toContain('本地不会按 `wrangler.toml` 的时间自动触发 Cron')
  })

  it('keeps local frontend and worker ports reachable on Windows loopback', () => {
    expect(viteConfigSource).toContain("host: '127.0.0.1'")
    expect(viteConfigSource).toContain("'http://127.0.0.1:8787'")
  })

  it('orders checkin and scheduled task logs newest first with deterministic ties', () => {
    expect(checkinLogRepositorySource).toContain('ORDER BY datetime(l.checkin_time) DESC, l.id DESC')
    expect(taskLogRepositorySource).toContain('ORDER BY datetime(exec_time) DESC, id DESC')
  })
})
