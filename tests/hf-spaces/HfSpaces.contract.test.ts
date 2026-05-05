import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  assertCanDeleteHfSpaceTarget,
  buildDefaultKeepaliveUrl,
  buildSpaceOptions,
  keepaliveCreatedTargets,
  keepaliveUpdatedTarget,
  parseHfSpaceInput,
  validateKeepaliveUrl
} from '../../worker/src/services/hf-space-service'
import type { HfSpaceTarget } from '../../worker/src/types'

describe('HF Spaces input and option contracts', () => {
  it('parses usernames, profile URLs, spaces URLs and single Space URLs into the owner username', () => {
    expect(parseHfSpaceInput('cnxqchen')).toEqual({ username: 'cnxqchen', preferredSpaceId: null })
    expect(parseHfSpaceInput('https://huggingface.co/cnxqchen')).toEqual({ username: 'cnxqchen', preferredSpaceId: null })
    expect(parseHfSpaceInput('https://huggingface.co/cnxqchen/spaces')).toEqual({ username: 'cnxqchen', preferredSpaceId: null })
    expect(parseHfSpaceInput('https://huggingface.co/spaces/cnxqchen/g2a')).toEqual({
      username: 'cnxqchen',
      preferredSpaceId: 'cnxqchen/g2a'
    })
    expect(parseHfSpaceInput('https://cnxqchen-ar.hf.space/')).toEqual({
      username: 'cnxqchen',
      preferredSpaceId: 'cnxqchen/ar'
    })
  })

  it('shows every discovered Space while enabling only running and not-yet-added options', () => {
    const options = buildSpaceOptions([
      {
        id: 'cnxqchen/g2a',
        author: 'cnxqchen',
        subdomain: 'cnxqchen-g2a',
        cardData: { title: 'G2a', sdk: 'docker' },
        runtime: {
          stage: 'RUNNING',
          domains: [{ domain: 'cnxqchen-g2a.hf.space', stage: 'READY' }]
        }
      },
      {
        id: 'cnxqchen/metapi',
        author: 'cnxqchen',
        subdomain: 'cnxqchen-metapi',
        cardData: { title: 'Metapi', sdk: 'docker' },
        runtime: {
          stage: 'PAUSED',
          domains: [{ domain: 'cnxqchen-metapi.hf.space', stage: 'READY' }]
        }
      },
      {
        id: 'cnxqchen/self',
        author: 'cnxqchen',
        subdomain: 'cnxqchen-self',
        cardData: { title: 'Self', sdk: 'docker' },
        runtime: {
          stage: 'RUNNING',
          domains: [{ domain: 'cnxqchen-self.hf.space', stage: 'READY' }]
        }
      }
    ], new Set(['cnxqchen/self']))

    expect(options).toMatchObject([
      {
        space_id: 'cnxqchen/g2a',
        title: 'G2a',
        app_url: 'https://cnxqchen-g2a.hf.space',
        default_keepalive_url: 'https://cnxqchen-g2a.hf.space/',
        runtime_stage: 'RUNNING',
        selectable: true,
        disabled_reason: null
      },
      {
        space_id: 'cnxqchen/metapi',
        runtime_stage: 'PAUSED',
        selectable: false,
        disabled_reason: '当前状态 已暂停，只有运行中的 Space 可添加'
      },
      {
        space_id: 'cnxqchen/self',
        runtime_stage: 'RUNNING',
        selectable: false,
        disabled_reason: '已添加'
      }
    ])
  })

  it('validates custom keepalive URLs stay on the same HTTPS origin as the Space base URL', () => {
    expect(validateKeepaliveUrl('https://cnxqchen-g2a.hf.space', '')).toBe('https://cnxqchen-g2a.hf.space/')
    expect(validateKeepaliveUrl('https://cnxqchen-g2a.hf.space', '/health')).toBe('https://cnxqchen-g2a.hf.space/health')
    expect(validateKeepaliveUrl('https://cnxqchen-g2a.hf.space', 'https://cnxqchen-g2a.hf.space/api/ping?source=cloud-checkin')).toBe('https://cnxqchen-g2a.hf.space/api/ping?source=cloud-checkin')
    expect(() => validateKeepaliveUrl('https://cnxqchen-g2a.hf.space', 'https://cnxqchen-self.hf.space/health')).toThrow('保活地址必须与应用地址保持同一域名')
    expect(() => validateKeepaliveUrl('https://cnxqchen-g2a.hf.space', 'http://cnxqchen-g2a.hf.space/health')).toThrow('保活地址必须使用 https')
  })

  it('allows deleting only disabled HF keepalive targets', () => {
    expect(() => assertCanDeleteHfSpaceTarget({ enabled: false })).not.toThrow()
    expect(() => assertCanDeleteHfSpaceTarget({ enabled: true })).toThrow('请先停用该 HF Space 保活目标，再删除')
  })

  it('builds default keepalive URL from runtime domain before subdomain fallback', () => {
    expect(buildDefaultKeepaliveUrl({
      id: 'cnxqchen/cx',
      author: 'cnxqchen',
      subdomain: 'cnxqchen-cx',
      cardData: { title: 'Cx', sdk: 'docker' },
      runtime: { stage: 'RUNNING', domains: [{ domain: 'cnxqchen-cx.hf.space', stage: 'READY' }] }
    })).toEqual({
      appUrl: 'https://cnxqchen-cx.hf.space',
      keepaliveUrl: 'https://cnxqchen-cx.hf.space/'
    })

    expect(buildDefaultKeepaliveUrl({
      id: 'cnxqchen/ar',
      author: 'cnxqchen',
      subdomain: null,
      cardData: { title: 'Ar', sdk: 'docker' },
      runtime: { stage: 'RUNNING', domains: [] }
    })).toEqual({
      appUrl: 'https://cnxqchen-ar.hf.space',
      keepaliveUrl: 'https://cnxqchen-ar.hf.space/'
    })
  })

  it('requests newly created targets immediately and records the keepalive result', async () => {
    const target = {
      id: 101,
      hf_user_id: 7,
      username: 'cnxqchen',
      space_id: 'cnxqchen/g2a',
      space_name: 'g2a',
      title: 'G2a',
      alias: 'G2a',
      base_url: 'https://cnxqchen-g2a.hf.space',
      keepalive_url: 'https://cnxqchen-g2a.hf.space/health',
      runtime_stage: 'RUNNING',
      domain_stage: 'READY',
      enabled: true,
      last_checked_at: null,
      last_status: null,
      last_http_status: null,
      last_latency_ms: null,
      last_error: null,
      created_at: '2026-05-05T00:00:00.000Z',
      updated_at: '2026-05-05T00:00:00.000Z',
      logs: []
    } satisfies HfSpaceTarget
    const requestedUrls: string[] = []
    const recordedResults: Array<{ target_id: number; status: string; http_status: number | null }> = []

    const results = await keepaliveCreatedTargets(
      [target],
      async url => {
        requestedUrls.push(url)
        return {
          status: 'failed',
          http_status: 404,
          latency_ms: 18,
          response_excerpt: 'not found',
          error: 'HTTP 404'
        }
      },
      async (recordedTarget, result) => {
        recordedResults.push({
          target_id: recordedTarget.id,
          status: result.status,
          http_status: result.http_status
        })
      }
    )

    expect(requestedUrls).toEqual(['https://cnxqchen-g2a.hf.space/health'])
    expect(recordedResults).toEqual([{ target_id: 101, status: 'failed', http_status: 404 }])
    expect(results).toEqual([expect.objectContaining({ status: 'failed', http_status: 404 })])
  })

  it('requests an updated target immediately only when the keepalive URL changes', async () => {
    const target = {
      id: 102,
      hf_user_id: 7,
      username: 'cnxqchen',
      space_id: 'cnxqchen/g2a',
      space_name: 'g2a',
      title: 'G2a',
      alias: 'G2a',
      base_url: 'https://cnxqchen-g2a.hf.space',
      keepalive_url: 'https://cnxqchen-g2a.hf.space/new-health',
      runtime_stage: 'RUNNING',
      domain_stage: 'READY',
      enabled: true,
      last_checked_at: null,
      last_status: null,
      last_http_status: null,
      last_latency_ms: null,
      last_error: null,
      created_at: '2026-05-05T00:00:00.000Z',
      updated_at: '2026-05-05T00:00:00.000Z',
      logs: []
    } satisfies HfSpaceTarget
    const requestedUrls: string[] = []
    const recordedResults: Array<{ target_id: number; status: string; http_status: number | null }> = []

    const changedResult = await keepaliveUpdatedTarget(
      'https://cnxqchen-g2a.hf.space/old-health',
      target,
      async url => {
        requestedUrls.push(url)
        return {
          status: 'success',
          http_status: 200,
          latency_ms: 16,
          response_excerpt: 'ok',
          error: null
        }
      },
      async (recordedTarget, result) => {
        recordedResults.push({
          target_id: recordedTarget.id,
          status: result.status,
          http_status: result.http_status
        })
      }
    )
    const unchangedResult = await keepaliveUpdatedTarget(
      target.keepalive_url,
      target,
      async url => {
        requestedUrls.push(url)
        return {
          status: 'failed',
          http_status: 500,
          latency_ms: 10,
          response_excerpt: null,
          error: 'should not run'
        }
      },
      async (recordedTarget, result) => {
        recordedResults.push({
          target_id: recordedTarget.id,
          status: result.status,
          http_status: result.http_status
        })
      }
    )

    expect(requestedUrls).toEqual(['https://cnxqchen-g2a.hf.space/new-health'])
    expect(recordedResults).toEqual([{ target_id: 102, status: 'success', http_status: 200 }])
    expect(changedResult).toEqual(expect.objectContaining({ status: 'success', http_status: 200 }))
    expect(unchangedResult).toBeNull()
  })

})

