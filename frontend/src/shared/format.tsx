
import type { ReactNode } from 'react'
import type { ApiSite, CheckinLog, SiteFormPayload } from '../api/apiSite'
import { AUTH_METHODS } from './constants'

export function getPageFromPath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  if (normalized === '/logs') return 'logs'
  if (normalized === '/settings') return 'settings'
  return 'sites'
}

function formatNumber(value: number | null | undefined): string {
  return Number(value || 0).toFixed(2)
}
export function normalizeFormSortOrder(input: string): number {
  if (!input.trim()) return 0
  const parsed = Number.parseInt(input, 10)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}
export function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  if (value === '-1') return '-'
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) {
    const date = new Date(numeric > 1000000000000 ? numeric : numeric * 1000)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN')
  }
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) return date.toLocaleString('zh-CN')
  return value.replace('T', ' ').replace(/\.\d+Z$/, ' UTC')
}
export function formatMoney(value: number | null | undefined): string {
  return `$${formatNumber(value)}`
}
export function formatCheckinReward(log: Pick<CheckinLog, 'status' | 'reward_amount'>): string {
  return log.status === 'success' && log.reward_amount != null ? formatMoney(log.reward_amount) : '-'
}
export function formatCheckinBalance(log: Pick<CheckinLog, 'status' | 'new_balance'>): string {
  return log.status === 'success' && log.new_balance != null ? formatMoney(log.new_balance) : '-'
}
export function compareSitesForDefaultDisplay(left: ApiSite, right: ApiSite): number {
  if (left.enabled !== right.enabled) return left.enabled ? -1 : 1
  const sortOrderDiff = left.sort_order - right.sort_order
  if (sortOrderDiff !== 0) return sortOrderDiff
  const balanceDiff = Number(right.site_quota || 0) - Number(left.site_quota || 0)
  if (balanceDiff !== 0) return balanceDiff
  return left.id - right.id
}
function maskSecret(value: string | null | undefined): string {
  if (!value) return '未配置'
  if (value.length <= 12) return '已配置'
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}
function formatAuthMethod(value: SiteFormPayload['auth_method']): string {
  return AUTH_METHODS.find(item => item.value === value)?.label || value
}
export function siteCredentialDetails(site: ApiSite): Array<[string, ReactNode]> {
  if (site.auth_method === 'token') {
    return [
      ['认证方式', formatAuthMethod(site.auth_method)],
      ['访问 Token', maskSecret(site.auth_value)]
    ]
  }
  if (site.auth_method === 'sessions') {
    return [
      ['认证方式', formatAuthMethod(site.auth_method)],
      ['Sessions / Cookie', maskSecret(site.auth_value)]
    ]
  }
  return [
    ['认证方式', formatAuthMethod(site.auth_method)],
    ['登录用户名', site.login_username || '-'],
    ['登录密码', maskSecret(site.login_password)]
  ]
}
export function normalizeRemoteGroupOptions(groups: string[] | null | undefined): string[] {
  const normalized = Array.from(new Set((groups || []).map(group => String(group || '').trim()).filter(Boolean)))
  return normalized.length ? normalized : ['default']
}
const TASK_TYPE_LABELS: Record<string, string> = {
  checkin: '签到',
  sync_token: '同步 Token',
  query_balance: '查询余额',
  batch_checkin: '批量签到',
  batch_refresh_balance: '批量查询余额',
  batch_sync_tokens: '批量同步 Token'
}

const CHECKIN_TYPE_LABELS: Record<string, string> = {
  manual: '手动签到',
  scheduled: '定时签到',
  auto: '自动签到'
}

const TASK_STATUS_LABELS: Record<string, string> = {
  success: '成功',
  failed: '失败',
  pending: '等待',
  running: '运行中',
  cancelled: '已取消'
}

const LOG_STATUS_LABELS: Record<string, string> = {
  success: '成功',
  failed: '失败',
  error: '错误',
  pending: '等待',
  unchecked: '未检查',
  already_checked_in: '已签到',
  skipped: '已跳过'
}

