import { describe, expect, it } from 'vitest'
import { appSource, siteBatchActionsSource, siteCardsSource, siteDetailTokenListSource as tokenListSource, siteManagerSource } from '../sources'

/**
 * 采用前端完成度合约测试
 * 验证前端采用功能的完整性和一致性
 */
describe('adoption frontend completion contracts', () => {
  const remoteEditText = ['编辑', '远端'].join('')

  it('keeps same-url multi-account management and site detection visible', () => {
    expect(appSource).toContain('ApiSiteDetect')
    expect(appSource).toContain('检测站点')
    expect(appSource).toContain('urlAggregatedView')
    expect(appSource).toContain('visibleUrlGroups')
    expect(appSource).toContain('按 URL 聚合')
    expect(appSource).not.toMatch(/同站.{0,2}分组/)
    expect(appSource).toContain('account_label')
    expect(appSource).toContain('sort_order')
    expect(appSource).toContain('const key = site.url')
    expect(appSource).toContain("type: 'url-group'")
    expect(appSource).toContain('colSpan={7}')
    expect(appSource).not.toContain('site_group_key')
    expect(appSource).not.toContain('ApiSiteClone')
    expect(appSource).not.toContain('站点已克隆')
  })

  it('exposes remote token mutation actions as site-management operations', () => {
    expect(tokenListSource).toContain('ApiSiteCreateRemoteToken')
    expect(tokenListSource).toContain('ApiSiteDeleteRemoteToken')
    expect(appSource).toContain('ApiSiteGetRemoteTokenGroups')
    expect(tokenListSource).toContain('新建远端 Token')
    expect(tokenListSource).toContain('删除远端')
    expect(tokenListSource).not.toContain('ApiSiteUpdateRemoteToken')
    expect(tokenListSource).not.toContain(remoteEditText)
    expect(tokenListSource).toContain('groups={remoteGroupOptions}')
    expect(tokenListSource).toContain('TokenKeyValue')
    expect(tokenListSource).toContain('grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))]')
  })

  it('renders only current site-management tabs and direct batch execution', () => {
    expect(appSource).toContain("useState<'overview' | 'tokens' | 'models' | 'checkin' | 'tasks'>")
    expect(appSource).toContain("type LogTab = 'checkin' | 'task' | 'hf'")
    expect(appSource).toContain('HF 保活日志')
    expect(appSource).toContain('runDirectBatch')
    expect(appSource).toContain('summarizeBatchOperation')
    expect(siteBatchActionsSource).toContain('ApiSiteRefreshBalance(site.id)')
    expect(siteBatchActionsSource).toContain('ApiSiteCheckin(site.id)')
    expect(siteBatchActionsSource).toContain('ApiSiteSyncTokens(site.id)')
    expect(siteBatchActionsSource).not.toContain('ApiSiteBatchRefreshBalance(targets.map(site => site.id))')
    expect(siteBatchActionsSource).not.toContain('ApiSiteBatchCheckin(targets.map(site => site.id))')
    expect(siteBatchActionsSource).not.toContain('ApiSiteBatchSyncTokens(targets.map(site => site.id))')
  })

  it('keeps direct batch actions visible with a real progress panel', () => {
    expect(siteManagerSource).toContain('const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null)')
    expect(siteManagerSource).toContain('useSiteBatchActions({ sites, load, setBusyKey, setError, setBatchProgress })')
    expect(siteManagerSource).toContain('{batchProgress ? <BatchProgressPanel progress={batchProgress} /> : null}')
    expect(siteBatchActionsSource).toContain('setBatchProgress: Dispatch<SetStateAction<BatchProgress | null>>')
    expect(siteBatchActionsSource).toContain('async function runProgressItems')
    expect(siteBatchActionsSource).toContain("phase: '正在执行'")
    expect(siteBatchActionsSource).toContain('current: startCurrent + index + 1')
    expect(siteBatchActionsSource).not.toContain('function updateProgressFromResult')
    expect(siteCardsSource).toContain('role="progressbar"')
    expect(siteCardsSource).toContain('aria-valuenow={percent}')
    expect(siteCardsSource).not.toContain('bg-slate-950')
    expect(siteCardsSource).not.toContain('bg-black')
  })

  it('does not expose features that belong to proxy-router management', () => {
    for (const text of [
      'ApiTasks(params)',
      '后台任务',
      'ApiSiteGetEndpoints',
      'EndpointPoolEditor',
      '端点池',
      'ApiSiteGetDisabledModels',
      'DisabledModelsEditor',
      '禁用模型',
      'ApiSiteRefreshHealth',
      'ApiSiteVerifyAuth',
      '刷新健康',
      '验证鉴权',
      'ApiTaskCancel',
      '后台任务已创建',
      'task_id',
    ]) {
      expect(appSource).not.toContain(text)
    }
  })

  it('shows credential fields according to the selected auth method', () => {
    expect(appSource).toContain("form.auth_method === 'token'")
    expect(appSource).toContain('访问 Token')
    expect(appSource).toContain("form.auth_method === 'sessions'")
    expect(appSource).toContain('Sessions / Cookie')
    expect(appSource).toContain("form.auth_method === 'password'")
    expect(appSource).toContain('登录用户名')
    expect(appSource).toContain('登录密码')
    expect(appSource).not.toContain('__CLOUD_CHECKIN_SECRET_MASKED__')
    expect(appSource).not.toContain('CREDENTIAL_SECRET')
  })
})
