export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  SESSION_SECRET: string
}

export type SettingValueType = 'string' | 'number' | 'boolean' | 'cron' | 'secret'

export interface SettingOptionMeta {
  min?: number
  max?: number
  step?: number
  unit?: string
  placeholder?: string
}

export interface PublicSettingItem {
  key: string
  value: string
  type: SettingValueType
  label: string
  description: string
  category: string
  sort_order: number
  editable: boolean
  options: SettingOptionMeta | null
  updated_at: string | null
}

export interface RuntimeAppSettings {
  session: {
    ttl_seconds: number
  }
  logs: {
    retention_days: number
  }
  scheduler: {
    checkin_cron: string
    cleanup_cron: string
  }
}

export interface PublicAppSettings {
  auth: {
    database_password_configured: boolean
  }
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
  items: PublicSettingItem[]
  values: RuntimeAppSettings
}

export interface SettingsUpdatePayload {
  values?: Record<string, string | number | boolean>
}

export interface PasswordUpdatePayload {
  new_password?: string
  confirm_password?: string
}

export interface ApiErrorBody {
  success: false
  error: {
    code: string
    message: string
  }
}

export interface ApiSuccessBody<T> {
  success: true
  data: T
}

export interface ApiSite {
  id: number
  name: string
  url: string
  api_type: string
  account_label: string | null
  sort_order: number
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

export type AuthMethod = 'token' | 'sessions' | 'password'

export interface ApiSiteInput {
  name: string
  url: string
  api_type: string
  account_label?: string
  sort_order?: number
  auth_method: AuthMethod
  auth_value?: string
  user_id?: string
  login_username?: string
  login_password?: string
  enabled: boolean
  auto_checkin: boolean
  remarks?: string
  checkin_endpoint?: string
}

export interface ApiSiteToken {
  id: number
  api_site_id: number
  remote_token_id: string | null
  token_key: string
  value_status: 'ready' | 'masked_pending' | 'missing'
  token_name: string | null
  token_group: string
  source: string
  is_active: number
  token_quota: number | null
  token_used_quota: number | null
  token_unlimited_quota: boolean
  created_time: string | null
  accessed_time: string | null
  expired_time: string | null
  last_synced: string | null
  created_at: string
  updated_at: string
}

export interface ApiSiteModel {
  id: number
  site_id: number
  model_name: string
  model_type: string
  is_active: boolean
  created_at: string
}

export interface CheckinResult {
  api_site_id: number
  status: 'success' | 'already_checked_in' | 'skipped' | 'failed' | 'error'
  message: string
  reward_amount: number
  new_balance: number
  checkin_time: string
  response_time: number
  http_status_code: number
}

export interface CheckinLog {
  id: number
  api_site_id: number
  site_name?: string
  checkin_time: string
  checkin_type: string
  status: string
  message: string | null
  reward_amount: number | null
  new_balance: number | null
  response_time: number | null
  http_status_code: number | null
  error_details: string | null
  skip_reason: string | null
  failure_reason: string | null
  balance_before: number | null
  balance_after: number | null
  created_at: string
}

export interface TaskLogDisplay {
  id: number
  api_site_id: number
  site_name: string
  log_date: string
  task_type: 'checkin' | 'sync_token' | 'query_balance'
  status: string
  message: string | null
  error: string | null
  exec_time: string | null
}

export interface Paginated<T> {
  logs: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