describe('HF Spaces implementation source contracts', () => {
  const migrationSource = readFileSync('migrations/0002_hf_space_keepalive.sql', 'utf8')
  const indexSource = readFileSync('worker/src/index.ts', 'utf8')
  const routeSource = readFileSync('worker/src/routes/hf-spaces.ts', 'utf8')
  const serviceSource = readFileSync('worker/src/services/hf-space-service.ts', 'utf8')
  const repositorySource = readFileSync('worker/src/repositories/hf-space-repository.ts', 'utf8')
  const schedulerSource = readFileSync('worker/src/services/scheduler-service.ts', 'utf8')
  const wranglerSource = readFileSync('wrangler.toml', 'utf8')
  const wranglerCronSource = readFileSync('shared/generated/wrangler-crons.ts', 'utf8')
  const pageTypesSource = readFileSync('frontend/src/shared/types.ts', 'utf8')
  const siteManagerSource = readFileSync('frontend/src/pages/SiteManager.tsx', 'utf8')
  const appChromeSource = readFileSync('frontend/src/features/layout/AppChrome.tsx', 'utf8')
  const apiSource = readFileSync('frontend/src/api/apiHfSpaces.ts', 'utf8')
  const pageSource = readFileSync('frontend/src/features/hf-spaces/HfSpacesPage.tsx', 'utf8')
  const cardsSource = readFileSync('frontend/src/features/hf-spaces/HfSpaceCards.tsx', 'utf8')
  const editDialogPath = 'frontend/src/features/hf-spaces/HfSpaceEditDialog.tsx'
  const editDialogSource = existsSync(editDialogPath) ? readFileSync(editDialogPath, 'utf8') : ''
  const statsSource = readFileSync('frontend/src/features/hf-spaces/HfSpacesSummaryCards.tsx', 'utf8')
  const topBarPath = 'frontend/src/features/hf-spaces/HfSpacesTopBar.tsx'
  const topBarSource = existsSync(topBarPath) ? readFileSync(topBarPath, 'utf8') : ''
  const mobileBarPath = 'frontend/src/features/hf-spaces/HfSpacesMobileBar.tsx'
  const mobileBarSource = existsSync(mobileBarPath) ? readFileSync(mobileBarPath, 'utf8') : ''
  const preferencesPath = 'frontend/src/features/hf-spaces/hfSpacesPreferences.ts'
  const preferencesSource = existsSync(preferencesPath) ? readFileSync(preferencesPath, 'utf8') : ''
  const headerActionsPath = 'frontend/src/features/hf-spaces/HfSpacesHeaderActions.tsx'
  const headerActionsSource = existsSync(headerActionsPath) ? readFileSync(headerActionsPath, 'utf8') : ''
  const labelsPath = 'frontend/src/features/hf-spaces/hfSpacesLabels.ts'
  const labelsSource = existsSync(labelsPath) ? readFileSync(labelsPath, 'utf8') : ''
  const toolbarSource = readFileSync('frontend/src/features/hf-spaces/HfSpacesToolbar.tsx', 'utf8')
  const previewPanelSource = readFileSync('frontend/src/features/hf-spaces/HfSpacePreviewPanel.tsx', 'utf8')
  const logsPageSource = readFileSync('frontend/src/features/logs/LogsPage.tsx', 'utf8')
  const stylesSource = readFileSync('frontend/src/styles.css', 'utf8')

  it('creates dedicated D1 tables and indexes for HF users, targets and keepalive logs', () => {
    expect(migrationSource).toContain('CREATE TABLE IF NOT EXISTS hf_space_users')
    expect(migrationSource).toContain('CREATE TABLE IF NOT EXISTS hf_space_targets')
    expect(migrationSource).toContain('CREATE TABLE IF NOT EXISTS hf_space_keepalive_logs')
    expect(migrationSource).toContain('alias TEXT NOT NULL')
    expect(migrationSource).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_hf_space_users_username')
    expect(migrationSource).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_hf_space_targets_space_id')
    expect(migrationSource).toContain('CREATE INDEX IF NOT EXISTS idx_hf_space_keepalive_logs_target_created')
  })

  it('mounts HF routes and scheduled keepalive without overloading existing site routes', () => {
    expect(indexSource).toContain("url.pathname.startsWith('/api/hf-spaces')")
    expect(indexSource).toContain('handleHfSpaceRoutes')
    expect(routeSource).toContain("request.method === 'DELETE'")
    expect(routeSource).toContain('{ keepalive_url?: string; enabled?: boolean; alias?: string }')
    expect(routeSource).toContain('deleteTarget')
    expect(serviceSource).toContain('assertCanDeleteHfSpaceTarget')
    expect(serviceSource).toContain('function normalizeHfSpaceAlias')
    expect(serviceSource).toContain('const createdTargets = await repo.createTargets')
    expect(serviceSource).toContain('alias: normalizeHfSpaceAlias(option.title, option.title || option.space_name)')
    expect(serviceSource).toContain('await keepaliveCreatedTargets(createdTargets')
    expect(repositorySource).toContain('DELETE FROM hf_space_targets WHERE id = ?')
    expect(repositorySource).toContain('listRecentLogsForTargets')
    expect(repositorySource).toContain("WHERE l.target_id IN")
    expect(repositorySource).not.toContain('pragma_table_info')
    expect(repositorySource).not.toContain('ALTER TABLE hf_space_targets')
    expect(repositorySource).not.toContain('ensureSchemaReady')
    expect(serviceSource).toContain('const sinceIso = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()')
    expect(serviceSource).toContain('logs: logsByTarget.get(target.id) || []')
    expect(serviceSource).toContain('await keepaliveUpdatedTarget(previousKeepaliveUrl, updatedTarget')
    expect(schedulerSource).toContain('runHfSpaceKeepaliveCycle')
    expect(schedulerSource).toContain('WRANGLER_HF_KEEPALIVE_CRON')
    expect(schedulerSource).toContain('deleteOlderHfSpaceKeepaliveLogs')
    expect(wranglerSource).toContain('0 */4 * * *')
    expect(wranglerCronSource).toContain('WRANGLER_HF_KEEPALIVE_CRON = "0 */4 * * *"')
  })

  it('adds an HF card page with all-Spaces and by-user views', () => {
    expect(pageTypesSource).toContain("export type PageKey = 'sites' | 'logs' | 'settings' | 'hf-spaces'")
    expect(siteManagerSource).toContain("key: 'hf-spaces'")
    expect(siteManagerSource).toContain('HF 保活')
    expect(siteManagerSource).toContain('<HfSpacesPage />')
    expect(appChromeSource).toContain('hf-spaces-desktop-header-actions')
    expect(apiSource).toContain("apiRequest<HfSpacePreview>('/api/hf-spaces/preview'")
    expect(apiSource).toContain('/** Space 别名，默认等于原项目名 */')
    expect(apiSource).toContain('alias: string')
    expect(apiSource).toContain("payload: { keepalive_url?: string; enabled?: boolean; alias?: string }")
    expect(pageSource).toContain('createPortal')
    expect(pageSource).toContain('<HfSpacesHeaderActions')
    expect(pageSource).toContain('const desktopHeaderControls')
    expect(pageSource).toContain('variant="header"')
    expect(pageSource).toContain('<HfSpacesMobileBar')
    expect(mobileBarSource).toContain('className="flex items-start gap-2 md:hidden"')
    expect(pageSource).toContain('className="hidden md:block xl:hidden"')
    expect(pageSource).not.toContain('flex justify-end md:hidden')
    expect(pageSource).toContain('<HfSpacesTopBar')
    expect(headerActionsSource).toContain('export function HfSpacesHeaderActions')
    expect(headerActionsSource).toContain('新增HF')
    expect(headerActionsSource).toContain('更多')
    expect(headerActionsSource).toContain('全部 Spaces')
    expect(headerActionsSource).toContain('按用户查看')
    expect(headerActionsSource).toContain('批量启用')
    expect(topBarSource).toContain('export function HfSpacesTopBar')
    expect(topBarSource).toContain('搜索 Space 名称或地址')
    expect(topBarSource).toContain("variant = 'bar'")
    expect(topBarSource).toContain("variant === 'header'")
    expect(topBarSource).not.toContain('新增 HF 用户')
    expect(topBarSource).not.toContain('批量启用')
    expect(topBarSource).not.toContain('全部 Spaces')
    expect(topBarSource).not.toContain('按用户查看')
    expect(topBarSource).toContain('xl:flex-row')
    expect(pageSource).not.toContain('rounded-lg border border-line bg-white/90 p-5 shadow-panel')
    expect(pageSource).not.toContain('rounded-lg border border-line bg-white/85 p-4 shadow-sm')
    expect(pageSource).not.toContain('<h2 className="text-2xl font-bold text-slate-950">HF 保活</h2>')
    expect(pageSource).toContain('<HfSpacesSummaryCards targets={targets} />')
    expect(pageSource).toContain('filteredTargets')
    expect(pageSource).toContain('searchQuery')
    expect(pageSource).toContain('statusFilter')
    expect(pageSource).toContain('userFilter')
    expect(preferencesSource).toContain("const HF_SPACES_VIEW_MODE_STORAGE_KEY = 'cloud-checkin:hf-spaces-view-mode'")
    expect(preferencesSource).toContain("const HF_SPACES_LAYOUT_MODE_STORAGE_KEY = 'cloud-checkin:hf-spaces-layout-mode'")
    expect(preferencesSource).toContain('export function readHfSpaceViewModePreference(): HfSpaceViewMode')
    expect(preferencesSource).toContain('export function readHfSpaceLayoutModePreference(): HfSpaceLayoutMode')
    expect(preferencesSource).toContain('window.localStorage.getItem(HF_SPACES_VIEW_MODE_STORAGE_KEY)')
    expect(preferencesSource).toContain('window.localStorage.getItem(HF_SPACES_LAYOUT_MODE_STORAGE_KEY)')
    expect(preferencesSource).toContain('window.localStorage.setItem(HF_SPACES_VIEW_MODE_STORAGE_KEY, nextValue)')
    expect(preferencesSource).toContain('window.localStorage.setItem(HF_SPACES_LAYOUT_MODE_STORAGE_KEY, nextValue)')
    expect(pageSource).toContain("from './hfSpacesPreferences'")
    expect(pageSource).toContain('const [viewMode, setViewMode] = useState<HfSpaceViewMode>(readHfSpaceViewModePreference)')
    expect(pageSource).toContain('const [layoutMode, setLayoutMode] = useState<HfSpaceLayoutMode>(readHfSpaceLayoutModePreference)')
    expect(pageSource).toContain('function changeViewMode(nextValue: HfSpaceViewMode)')
    expect(pageSource).toContain('function changeLayoutMode(nextValue: HfSpaceLayoutMode)')
    expect(pageSource).toContain('onViewModeChange={changeViewMode}')
    expect(pageSource).toContain('onLayoutModeChange: changeLayoutMode')
    expect(statsSource).toContain('总 Spaces')
    expect(statsSource).toContain('运行中')
    expect(statsSource).toContain('已暂停')
    expect(statsSource).toContain('今日请求')
    expect(statsSource).toContain('平均响应时间')
    expect(statsSource).toContain('成功率')
    expect(statsSource).toContain('grid grid-cols-2')
    expect(toolbarSource).toContain('搜索 Space 名称或地址')
    expect(toolbarSource).toContain('全部状态')
    expect(toolbarSource).toContain('全部用户')
    expect(toolbarSource).toContain('LayoutGrid')
    expect(toolbarSource).toContain('List')
    expect(headerActionsSource).toContain('新增HF')
    expect(headerActionsSource).not.toContain('新增 HF 用户')
    expect(previewPanelSource).toContain('disabled_reason')
    expect(previewPanelSource).toContain('保存前可以')
    expect(previewPanelSource).toContain('size="wide"')
    expect(previewPanelSource).toContain('const orderedSpaces =')
    expect(previewPanelSource).toContain('Number(right.selectable) - Number(left.selectable)')
    expect(previewPanelSource).toContain('space-option-list')
    expect(previewPanelSource).toContain('md:grid-cols-2')
    expect(previewPanelSource).toContain('hf-space-card')
    expect(previewPanelSource).toContain('SpaceOptionStatusMeta')
    expect(previewPanelSource).toContain('buildAvatarLabel')
    expect(previewPanelSource).toContain('LetterAvatar')
    expect(previewPanelSource).toContain('formatRuntimeStage(space.runtime_stage)')
    expect(previewPanelSource).toContain('runtimeStageTone(space.runtime_stage)')
    expect(previewPanelSource).toContain('formatDomainStage(space.domain_stage)')
    expect(previewPanelSource).not.toContain('ToneBadge tone={runtimeStageTone(space.runtime_stage)}')
    expect(previewPanelSource).toContain('title={!space.selectable && space.disabled_reason ?')
    expect(previewPanelSource).not.toContain('不可选择：{space.disabled_reason}')
    expect(previewPanelSource).toContain('label="运行态"')
    expect(previewPanelSource).toContain('label="域名状态"')
    expect(previewPanelSource).toContain('label="应用地址"')
    expect(cardsSource).toContain('xl:grid-cols-3')
    expect(cardsSource).toContain('hf-space-card')
    expect(cardsSource).toContain('SpaceAvatar')
    expect(cardsSource).toContain('SpaceHeading')
    expect(cardsSource).toContain('target.alias')
    expect(cardsSource).toContain('buildAvatarLabel(target.alias || target.title || target.space_name || target.space_id || \'?\')')
    expect(cardsSource).toContain('formatRuntimeStage(target.runtime_stage)')
    expect(cardsSource).toContain('SpaceActionBar')
    expect(cardsSource).toContain('SpaceTargetListItem')
    expect(cardsSource).toContain('CompactUrlText')
    expect(cardsSource).toContain('LetterAvatar')
    expect(cardsSource).not.toContain('from-blue-500 to-blue-700')
    expect(cardsSource).toContain("layoutMode === 'list'")
    expect(cardsSource).toContain('HfSpaceEditDialog')
    expect(editDialogSource).toContain('export function HfSpaceEditDialog')
    expect(editDialogSource).toContain('DialogCard')
    expect(editDialogSource).toContain('ModalShell')
    expect(editDialogSource).toContain('size="lg"')
    expect(editDialogSource).toContain('autoFocus')
    expect(editDialogSource).toContain('formatRuntimeStage(target.runtime_stage)')
    expect(editDialogSource).toContain('别名')
    expect(editDialogSource).toContain('originalTitle')
    expect(editDialogSource).toContain('保存别名与地址')
    expect(editDialogSource).toContain('alias.trim()')
    expect(cardsSource).toContain('label="保活地址"')
    expect(cardsSource).toContain('md:grid-cols-2')
    expect(cardsSource).toContain('SpaceStatusMeta')
    expect(cardsSource).not.toContain('OwnerMeta')
    expect(cardsSource).not.toContain('SpaceHealthIcon')
    expect(cardsSource).not.toContain('所属用户')
    expect(cardsSource).not.toContain('最近成功')
    expect(cardsSource).toContain("target.enabled ? 'info' : 'danger'")
    expect(cardsSource).toContain('toggleClass')
    expect(cardsSource).toContain("? 'border-emerald-100 bg-emerald-50 text-emerald-600")
    expect(cardsSource).toContain(": 'border-red-100 bg-red-50 text-red-600")
    expect(cardsSource).not.toContain('rounded-full bg-slate-100')
    expect(cardsSource).not.toContain('field mt-2 h-10 bg-white')
    expect(cardsSource).not.toContain('break-all font-mono')
    expect(cardsSource).toContain('truncate font-mono')
    expect(previewPanelSource).not.toContain('break-all font-mono')
    expect(previewPanelSource).toContain('truncate font-mono')
    expect(stylesSource).toContain('whitespace-nowrap')
    expect(cardsSource).not.toContain('<SpaceHealthIcon status={target.last_status} />')
    expect(cardsSource).toContain('grid grid-cols-[auto,minmax(0,1fr),auto]')
    expect(headerActionsSource).toContain('批量启用')
    expect(pageSource).not.toContain('批量停用')
    expect(pageSource).not.toContain('batchSetEnabled(false)')
    expect(pageSource).not.toContain('<div className="flex flex-wrap gap-2">\n        <button className="btn" disabled={loading || !targets.length} onClick={() => void batchSetEnabled(true)}>')
    expect(pageSource).toContain('deleteTarget')
    expect(pageSource).toContain('updateTargetMeta')
    expect(cardsSource).toContain('编辑地址')
    expect(cardsSource).toContain('删除')
    expect(apiSource).toContain('logs: HfSpaceKeepaliveLog[]')
    expect(cardsSource).toContain('KeepaliveHistoryStrip')
    expect(cardsSource).toContain('最近 48 小时')
    expect(cardsSource).toContain('title={slot.tooltip}')
    expect(cardsSource).toContain('target.logs || []')
    expect(cardsSource).not.toContain('label="HTTP"')
    expect(cardsSource).not.toContain('label="耗时"')
    expect(cardsSource).not.toContain('label="最近请求"')
    expect(cardsSource).not.toContain('label="域名"')
    expect(cardsSource).not.toContain('HTTP ${log.http_status')
    expect(cardsSource).not.toContain('target.last_error')
    expect(apiSource).toContain('ApiHfSpacesDeleteTarget')
    expect(logsPageSource).toContain('HF 保活日志')
    expect(pageSource).not.toContain('HF 保活日志')
    expect(labelsSource).toContain("if (stage === 'READY') return '可访问'")
    expect(labelsSource).toContain("if (stage === 'RUNNING') return '运行中'")
    expect(labelsSource).toContain("if (stage === 'PAUSED') return '已暂停'")
  })
})
