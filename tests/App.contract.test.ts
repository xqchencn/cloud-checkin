import { describe, expect, it } from 'vitest'
import { appSource, npmrcSource, stylesSource } from './sources'

describe('App frontend layout and safety contracts', () => {
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
})
