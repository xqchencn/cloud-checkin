
import type { SiteFormPayload } from '../api/apiSite'
import type { PageKey, SiteFilter, SiteFormState } from './types'

export const SITE_TYPES = ['NewApi', 'OneApi', 'OneHub', 'RixApi', 'Veloera', 'AnyRouter', 'VoApi', 'DoneHub']
export const PAGE_PATHS: Record<PageKey, string> = {
  sites: '/',
  logs: '/logs',
  settings: '/settings'
}
export const SITE_FILTERS: Array<{ value: SiteFilter; label: string }> = [
  { value: 'all', label: '全部站点' },
  { value: 'enabled', label: '已启用' },
  { value: 'disabled', label: '未启用' },
  { value: 'signed', label: '已签到' },
  { value: 'unsigned', label: '未签到' },
  { value: 'failed', label: '签到失败' }
]
export const AUTH_METHODS: Array<{ value: SiteFormPayload['auth_method']; label: string }> = [
  { value: 'sessions', label: 'Sessions/Cookie' },
  { value: 'token', label: 'Token' },
  { value: 'password', label: '用户名密码' }
]

export const EMPTY_FORM: SiteFormState = {
  name: '',
  url: '',
  api_type: 'NewApi',
  account_label: '',
  sort_order: '0',
  auth_method: 'sessions',
  auth_value: '',
  user_id: '',
  login_username: '',
  login_password: '',
  enabled: true,
  auto_checkin: true,
  remarks: '',
  checkin_endpoint: ''
}

export const SUPPORTED_CHECKIN_TYPES = ['NewApi', 'OneApi', 'OneHub', 'RixApi', 'Veloera', 'AnyRouter', 'VoApi']
