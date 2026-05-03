import { apiRequest } from './http'

export type AuthMethod = 'token' | 'sessions' | 'password'

export interface ApiSite {
  id: number
  name: string
  url: string
  api_type: string
  auth_method: AuthMethod
  auth_value: string | null
  user_id: string | null
  login_username: string | null
  login_password: string | null
  enabled: boolean
  auto_checkin: boolean
  site_username: string | null
  site_user_group: string | null
  site_aff_code: string | null
  site_quota: number
  site_used_quota: number
  site_request_count: number
  site_aff_count: number
  site_aff_quota: number
  site_aff_history_quota: number
  last_checkin: string | null
  last_checkin_status: string | null
  last_check_time: string | null
  last_check_status: string
  last_check_message: string | null
  remarks: string | null
  checkin_endpoint: string | null
  created_at: string
  updated_at: string
}

export interface SiteFormPayload {
  name: string
  url: string
  api_type: string
  auth_method: AuthMethod
  auth_value: string
  user_id: string
  login_username: string
  login_password: string
  enabled: boolean
  auto_checkin: boolean
  remarks: string
  checkin_endpoint: string
}

export interface TodayCheckinStats {
  checkin_enabled_count: number
  success_count: number
  unchecked_count: number
  failed_count: number
}

export interface Paginated<T> {
  logs: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ApiToken {
  id: number
  remote_token_id: string | null
  token_key: string
  token_name: string | null
  token_group: string
  is_active: number
  token_quota: number | null
  token_used_quota: number | null
  token_unlimited_quota: boolean
  created_time: string | null
  accessed_time: string | null
  expired_time: string | null
  last_synced: string | null
}

export interface ApiModel {
  id: number
  model_name: string
  model_type: string
  is_active: boolean
  created_at: string
}

export interface CheckinLog {
  id: number
  api_site_id?: number
  site_name?: string
  checkin_time: string
  checkin_type: string
  status: string
  message: string | null
  reward_amount: number | null
  new_balance: number | null
  response_time: number | null
  http_status_code: number | null
  error_details?: string | null
  created_at?: string
}

export interface TaskLog {
  id: number
  api_site_id?: number
  site_name?: string
  log_date: string
  task_type: string
  status: string
  message: string | null
  error: string | null
  exec_time: string | null
}

export interface LogQueryParams {
  page?: number
  page_size?: number
  status?: string
  site_id?: number
  checkin_type?: string
  task_type?: string
}

export type SettingValuePrimitive = string | number | boolean
export type SettingValueTree = {
  [key: string]: SettingValuePrimitive | SettingValueTree
}

// Settings API 现在拆成两层：
// 1. `categories` 提供分组标题/说明/排序
// 2. `items` 提供具体可编辑项和只读展示项
export interface SettingItem {
  key: string
  value: string
  type: 'string' | 'number' | 'boolean' | 'cron' | 'secret'
  label: string
  description: string
  category: string
  sort_order: number
  editable: boolean
  options: {
    min?: number
    max?: number
    step?: number
    unit?: string
    placeholder?: string
  } | null
  updated_at: string | null
}

export interface AppSettings {
  cloudflare: {
    cron_source: 'wrangler'
    cron_editable: false
  }
  categories: Array<{
    key: string
    title: string
    description: string
    sort_order: number
  }>
  auth: {
    database_password_configured: boolean
  }
  items: SettingItem[]
  values: SettingValueTree
}

export interface SettingsUpdatePayload {
  values: Record<string, SettingValuePrimitive>
}

function toQuery(params: LogQueryParams): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const AuthMe = () => apiRequest<{ authenticated: boolean }>('/api/auth/me')
export const AuthLogin = (password: string) => apiRequest<{ authenticated: boolean }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) })
export const AuthLogout = () => apiRequest<{ authenticated: boolean }>('/api/auth/logout', { method: 'POST' })

export const ApiSiteList = () => apiRequest<ApiSite[]>('/api/sites')
export const ApiSiteCreate = (payload: SiteFormPayload) => apiRequest<{ id: number }>('/api/sites', { method: 'POST', body: JSON.stringify(payload) })
export const ApiSiteUpdate = (id: number, payload: SiteFormPayload) => apiRequest<{ id: number }>(`/api/sites/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
export const ApiSiteDelete = (id: number) => apiRequest<{ id: number }>(`/api/sites/${id}`, { method: 'DELETE' })
export const ApiSiteCheckin = (id: number) => apiRequest(`/api/sites/${id}/checkin`, { method: 'POST' })
export const ApiSiteRefreshBalance = (id: number) => apiRequest(`/api/sites/${id}/refresh-balance`, { method: 'POST' })
export const ApiSiteSyncTokens = (id: number) => apiRequest(`/api/sites/${id}/sync-tokens`, { method: 'POST' })
export const ApiSiteRefreshModels = (id: number) => apiRequest(`/api/sites/${id}/models/refresh`, { method: 'POST' })
export const ApiSiteBatchRefreshBalance = (siteIds: number[]) => apiRequest('/api/sites/batch-refresh-balance', { method: 'POST', body: JSON.stringify({ site_ids: siteIds }) })
export const ApiSiteBatchCheckin = (siteIds: number[]) => apiRequest('/api/sites/batch-checkin', { method: 'POST', body: JSON.stringify({ site_ids: siteIds }) })
export const ApiSiteBatchSyncTokens = (siteIds: number[]) => apiRequest('/api/sites/batch-sync-tokens', { method: 'POST', body: JSON.stringify({ site_ids: siteIds }) })
export const ApiSiteGetTokens = (id: number) => apiRequest<ApiToken[]>(`/api/sites/${id}/tokens`)
export const ApiSiteGetModels = (id: number) => apiRequest<{ models: ApiModel[] }>(`/api/sites/${id}/models`)
export const ApiSiteGetCheckinLogs = (id: number) => apiRequest<CheckinLog[]>(`/api/sites/${id}/checkin-logs`)
export const ApiSiteGetTaskLogs = (id: number) => apiRequest<Paginated<TaskLog>>(`/api/sites/${id}/task-logs`)
export const ApiCheckinLogs = (params: LogQueryParams = {}) => apiRequest<Paginated<CheckinLog>>(`/api/checkin-logs${toQuery(params)}`)
export const ApiTaskLogs = (params: LogQueryParams = {}) => apiRequest<Paginated<TaskLog>>(`/api/task-logs${toQuery(params)}`)
export const ApiClearCheckinLogs = () => apiRequest<{ deleted_count: number; success: boolean; message: string }>('/api/checkin-logs', { method: 'DELETE' })
export const ApiClearTaskLogs = () => apiRequest<{ deleted_count: number; success: boolean; message: string }>('/api/task-logs', { method: 'DELETE' })
export const ApiGetSettings = () => apiRequest<AppSettings>('/api/settings')
export const ApiUpdateSettings = (payload: SettingsUpdatePayload) => apiRequest<AppSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(payload) })
export const ApiUpdatePassword = (newPassword: string, confirmPassword: string) => apiRequest<AppSettings>('/api/settings/password', {
  method: 'PUT',
  body: JSON.stringify({ new_password: newPassword, confirm_password: confirmPassword })
})
export const ApiSiteGetTodayCheckinStatistics = () => apiRequest<TodayCheckinStats>('/api/sites/checkin/today-statistics')
export const ApiSiteExport = () => apiRequest<string>('/api/sites/export')
export const ApiSiteImport = (jsonData: string) => apiRequest<{ success_count: number; skip_count: number; fail_count: number }>('/api/sites/import', { method: 'POST', body: JSON.stringify({ jsonData }) })
