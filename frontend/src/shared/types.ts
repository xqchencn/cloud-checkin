
import type { ApiSite, SiteFormPayload } from '../api/apiSite'

/**
 * 页面键类型
 */
export type PageKey = 'sites' | 'logs' | 'settings' | 'hf-spaces'

/**
 * 站点筛选类型
 */
export type SiteFilter = 'all' | 'enabled' | 'disabled' | 'signed' | 'unsigned' | 'failed'

/**
 * 可见 URL 行类型
 */
export type VisibleUrlRow =
  | { type: 'url-group'; key: string; url: string; totalSites: number; enabledSites: number }
  | { type: 'site'; key: string; site: ApiSite }

/**
 * 站点表单状态类型
 */
export type SiteFormState = Omit<SiteFormPayload, 'sort_order'> & { sort_order: string }

/**
 * 批量操作进度接口
 */
export interface BatchProgress {
  title: string
  phase: string
  current: number
  total: number
  currentName: string
  success: number
  failed: number
  skipped: number
}

/**
 * 确认操作接口
 */
export interface ConfirmAction {
  title: string
  description: string
  confirmLabel: string
  tone: 'warning' | 'danger'
  run: () => void
}
