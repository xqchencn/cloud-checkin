import { existsSync, readFileSync } from 'node:fs'

/**
 * 读取文件内容，如果文件不存在则返回空字符串
 * @param path - 文件路径
 * @returns 文件内容或空字符串
 */
function readIfExists(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

/**
 * 入口应用源代码
 */
export const entryAppSource = readFileSync('frontend/src/App.tsx', 'utf8')
/**
 * 应用体验源代码
 */
export const appExperienceSource = readIfExists('frontend/src/app/AppExperience.tsx')
/**
 * 站点管理器源代码
 */
export const siteManagerSource = readIfExists('frontend/src/pages/SiteManager.tsx')
/**
 * 应用 Chrome 源代码
 */
export const appChromeSource = readIfExists('frontend/src/features/layout/AppChrome.tsx')
/**
 * 站点列表视图源代码
 */
export const siteListViewSource = readIfExists('frontend/src/features/site/SiteListView.tsx')
/**
 * 站点菜单源代码
 */
export const siteMenusSource = readIfExists('frontend/src/features/site/SiteMenus.tsx')
/**
 * 站点卡片源代码
 */
export const siteCardsSource = readIfExists('frontend/src/features/site/SiteCards.tsx')
/**
 * 站点管理模态框源代码
 */
export const siteManagerModalsSource = readIfExists('frontend/src/features/site/SiteManagerModals.tsx')
/**
 * 站点表单模态框源代码
 */
export const siteFormModalSource = readIfExists('frontend/src/features/site/SiteFormModal.tsx')
/**
 * 站点详情抽屉源代码
 */
export const siteDetailDrawerSource = readIfExists('frontend/src/features/site/SiteDetailDrawer.tsx')
/**
 * 站点批量操作源代码
 */
export const siteBatchActionsSource = readIfExists('frontend/src/features/site/useSiteBatchActions.ts')
/**
 * 可见站点行源代码
 */
export const visibleSiteRowsSource = readIfExists('frontend/src/features/site/useVisibleSiteRows.ts')
/**
 * 日志页面源代码
 */
export const logsPageSource = readIfExists('frontend/src/features/logs/LogsPage.tsx')
/**
 * 日志移动卡片源代码
 */
export const logMobileCardsSource = readIfExists('frontend/src/features/logs/LogMobileCards.tsx')
/**
 * 日志卡片源代码
 */
export const logCardsSource = readIfExists('frontend/src/components/logs/LogCards.tsx')
/**
 * 日志表格源代码
 */
export const logTableSource = readIfExists('frontend/src/components/logs/LogTables.tsx')
/**
 * 设置页面源代码
 */
export const settingsPageSource = readIfExists('frontend/src/features/settings/SettingsPage.tsx')
/**
 * 共享格式化源代码
 */
export const sharedFormatSource = readIfExists('frontend/src/shared/format.tsx')
/**
 * 共享签到源代码
 */
export const sharedCheckinSource = readIfExists('frontend/src/shared/checkin.ts')
/**
 * 共享常量源代码
 */
export const sharedConstantsSource = readIfExists('frontend/src/shared/constants.ts')
/**
 * 共享类型源代码
 */
export const sharedTypesSource = readIfExists('frontend/src/shared/types.ts')
/**
 * 共享 UI 源代码
 */
export const sharedUiSource = readIfExists('frontend/src/shared/ui.tsx')
/**
 * 共享表格源代码
 */
export const sharedTableSource = readIfExists('frontend/src/shared/SimpleTable.tsx')
/**
 * 共享 JSON 消息预览源代码
 */
export const sharedJsonMessageSource = readIfExists('frontend/src/shared/JsonMessagePreview.tsx')
/**
 * 共享确认模态框源代码
 */
export const sharedConfirmModalSource = readIfExists('frontend/src/shared/ConfirmModals.tsx')
/**
 * 站点详情令牌列表源代码（合并多个文件）
 */
export const siteDetailTokenListSource = [
  readIfExists('frontend/src/components/site-detail/TokenList.tsx'),
  readIfExists('frontend/src/components/site-detail/TokenDialogs.tsx'),
  sharedUiSource
].join('\n')
/**
 * 应用源代码（合并所有前端组件）
 */
export const appSource = [
  appExperienceSource,
  siteManagerSource,
  appChromeSource,
  siteListViewSource,
  siteMenusSource,
  siteCardsSource,
  siteManagerModalsSource,
  siteFormModalSource,
  siteDetailDrawerSource,
  siteBatchActionsSource,
  visibleSiteRowsSource,
  logsPageSource,
  logMobileCardsSource,
  logCardsSource,
  logTableSource,
  settingsPageSource,
  sharedFormatSource,
  sharedCheckinSource,
  sharedConstantsSource,
  sharedTypesSource,
  sharedTableSource,
  sharedJsonMessageSource,
  sharedConfirmModalSource
].join('\n')
/**
 * API 站点源代码
 */
export const apiSiteSource = readFileSync('frontend/src/api/apiSite.ts', 'utf8')
/**
 * 样式表源代码
 */
export const stylesSource = readFileSync('frontend/src/styles.css', 'utf8')
/**
 * Vite 配置源代码
 */
export const viteConfigSource = readFileSync('frontend/vite.config.ts', 'utf8')
/**
 * 主入口源代码
 */
export const mainSource = readFileSync('frontend/src/main.tsx', 'utf8')
/**
 * Toast 通知源代码
 */
export const toastSource = existsSync('frontend/src/toast.tsx') ? readFileSync('frontend/src/toast.tsx', 'utf8') : ''
/**
 * npm 配置源代码
 */
export const npmrcSource = existsSync('.npmrc') ? readFileSync('.npmrc', 'utf8') : ''
/**
 * Package.json 源代码
 */
export const packageSource = readFileSync('package.json', 'utf8')
/**
 * README 源代码
 */
export const readmeSource = readFileSync('README.md', 'utf8')
/**
 * 本地计划开发脚本源代码
 */
export const localScheduledDevSource = readFileSync('scripts/local-scheduled-dev.mjs', 'utf8')
/**
 * 签到日志仓库源代码
 */
export const checkinLogRepositorySource = readFileSync('worker/src/repositories/checkin-log-repository.ts', 'utf8')
/**
 * 任务日志仓库源代码
 */
export const taskLogRepositorySource = readFileSync('worker/src/repositories/task-log-repository.ts', 'utf8')
/**
 * 调度器服务源代码
 */
export const schedulerServiceSource = readFileSync('worker/src/services/scheduler-service.ts', 'utf8')
/**
 * 令牌服务源代码
 */
export const tokenServiceSource = readFileSync('worker/src/services/token-service.ts', 'utf8')
