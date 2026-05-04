
import type { ReactNode } from 'react'
import type { ApiSite, CheckinLog, SiteFormPayload } from '../api/apiSite'
import { AUTH_METHODS } from './constants'

/**
 * 从路径获取页面键
 * @param pathname - URL 路径
 * @returns 页面键
 */
export function getPageFromPath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  if (normalized === '/logs') return 'logs'
  if (normalized === '/settings') return 'settings'
  return 'sites'
}

/**
 * 格式化数字
 * @param value - 数字值
 * @returns 格式化后的字符串
 */
function formatNumber(value: number | null | undefined): string {
  return Number(value || 0).toFixed(2)
}

/**
 * 规范化表单排序顺序
 * @param input - 输入字符串
 * @returns 规范化后的数字
 */
export function normalizeFormSortOrder(input: string): number {
  if (!input.trim()) return 0
  const parsed = Number.parseInt(input, 10)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

/**
 * 格式化日期
 * @param value - 日期值
 * @returns 格式化后的日期字符串
 */
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

/**
 * 格式化金额
 * @param value - 金额值
 * @returns 格式化后的金额字符串
 */
export function formatMoney(value: number | null | undefined): string {
  return `$${formatNumber(value)}`
}

/**
 * 格式化签到奖励
 * @param log - 签到日志
 * @returns 格式化后的奖励字符串
 */
export function formatCheckinReward(log: Pick<CheckinLog, 'status' | 'reward_amount'>): string {
  return log.status === 'success' && log.reward_amount != null ? formatMoney(log.reward_amount) : '-'
}

/**
 * 格式化签到余额
 * @param log - 签到日志
 * @returns 格式化后的余额字符串
 */
export function formatCheckinBalance(log: Pick<CheckinLog, 'status' | 'new_balance'>): string {
  return log.status === 'success' && log.new_balance != null ? formatMoney(log.new_balance) : '-'
}

/**
 * 比较站点用于默认显示
 * @param left - 左侧站点
 * @param right - 右侧站点
 * @returns 比较结果
 */
export function compareSitesForDefaultDisplay(left: ApiSite, right: ApiSite): number {
  if (left.enabled !== right.enabled) return left.enabled ? -1 : 1
  const sortOrderDiff = left.sort_order - right.sort_order
  if (sortOrderDiff !== 0) return sortOrderDiff
  const balanceDiff = Number(right.site_quota || 0) - Number(left.site_quota || 0)
  if (balanceDiff !== 0) return balanceDiff
  return left.id - right.id
}
/**
 * 掩码敏感信息
 * @param value - 敏感信息值
 * @returns 掩码后的字符串
 */
function maskSecret(value: string | null | undefined): string {
  if (!value) return '未配置'
  if (value.length <= 12) return '已配置'
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

/**
 * 格式化认证方法
 * @param value - 认证方法值
 * @returns 格式化后的认证方法字符串
 */
function formatAuthMethod(value: SiteFormPayload['auth_method']): string {
  return AUTH_METHODS.find(item => item.value === value)?.label || value
}

/**
 * 获取站点凭证详情
 * @param site - 站点对象
 * @returns 凭证详情数组
 */
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

/**
 * 规范化远程组选项
 * @param groups - 组列表
 * @returns 规范化后的组列表
 */
export function normalizeRemoteGroupOptions(groups: string[] | null | undefined): string[] {
  const normalized = Array.from(new Set((groups || []).map(group => String(group || '').trim()).filter(Boolean)))
  return normalized.length ? normalized : ['default']
}
/**
 * 任务类型标签映射
 */
const TASK_TYPE_LABELS: Record<string, string> = {
  checkin: '签到',
  sync_token: '同步 Token',
  query_balance: '查询余额',
  batch_checkin: '批量签到',
  batch_refresh_balance: '批量查询余额',
  batch_sync_tokens: '批量同步 Token'
}

/**
 * 签到类型标签映射
 */
const CHECKIN_TYPE_LABELS: Record<string, string> = {
  manual: '手动签到',
  scheduled: '定时签到',
  auto: '自动签到'
}

/**
 * 任务状态标签映射
 */
const TASK_STATUS_LABELS: Record<string, string> = {
  success: '成功',
  failed: '失败',
  pending: '等待',
  running: '运行中',
  cancelled: '已取消'
}

/**
 * 日志状态标签映射
 */
const LOG_STATUS_LABELS: Record<string, string> = {
  success: '成功',
  failed: '失败',
  error: '错误',
  pending: '等待',
  unchecked: '未检查',
  already_checked_in: '已签到',
  skipped: '已跳过'
}

/**
 * 消息字段标签映射
 */
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

/**
 * 人性化回退处理
 * @param value - 值
 * @returns 人性化后的字符串
 */
function humanizeFallback(value: string): string {
  return value ? value.replace(/_/g, ' ') : '-'
}

/**
 * 格式化消息键
 * @param key - 消息键
 * @returns 格式化后的消息键
 */
function formatMessageKey(key: string): string {
  return MESSAGE_FIELD_LABELS[key] || humanizeFallback(key)
}

/**
 * 格式化签到类型
 * @param value - 签到类型值
 * @returns 格式化后的签到类型字符串
 */
export function formatCheckinType(value: string): string {
  return CHECKIN_TYPE_LABELS[value] || humanizeFallback(value)
}

/**
 * 格式化任务类型
 * @param value - 任务类型值
 * @returns 格式化后的任务类型字符串
 */
export function formatTaskType(value: string): string {
  return TASK_TYPE_LABELS[value] || humanizeFallback(value)
}

/**
 * 格式化任务状态
 * @param value - 任务状态值
 * @returns 格式化后的任务状态字符串
 */
export function formatTaskStatus(value: string): string {
  return TASK_STATUS_LABELS[value] || humanizeFallback(value)
}

/**
 * 格式化日志状态
 * @param value - 日志状态值
 * @returns 格式化后的日志状态字符串
 */
export function formatLogStatus(value: string): string {
  return LOG_STATUS_LABELS[value] || humanizeFallback(value)
}

/**
 * 获取日志状态颜色主题
 * @param value - 日志状态值
 * @returns 颜色主题
 */
export function logStatusTone(value: string): 'success' | 'warning' | 'danger' | 'muted' | 'info' {
  if (value === 'success' || value === 'already_checked_in') return 'success'
  if (value === 'skipped') return 'warning'
  if (value === 'failed' || value === 'error') return 'danger'
  if (value === 'pending') return 'warning'
  if (value === 'unchecked') return 'muted'
  return 'info'
}

/**
 * 获取任务状态颜色主题
 * @param value - 任务状态值
 * @returns 颜色主题
 */
export function taskStatusTone(value: string): 'success' | 'warning' | 'danger' | 'muted' | 'info' {
  if (value === 'success') return 'success'
  if (value === 'failed') return 'danger'
  if (value === 'pending' || value === 'running') return 'warning'
  if (value === 'cancelled') return 'muted'
  return 'info'
}
/**
 * 格式化消息值
 * @param key - 消息键
 * @param value - 消息值
 * @returns 格式化后的消息值
 */
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

/**
 * 格式化结构化消息
 * @param raw - 原始消息
 * @returns 格式化后的消息
 */
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

/**
 * 获取日志原始消息
 * @param message - 消息
 * @param error - 错误
 * @returns 原始消息
 */
export function getLogMessageRaw(message: string | null | undefined, error: string | null | undefined): string {
  return message || error || ''
}

/**
 * 解析 JSON 消息
 * @param raw - 原始消息
 * @returns 解析后的 JSON 或 null
 */
export function parseJsonMessage(raw: string): unknown | null {
  const trimmed = raw.trim()
  if (!trimmed || !['{', '['].includes(trimmed[0])) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}
