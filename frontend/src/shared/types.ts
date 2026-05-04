
import type { ApiSite, SiteFormPayload } from '../api/apiSite'

export type PageKey = 'sites' | 'logs' | 'settings'
export type SiteFilter = 'all' | 'enabled' | 'disabled' | 'signed' | 'unsigned' | 'failed'
export type VisibleUrlRow =
  | { type: 'url-group'; key: string; url: string; totalSites: number; enabledSites: number }
  | { type: 'site'; key: string; site: ApiSite }
export type SiteFormState = Omit<SiteFormPayload, 'sort_order'> & { sort_order: string }

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

export interface ConfirmAction {
  title: string
  description: string
  confirmLabel: string
  tone: 'warning' | 'danger'
  run: () => void
}
