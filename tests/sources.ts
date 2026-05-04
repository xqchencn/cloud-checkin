import { existsSync, readFileSync } from 'node:fs'

function readIfExists(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

export const entryAppSource = readFileSync('frontend/src/App.tsx', 'utf8')
export const appExperienceSource = readIfExists('frontend/src/app/AppExperience.tsx')
export const siteManagerSource = readIfExists('frontend/src/pages/SiteManager.tsx')
export const appChromeSource = readIfExists('frontend/src/features/layout/AppChrome.tsx')
export const siteListViewSource = readIfExists('frontend/src/features/site/SiteListView.tsx')
export const siteMenusSource = readIfExists('frontend/src/features/site/SiteMenus.tsx')
export const siteCardsSource = readIfExists('frontend/src/features/site/SiteCards.tsx')
export const siteManagerModalsSource = readIfExists('frontend/src/features/site/SiteManagerModals.tsx')
export const siteFormModalSource = readIfExists('frontend/src/features/site/SiteFormModal.tsx')
export const siteDetailDrawerSource = readIfExists('frontend/src/features/site/SiteDetailDrawer.tsx')
export const siteBatchActionsSource = readIfExists('frontend/src/features/site/useSiteBatchActions.ts')
export const visibleSiteRowsSource = readIfExists('frontend/src/features/site/useVisibleSiteRows.ts')
export const logsPageSource = readIfExists('frontend/src/features/logs/LogsPage.tsx')
export const logMobileCardsSource = readIfExists('frontend/src/features/logs/LogMobileCards.tsx')
export const logCardsSource = readIfExists('frontend/src/components/logs/LogCards.tsx')
export const logTableSource = readIfExists('frontend/src/components/logs/LogTables.tsx')
export const settingsPageSource = readIfExists('frontend/src/features/settings/SettingsPage.tsx')
export const sharedFormatSource = readIfExists('frontend/src/shared/format.tsx')
export const sharedCheckinSource = readIfExists('frontend/src/shared/checkin.ts')
export const sharedConstantsSource = readIfExists('frontend/src/shared/constants.ts')
export const sharedTypesSource = readIfExists('frontend/src/shared/types.ts')
export const sharedUiSource = readIfExists('frontend/src/shared/ui.tsx')
export const sharedTableSource = readIfExists('frontend/src/shared/SimpleTable.tsx')
export const sharedJsonMessageSource = readIfExists('frontend/src/shared/JsonMessagePreview.tsx')
export const sharedConfirmModalSource = readIfExists('frontend/src/shared/ConfirmModals.tsx')
export const siteDetailTokenListSource = [
  readIfExists('frontend/src/components/site-detail/TokenList.tsx'),
  readIfExists('frontend/src/components/site-detail/TokenDialogs.tsx'),
  sharedUiSource
].join('\n')
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
export const apiSiteSource = readFileSync('frontend/src/api/apiSite.ts', 'utf8')
export const stylesSource = readFileSync('frontend/src/styles.css', 'utf8')
export const viteConfigSource = readFileSync('frontend/vite.config.ts', 'utf8')
export const mainSource = readFileSync('frontend/src/main.tsx', 'utf8')
export const toastSource = existsSync('frontend/src/toast.tsx') ? readFileSync('frontend/src/toast.tsx', 'utf8') : ''
export const npmrcSource = existsSync('.npmrc') ? readFileSync('.npmrc', 'utf8') : ''
export const packageSource = readFileSync('package.json', 'utf8')
export const readmeSource = readFileSync('README.md', 'utf8')
export const localScheduledDevSource = readFileSync('scripts/local-scheduled-dev.mjs', 'utf8')
export const checkinLogRepositorySource = readFileSync('worker/src/repositories/checkin-log-repository.ts', 'utf8')
export const taskLogRepositorySource = readFileSync('worker/src/repositories/task-log-repository.ts', 'utf8')
export const schedulerServiceSource = readFileSync('worker/src/services/scheduler-service.ts', 'utf8')
export const tokenServiceSource = readFileSync('worker/src/services/token-service.ts', 'utf8')