const MESSAGE_FIELD_LABELS: Record<string, string> = {
  status: '状态',
  message: '消息',
  error: '错误',
  error_details: '错误详情',
  reward_amount: '奖励',
  new_balance: '余额',
  site_quota: '余额',
  site_used_quota: '已用',
  site_request_count: '请求次数',
  new_tokens: '新增',
  updated_tokens: '更新',
  deleted_tokens: '删除',
  failed_tokens: '失败'
}
function humanizeFallback(value: string): string {
  return value ? value.replace(/_/g, ' ') : '-'
}
function formatMessageKey(key: string): string {
  return MESSAGE_FIELD_LABELS[key] || humanizeFallback(key)
}
export function formatCheckinType(value: string): string {
  return CHECKIN_TYPE_LABELS[value] || humanizeFallback(value)
}
export function formatTaskType(value: string): string {
  return TASK_TYPE_LABELS[value] || humanizeFallback(value)
}
export function formatTaskStatus(value: string): string {
  return TASK_STATUS_LABELS[value] || humanizeFallback(value)
}
export function formatLogStatus(value: string): string {
  return LOG_STATUS_LABELS[value] || humanizeFallback(value)
}
export function logStatusTone(value: string): 'success' | 'warning' | 'danger' | 'muted' | 'info' {
  if (value === 'success' || value === 'already_checked_in') return 'success'
  if (value === 'skipped') return 'warning'
  if (value === 'failed' || value === 'error') return 'danger'
  if (value === 'pending') return 'warning'
  if (value === 'unchecked') return 'muted'
  return 'info'
}
export function taskStatusTone(value: string): 'success' | 'warning' | 'danger' | 'muted' | 'info' {
  if (value === 'success') return 'success'
  if (value === 'failed') return 'danger'
  if (value === 'pending' || value === 'running') return 'warning'
  if (value === 'cancelled') return 'muted'
  return 'info'
}
function formatMessageValue(key: string, value: unknown): string {
  if (value == null || value === '') return '-'
  if (key === 'status') return formatLogStatus(String(value))
  if (key === 'reward_amount' || key === 'new_balance' || key === 'site_quota' || key === 'site_used_quota') {
    return formatMoney(Number(value || 0))
  }
  if (Array.isArray(value)) return `${value.length} 项`
  if (typeof value === 'object') return '已返回数据'
  return String(value)
}
export function formatStructuredMessage(raw: string): string {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    if ('new_tokens' in data || 'updated_tokens' in data || 'deleted_tokens' in data) {
      return `新增 ${data.new_tokens ?? 0}，更新 ${data.updated_tokens ?? 0}，删除 ${data.deleted_tokens ?? 0}，失败 ${data.failed_tokens ?? 0}`
    }
    if ('status' in data && ('reward_amount' in data || 'new_balance' in data)) {
      return `状态 ${formatLogStatus(String(data.status ?? ''))}，奖励 ${formatMoney(Number(data.reward_amount ?? 0))}，余额 ${formatMoney(Number(data.new_balance ?? 0))}`
    }
    if ('site_quota' in data || 'site_used_quota' in data || 'site_request_count' in data) {
      return `余额 ${formatMoney(Number(data.site_quota ?? 0))}，已用 ${formatMoney(Number(data.site_used_quota ?? 0))}，请求 ${data.site_request_count ?? 0} 次`
    }
    return Object.entries(data)
      .map(([key, value]) => `${formatMessageKey(key)}: ${formatMessageValue(key, value)}`)
      .join('；')
  } catch {
    return raw
  }
}
export function getLogMessageRaw(message: string | null | undefined, error: string | null | undefined): string {
  return message || error || ''
}
export function parseJsonMessage(raw: string): unknown | null {
  const trimmed = raw.trim()
  if (!trimmed || !['{', '['].includes(trimmed[0])) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}
