import { FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  CircleCheck,
  CircleX,
  ClipboardList,
  Cloud,
  Copy,
  Database,
  Download,
  Edit3,
  Eye,
  Filter,
  FileText,
  Globe2,
  KeyRound,
  List,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  Settings,
  Trash2,
  Upload,
  UserRound,
  Wallet,
  X
} from 'lucide-react'
import {
  ApiCheckinLogs,
  ApiClearCheckinLogs,
  ApiClearTaskLogs,
  ApiGetSettings,
  ApiModel,
  ApiSite,
  ApiSiteCheckin,
  ApiSiteCreate,
  ApiSiteDelete,
  ApiSiteExport,
  ApiSiteGetCheckinLogs,
  ApiSiteGetModels,
  ApiSiteGetTaskLogs,
  ApiSiteGetTodayCheckinStatistics,
  ApiSiteGetTokens,
  ApiSiteImport,
  ApiSiteRefreshBalance,
  ApiSiteRefreshModels,
  ApiSiteSyncTokens,
  ApiSiteUpdate,
  ApiSiteList,
  ApiTaskLogs,
  ApiToken,
  ApiUpdatePassword,
  ApiUpdateSettings,
  AppSettings,
  AuthLogin,
  AuthLogout,
  AuthMe,
  CheckinLog,
  Paginated,
  SettingItem,
  SettingValuePrimitive,
  SettingValueTree,
  SiteFormPayload,
  TaskLog,
  TodayCheckinStats
} from './api/apiSite'
import { useToast } from './toast'

const SITE_TYPES = ['NewApi', 'OneApi', 'OneHub', 'RixApi', 'Veloera', 'AnyRouter', 'VoApi', 'DoneHub']
type PageKey = 'sites' | 'logs' | 'settings'
type SiteFilter = 'all' | 'enabled' | 'disabled' | 'signed' | 'unsigned' | 'failed'
const PAGE_PATHS: Record<PageKey, string> = {
  sites: '/',
  logs: '/logs',
  settings: '/settings'
}
const SITE_FILTERS: Array<{ value: SiteFilter; label: string }> = [
  { value: 'all', label: '全部站点' },
  { value: 'enabled', label: '已启用' },
  { value: 'disabled', label: '未启用' },
  { value: 'signed', label: '已签到' },
  { value: 'unsigned', label: '未签到' },
  { value: 'failed', label: '签到失败' }
]
const AUTH_METHODS: Array<{ value: SiteFormPayload['auth_method']; label: string }> = [
  { value: 'sessions', label: 'Sessions/Cookie' },
  { value: 'token', label: 'Token' },
  { value: 'password', label: '用户名密码' }
]

interface BatchProgress {
  title: string
  phase: string
  current: number
  total: number
  currentName: string
  success: number
  failed: number
  skipped: number
}

interface ConfirmAction {
  title: string
  description: string
  confirmLabel: string
  tone: 'warning' | 'danger'
  run: () => void
}

const EMPTY_FORM: SiteFormPayload = {
  name: '',
  url: '',
  api_type: 'NewApi',
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

function getPageFromPath(pathname: string): PageKey {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  if (normalized === '/logs') return 'logs'
  if (normalized === '/settings') return 'settings'
  return 'sites'
}

function formatNumber(value: number | null | undefined): string {
  return Number(value || 0).toFixed(2)
}

function formatDate(value: string | null | undefined): string {
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

function formatMoney(value: number | null | undefined): string {
  return `$${formatNumber(value)}`
}

function isUnlimitedToken(token: ApiToken): boolean {
  return token.token_unlimited_quota || token.token_quota === 0
}

function formatTokenQuota(token: ApiToken): string {
  if (isUnlimitedToken(token)) return '不限'
  if (token.token_quota == null) return '-'
  return formatMoney(token.token_quota)
}

function formatTokenRemainingQuota(token: ApiToken): string {
  if (isUnlimitedToken(token)) return '不限'
  if (token.token_quota == null || token.token_used_quota == null) return '-'
  return formatMoney(token.token_quota - token.token_used_quota)
}

function maskSecret(value: string | null | undefined): string {
  if (!value) return '未配置'
  if (value.length <= 12) return '已配置'
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

function maskTokenKey(value: string | null | undefined): string {
  if (!value) return '-'
  if (value.length <= 12) return value
  return `${value.slice(0, 8)}****${value.slice(-4)}`
}

function isPlaceholderTokenKey(value: string | null | undefined): boolean {
  return Boolean(value && value.includes('*'))
}

function formatTokenExpiry(value: string | null | undefined): string {
  if (!value || value === '-1') return '永不过期'
  return formatDate(value)
}

const TASK_TYPE_LABELS: Record<string, string> = {
  checkin: '签到',
  sync_token: '同步 Token',
  query_balance: '查询余额'
}

const CHECKIN_TYPE_LABELS: Record<string, string> = {
  manual: '手动签到',
  scheduled: '定时签到',
  auto: '自动签到'
}

const TASK_STATUS_LABELS: Record<string, string> = {
  success: '成功',
  failed: '失败',
  pending: '等待'
}

const LOG_STATUS_LABELS: Record<string, string> = {
  success: '成功',
  failed: '失败',
  error: '错误',
  pending: '等待',
  unchecked: '未检查',
  already_checked_in: '已签到'
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

function formatCheckinType(value: string): string {
  return CHECKIN_TYPE_LABELS[value] || humanizeFallback(value)
}

function formatTaskType(value: string): string {
  return TASK_TYPE_LABELS[value] || humanizeFallback(value)
}

function formatTaskStatus(value: string): string {
  return TASK_STATUS_LABELS[value] || humanizeFallback(value)
}

function formatLogStatus(value: string): string {
  return LOG_STATUS_LABELS[value] || humanizeFallback(value)
}

function logStatusTone(value: string): 'success' | 'warning' | 'danger' | 'muted' | 'info' {
  if (value === 'success' || value === 'already_checked_in') return 'success'
  if (value === 'failed' || value === 'error') return 'danger'
  if (value === 'pending') return 'warning'
  if (value === 'unchecked') return 'muted'
  return 'info'
}

function taskStatusTone(value: string): 'success' | 'warning' | 'danger' | 'muted' | 'info' {
  if (value === 'success') return 'success'
  if (value === 'failed') return 'danger'
  if (value === 'pending') return 'warning'
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

function formatStructuredMessage(raw: string): string {
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

function getLogMessageRaw(message: string | null | undefined, error: string | null | undefined): string {
  return message || error || ''
}

function parseJsonMessage(raw: string): unknown | null {
  const trimmed = raw.trim()
  if (!trimmed || !['{', '['].includes(trimmed[0])) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

function calculateLogPageSize(listElement?: HTMLElement | null, paginationElement?: HTMLElement | null): number {
  if (typeof window === 'undefined') return 10
  const isDesktop = window.matchMedia('(min-width: 768px)').matches
  const minRows = isDesktop ? 8 : 10
  const maxRows = isDesktop ? 40 : 30
  const bounds = listElement?.getBoundingClientRect()
  const paginationHeight = paginationElement?.getBoundingClientRect().height ?? 58
  const listTop = bounds?.top ?? (isDesktop ? 300 : 320)
  const headerHeight = isDesktop
    ? listElement?.querySelector('thead')?.getBoundingClientRect().height ?? 38
    : 0
  const itemElement = isDesktop
    ? listElement?.querySelector('tbody tr')
    : listElement?.querySelector('article')
  const itemHeight = itemElement?.getBoundingClientRect().height || (isDesktop ? 49 : 136)
  const available = Math.max(0, window.innerHeight - listTop - headerHeight - paginationHeight - 24)
  return Math.max(minRows, Math.min(maxRows, Math.floor(available / itemHeight)))
}

function useLogPageSize() {
  const listRef = useRef<HTMLDivElement | null>(null)
  const paginationRef = useRef<HTMLDivElement | null>(null)
  const [pageSize, setPageSize] = useState(() => calculateLogPageSize())

  useEffect(() => {
    function updatePageSize() {
      setPageSize(current => {
        const next = calculateLogPageSize(listRef.current, paginationRef.current)
        return current === next ? current : next
      })
    }
    updatePageSize()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePageSize)
    if (observer) {
      if (listRef.current) observer.observe(listRef.current)
      if (paginationRef.current) observer.observe(paginationRef.current)
    }
    window.addEventListener('resize', updatePageSize)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updatePageSize)
    }
  }, [])

  return { pageSize, listRef, paginationRef }
}

function isSettingTree(value: SettingValuePrimitive | SettingValueTree): value is SettingValueTree {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringifySettingValue(value: SettingValuePrimitive): string {
  return typeof value === 'boolean' ? String(value) : `${value ?? ''}`
}

function flattenSettingValues(values: SettingValueTree, prefix = ''): Record<string, string> {
  return Object.entries(values).reduce<Record<string, string>>((acc, [key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key
    if (isSettingTree(value)) {
      Object.assign(acc, flattenSettingValues(value, nextKey))
    } else {
      acc[nextKey] = stringifySettingValue(value)
    }
    return acc
  }, {})
}

function normalizeAppSettings(settings: AppSettings): AppSettings {
  const runtimeValues = flattenSettingValues(settings.values)
  return {
    ...settings,
    items: [...settings.items]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map(item => ({
        ...item,
        value: runtimeValues[item.key] ?? item.value ?? ''
      }))
  }
}

function formatSettingDescription(item: SettingItem): string {
  return [item.description, item.options?.unit ? `单位：${item.options.unit}` : ''].filter(Boolean).join(' ')
}

function coerceSettingPayloadValue(item: SettingItem): SettingValuePrimitive {
  if (item.type === 'boolean') return item.value === 'true'
  if (item.type === 'number') {
    const parsed = Number(item.value)
    return Number.isFinite(parsed) ? parsed : item.value
  }
  return item.value
}

const SUPPORTED_CHECKIN_TYPES = ['NewApi', 'OneApi', 'OneHub', 'RixApi', 'Veloera', 'AnyRouter', 'VoApi']
const DETAIL_CHECKIN_LOG_COLUMNS = ['w-[18%]', 'w-[10%]', 'w-[8%]', 'w-[8%]', 'w-[10%]', 'w-[7%]', 'w-[7%]', 'w-[32%]']
const DETAIL_TASK_LOG_COLUMNS = ['w-[16%]', 'w-[14%]', 'w-[8%]', 'w-[20%]', 'w-[42%]']

function supportsSiteCheckin(site: ApiSite): boolean {
  return SUPPORTED_CHECKIN_TYPES.includes(site.api_type)
}

function getCheckinDisabledReason(site: ApiSite): string {
  if (!supportsSiteCheckin(site)) return '当前站点类型不支持签到'
  if (!site.auto_checkin) return '自动签到未启用，无法签到'
  return ''
}

function businessDateKey(value: string): string | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const businessDate = new Date(date)
  if (businessDate.getHours() < 8) businessDate.setDate(businessDate.getDate() - 1)
  return `${businessDate.getFullYear()}-${businessDate.getMonth() + 1}-${businessDate.getDate()}`
}

function isCurrentCheckinCycle(value: string | null | undefined): boolean {
  if (!value) return false
  return businessDateKey(value) === businessDateKey(new Date().toISOString())
}

function isCheckinSuccess(status: string | null | undefined): boolean {
  return status === 'success' || status === 'already_checked_in'
}

function getCheckinDisplay(site: ApiSite): { text: string; tone: 'success' | 'warning' | 'danger' | 'muted' | 'info'; hint: string } {
  if (!supportsSiteCheckin(site)) {
    return {
      text: '不支持',
      tone: 'muted',
      hint: site.last_checkin ? `当前站点类型不支持签到，历史签到时间：${formatDate(site.last_checkin)}` : '当前站点类型不支持签到'
    }
  }
  if (!site.auto_checkin) {
    return { text: '未启用', tone: 'muted', hint: '自动签到未启用' }
  }
  const lastCheckin = site.last_checkin
  const success = isCheckinSuccess(site.last_checkin_status)
  if (lastCheckin && isCurrentCheckinCycle(lastCheckin)) {
    return success
      ? { text: '已签到', tone: 'success', hint: `签到时间：${formatDate(lastCheckin)}` }
      : { text: '签到失败', tone: 'danger', hint: `失败时间：${formatDate(lastCheckin)}` }
  }
  const now = new Date()
  if (now.getHours() < 8 && lastCheckin && success) {
    const last = new Date(lastCheckin)
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (last.toDateString() === yesterday.toDateString() && last.getHours() >= 8) {
      return { text: '等待8点', tone: 'info', hint: '上一周期已签到，等待新周期开始' }
    }
  }
  return { text: '未签到', tone: 'warning', hint: lastCheckin ? `上次签到：${formatDate(lastCheckin)}` : '暂无签到记录' }
}

function StatusBadge({ enabled, children }: { enabled: boolean; children: string }) {
  return (
    <span className={enabled ? 'badge bg-emerald-50 text-emerald-700' : 'badge bg-slate-100 text-slate-500'}>
      {children}
    </span>
  )
}

function ToneBadge({ tone, children }: { tone: 'success' | 'warning' | 'danger' | 'muted' | 'info'; children: string }) {
  const classes = {
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    muted: 'bg-slate-100 text-slate-500',
    info: 'bg-sky-50 text-sky-700'
  }
  return <span className={`badge ${classes[tone]}`}>{children}</span>
}

function ButtonIcon({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">{children}</span>
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? 'brand-mark h-11 w-11' : 'brand-mark h-10 w-10'}>
      <Cloud size={compact ? 23 : 21} />
    </span>
  )
}

function ModalShell({ children }: { children: ReactNode }) {
  return <div className="modal-shell">{children}</div>
}

function DialogCard({
  title,
  description,
  icon,
  onClose,
  children,
  footer,
  size = 'md'
}: {
  title: string
  description: string
  icon?: ReactNode
  onClose: () => void
  children: ReactNode
  footer: ReactNode
  size?: 'md' | 'lg' | 'xl'
}) {
  const maxWidth = {
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }[size]

  return (
    <section className={`modal-panel ${maxWidth}`}>
      <div className="modal-header">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">{icon}</span> : null}
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <button type="button" className="btn-icon" onClick={onClose} aria-label="关闭"><X size={16} /></button>
      </div>
      <div className="modal-body">{children}</div>
      <div className="modal-footer">{footer}</div>
    </section>
  )
}

function SiteAvatar({ site }: { site: ApiSite }) {
  const seed = (site.name || site.url || '?').trim() || '?'
  const letter = seed.slice(0, 1).toUpperCase() || '?'
  const palette = [
    ['#2563eb', '#4f46e5'],
    ['#7c3aed', '#2563eb'],
    ['#06b6d4', '#14b8a6'],
    ['#f59e0b', '#f97316'],
    ['#4f46e5', '#7c3aed']
  ]
  const index = seed.charCodeAt(0) % palette.length
  const [from, to] = palette[index]
  return (
    <span className="site-avatar" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      {letter}
    </span>
  )
}

function LoginView({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await AuthLogin(password)
      onLoggedIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form onSubmit={submit} className="soft-card w-full max-w-sm p-7">
        <input className="sr-only" name="username" type="text" autoComplete="username" value="cloud-checkin" readOnly tabIndex={-1} aria-hidden="true" />
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <h1 className="text-xl font-bold text-slate-950">Cloud Checkin</h1>
            <p className="mt-1 text-sm text-slate-500">输入访问密码进入站点管理。</p>
          </div>
        </div>
        <label className="label mt-6" htmlFor="password">访问密码</label>
        <input
          id="password"
          className="field"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          autoFocus
        />
        {error ? <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
        <button className="btn btn-primary mt-5 w-full" disabled={loading || !password}>
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </main>
  )
}

function SiteFormModal({ site, open, saving, onClose, onSaved }: {
  site: ApiSite | null
  open: boolean
  saving: boolean
  onClose: () => void
  onSaved: (payload: SiteFormPayload) => Promise<void>
}) {
  const [form, setForm] = useState<SiteFormPayload>(EMPTY_FORM)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(site ? {
      name: site.name || '',
      url: site.url || '',
      api_type: site.api_type || 'NewApi',
      auth_method: site.auth_method || 'sessions',
      auth_value: site.auth_value || '',
      user_id: site.user_id || '',
      login_username: site.login_username || '',
      login_password: site.login_password || '',
      enabled: site.enabled !== false,
      auto_checkin: site.auto_checkin !== false,
      remarks: site.remarks || '',
      checkin_endpoint: site.checkin_endpoint || ''
    } : EMPTY_FORM)
  }, [open, site])

  if (!open) return null

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !form.url.trim()) {
      setError('名称和 URL 必填')
      return
    }
    await onSaved({
      ...form,
      name: form.name.trim(),
      url: form.url.trim(),
      checkin_endpoint: form.checkin_endpoint.trim()
    })
  }

  return (
    <ModalShell>
      <form onSubmit={submit} className="w-full max-w-4xl">
        <DialogCard
          title={site ? '编辑站点' : '新增站点'}
          description="认证值和登录密码会按需求明文保存到 D1。"
          icon={<Globe2 size={18} />}
          onClose={onClose}
          size="xl"
          footer={
            <>
              <button type="button" className="btn" onClick={onClose}>取消</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? '保存中...' : '保存'}</button>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">名称</label>
              <input className="field" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
            </div>
            <div>
              <label className="label">URL</label>
              <input className="field" value={form.url} placeholder="https://example.com" onChange={event => setForm({ ...form, url: event.target.value })} />
            </div>
            <div>
              <label className="label">API 类型</label>
              <select className="field" value={form.api_type} onChange={event => setForm({ ...form, api_type: event.target.value })}>
                {SITE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label className="label">认证方式</label>
              <select className="field" value={form.auth_method} onChange={event => setForm({ ...form, auth_method: event.target.value as SiteFormPayload['auth_method'] })}>
                {AUTH_METHODS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">认证值</label>
              <textarea className="field-area" value={form.auth_value} onChange={event => setForm({ ...form, auth_value: event.target.value })} />
            </div>
            <div>
              <label className="label">用户 ID</label>
              <input className="field" value={form.user_id} onChange={event => setForm({ ...form, user_id: event.target.value })} />
            </div>
            <div>
              <label className="label">签到端点</label>
              <input className="field" value={form.checkin_endpoint} placeholder="留空使用默认端点" onChange={event => setForm({ ...form, checkin_endpoint: event.target.value })} />
            </div>
            <div>
              <label className="label">登录用户名</label>
              <input className="field" value={form.login_username} onChange={event => setForm({ ...form, login_username: event.target.value })} />
            </div>
            <div>
              <label className="label">登录密码</label>
              <input className="field" type="password" autoComplete="current-password" value={form.login_password} onChange={event => setForm({ ...form, login_password: event.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">备注</label>
              <textarea className="field-area" value={form.remarks} onChange={event => setForm({ ...form, remarks: event.target.value })} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-700">
            <label className="inline-flex items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2">
              <input type="checkbox" checked={form.enabled} onChange={event => setForm({ ...form, enabled: event.target.checked })} />
              启用站点
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2">
              <input type="checkbox" checked={form.auto_checkin} onChange={event => setForm({ ...form, auto_checkin: event.target.checked })} />
              启用自动签到
            </label>
          </div>

          {error ? <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
        </DialogCard>
      </form>
    </ModalShell>
  )
}

function SiteDetailDrawer({ site, open, busyKey, onClose, onAction }: {
  site: ApiSite | null
  open: boolean
  busyKey: string
  onClose: () => void
  onAction: (key: string, fn: () => Promise<unknown>, okMessage: string) => Promise<void>
}) {
  const [tab, setTab] = useState<'overview' | 'tokens' | 'models' | 'checkin' | 'tasks'>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [models, setModels] = useState<ApiModel[]>([])
  const [checkinLogs, setCheckinLogs] = useState<CheckinLog[]>([])
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([])

  const loadTab = useCallback(async () => {
    if (!site) return
    setLoading(true)
    setError('')
    try {
      if (tab === 'overview') {
        const [tokenRows, modelRows] = await Promise.all([
          ApiSiteGetTokens(site.id).catch(() => []),
          ApiSiteGetModels(site.id).catch(() => ({ models: [] }))
        ])
        setTokens(tokenRows)
        setModels(modelRows.models || [])
      }
      if (tab === 'tokens') setTokens(await ApiSiteGetTokens(site.id))
      if (tab === 'models') setModels((await ApiSiteGetModels(site.id)).models || [])
      if (tab === 'checkin') setCheckinLogs(await ApiSiteGetCheckinLogs(site.id))
      if (tab === 'tasks') {
        const result: Paginated<TaskLog> = await ApiSiteGetTaskLogs(site.id)
        setTaskLogs(result.logs || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [site, tab])

  useEffect(() => {
    if (open) void loadTab()
  }, [open, loadTab])

  if (!open || !site) return null
  const checkinDisabledReason = getCheckinDisabledReason(site)
  const checkinUnsupported = !supportsSiteCheckin(site)
  const checkinUnsupportedMessage = checkinLogs.length
    ? '当前站点类型不支持签到，下方记录为历史签到数据。'
    : '当前站点类型不支持签到，暂无可执行的签到数据。'

  async function runDetailAction(key: string, fn: () => Promise<unknown>, okMessage: string) {
    await onAction(key, fn, okMessage)
    await loadTab()
  }

  return (
    <aside className="drawer-shell">
      <div className="flex items-start justify-between gap-4 border-b border-line p-5">
        <div className="flex min-w-0 items-center gap-3">
          <SiteAvatar site={site} />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-slate-950">{site.name}</h2>
            <p className="mt-1 break-all text-sm text-slate-500">{site.url}</p>
          </div>
        </div>
        <button className="btn-icon" onClick={onClose} aria-label="关闭"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2 border-b border-line bg-slate-50/60 px-5 py-4 sm:grid-cols-4">
        <button
          className="btn"
          disabled={Boolean(busyKey) || Boolean(checkinDisabledReason)}
          title={checkinDisabledReason || '签到'}
          onClick={() => void runDetailAction(`checkin-${site.id}`, () => ApiSiteCheckin(site.id), '签到完成')}
        >
          <ButtonIcon><CheckCircle2 size={16} /></ButtonIcon>签到
        </button>
        <button className="btn" disabled={Boolean(busyKey)} onClick={() => void runDetailAction(`balance-${site.id}`, () => ApiSiteRefreshBalance(site.id), '余额刷新完成')}>
          <ButtonIcon><Database size={16} /></ButtonIcon>余额
        </button>
        <button className="btn" disabled={Boolean(busyKey)} onClick={() => void runDetailAction(`tokens-${site.id}`, () => ApiSiteSyncTokens(site.id), 'Token 同步完成')}>
          <ButtonIcon><KeyRound size={16} /></ButtonIcon>Token
        </button>
        <button className="btn" disabled={Boolean(busyKey)} onClick={() => void runDetailAction(`models-${site.id}`, () => ApiSiteRefreshModels(site.id), '模型刷新完成')}>
          <ButtonIcon><RefreshCcw size={16} /></ButtonIcon>模型
        </button>
      </div>
      <div className="grid grid-cols-6 gap-2 border-b border-line px-5 py-3 sm:flex sm:flex-wrap">
        {[
          { key: 'overview', label: '总览', icon: <List size={16} /> },
          { key: 'tokens', label: 'Token', icon: <KeyRound size={16} /> },
          { key: 'models', label: '模型', icon: <Database size={16} /> },
          { key: 'checkin', label: '签到日志', icon: <CalendarCheck size={16} /> },
          { key: 'tasks', label: '定时任务日志', icon: <FileText size={16} /> }
        ].map(item => (
          <button key={item.key} className={`${tab === item.key ? 'btn btn-primary' : 'btn'} col-span-2 sm:col-auto`} onClick={() => setTab(item.key as typeof tab)}>
            <ButtonIcon>{item.icon}</ButtonIcon>{item.label}
          </button>
        ))}
        <button className="btn col-span-2 sm:ml-auto sm:w-auto" onClick={loadTab} disabled={loading}>
          <ButtonIcon><RotateCcw size={16} /></ButtonIcon>{loading ? '刷新中...' : '刷新'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-surface/60 p-4 sm:p-5">
        {error ? <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {tab === 'overview' ? <SiteOverview site={site} tokenCount={tokens.length} modelCount={models.length} /> : null}
        {tab === 'tokens' ? (
          <TokenList tokens={tokens} />
        ) : null}
        {tab === 'models' ? (
          <SimpleTable
            headers={['模型', '类型', '启用', '创建时间']}
            rows={models.map(model => [model.model_name, model.model_type || '-', model.is_active ? '是' : '否', formatDate(model.created_at)])}
          />
        ) : null}
        {tab === 'checkin' ? (
          <>
            {checkinUnsupported ? (
              <p className="mb-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">{checkinUnsupportedMessage}</p>
            ) : null}
            <SimpleTable
              headers={['时间', '类型', '状态', '奖励', '新余额', 'HTTP', '耗时', '消息']}
              rows={checkinLogs.map(log => [
                formatDate(log.checkin_time),
                formatCheckinType(log.checkin_type),
                <ToneBadge tone={logStatusTone(log.status)}>{formatLogStatus(log.status)}</ToneBadge>,
                formatMoney(log.reward_amount),
                formatMoney(log.new_balance),
                String(log.http_status_code || 0),
                `${log.response_time || 0}ms`,
                <JsonMessagePreview message={log.message} error={log.error_details} />
              ])}
              columnClassNames={DETAIL_CHECKIN_LOG_COLUMNS}
            />
          </>
        ) : null}
        {tab === 'tasks' ? (
          <SimpleTable
            headers={['日期', '定时任务', '状态', '执行时间', '消息']}
            rows={taskLogs.map(log => [
              log.log_date,
              formatTaskType(log.task_type),
              <ToneBadge tone={taskStatusTone(log.status)}>{formatTaskStatus(log.status)}</ToneBadge>,
              formatDate(log.exec_time),
              <JsonMessagePreview message={log.message} error={log.error} />
            ])}
            columnClassNames={DETAIL_TASK_LOG_COLUMNS}
          />
        ) : null}
      </div>
    </aside>
  )
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="soft-card p-4">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function DetailGrid({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-lg border border-line bg-slate-50/80 px-3 py-2">
          <dt className="text-xs font-medium text-slate-500">{label}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-slate-800">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function SiteOverview({ site, tokenCount, modelCount }: { site: ApiSite; tokenCount: number; modelCount: number }) {
  const checkin = getCheckinDisplay(site)
  const hasAffInfo = Boolean(site.site_aff_code || site.site_aff_count || site.site_aff_quota || site.site_aff_history_quota)
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="soft-card p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">余额</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{formatMoney(site.site_quota)}</p>
          <p className="mt-1 text-xs text-slate-500">历史消耗 {formatMoney(site.site_used_quota)}，请求 {site.site_request_count || 0} 次</p>
        </div>
        <div className="soft-card p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">签到状态</p>
          <div className="mt-2"><ToneBadge tone={checkin.tone}>{checkin.text}</ToneBadge></div>
          <p className="mt-2 text-xs text-slate-500">{checkin.hint}</p>
        </div>
        <div className="soft-card p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">同步数据</p>
          <p className="mt-2 text-sm font-medium text-slate-800">Token {tokenCount} 个，模型 {modelCount} 个</p>
          <p className="mt-1 text-xs text-slate-500">余额检查 {formatDate(site.last_check_time)}</p>
        </div>
      </div>

      <DetailBlock title="站点信息">
        <DetailGrid items={[
          ['名称', site.name],
          ['URL', site.url],
          ['API 类型', site.api_type],
          ['用户 ID', site.user_id || '-'],
          ['站点用户', site.site_username || '-'],
          ['用户分组', site.site_user_group || '-'],
          ['启用状态', site.enabled ? '启用' : '禁用'],
          ['自动签到', site.auto_checkin ? '启用' : '禁用'],
          ['签到端点', site.checkin_endpoint || '默认端点'],
          ['创建时间', formatDate(site.created_at)],
          ['更新时间', formatDate(site.updated_at)]
        ]} />
      </DetailBlock>

      <DetailBlock title="认证配置">
        <DetailGrid items={[
          ['认证方式', site.auth_method],
          ['认证值', maskSecret(site.auth_value)],
          ['登录用户名', site.login_username || '-'],
          ['登录密码', maskSecret(site.login_password)]
        ]} />
      </DetailBlock>

      {hasAffInfo ? (
        <DetailBlock title="邀请信息">
          <DetailGrid items={[
            ['邀请码', site.site_aff_code || '-'],
            ['邀请数', site.site_aff_count || 0],
            ['待提现', formatMoney(site.site_aff_quota)],
            ['总收益', formatMoney(site.site_aff_history_quota)]
          ]} />
        </DetailBlock>
      ) : null}

      <DetailBlock title="备注">
        <p className="whitespace-pre-wrap break-words rounded-lg border border-line bg-slate-50/80 px-3 py-2 text-sm text-slate-700">{site.remarks || '-'}</p>
      </DetailBlock>
    </div>
  )
}

function TokenList({ tokens }: { tokens: ApiToken[] }) {
  if (!tokens.length) {
    return <div className="soft-card px-4 py-8 text-center text-sm text-slate-500">暂无 Token</div>
  }
  return (
    <div>
      <div className="grid gap-3 md:hidden">
        {tokens.map(token => (
          <article key={token.id} className="soft-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="break-words text-sm font-semibold text-slate-950">{token.token_name || '-'}</h4>
                <div className="mt-2">
                  <TokenKeyValue tokenKey={token.token_key} />
                </div>
              </div>
              <ToneBadge tone={token.is_active === 1 ? 'success' : 'danger'}>{token.is_active === 1 ? '启用' : '禁用'}</ToneBadge>
            </div>
            <DetailGrid items={[
              ['分组', token.token_group || 'default'],
              ['总额度', formatTokenQuota(token)],
              ['已用额度', formatMoney(token.token_used_quota)],
              ['剩余额度', formatTokenRemainingQuota(token)],
              ['创建时间', formatDate(token.created_time)],
              ['访问时间', formatDate(token.accessed_time)],
              ['过期时间', formatTokenExpiry(token.expired_time)]
            ]} />
          </article>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-lg border border-line bg-white md:block">
        <table className="w-full table-fixed divide-y divide-line text-sm">
          <thead className="bg-slate-50/80 text-left text-xs text-slate-500">
            <tr>
              <th className="w-[15%] px-3 py-2 font-semibold">名称</th>
              <th className="w-[29%] px-3 py-2 font-semibold">密钥</th>
              <th className="w-[9%] px-3 py-2 font-semibold">分组</th>
              <th className="w-[8%] px-3 py-2 font-semibold">状态</th>
              <th className="w-[10%] px-3 py-2 font-semibold">总额度</th>
              <th className="w-[10%] px-3 py-2 font-semibold">已用</th>
              <th className="w-[10%] px-3 py-2 font-semibold">剩余</th>
              <th className="w-[9%] px-3 py-2 font-semibold">过期</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {tokens.map(token => (
              <tr key={token.id}>
                <td className="px-3 py-2 align-top text-slate-800"><span className="line-clamp-2 break-words">{token.token_name || '-'}</span></td>
                <td className="px-3 py-2 align-top">
                  <TokenKeyValue tokenKey={token.token_key} />
                </td>
                <td className="px-3 py-2 align-top text-slate-700">{token.token_group || 'default'}</td>
                <td className="px-3 py-2 align-top"><ToneBadge tone={token.is_active === 1 ? 'success' : 'danger'}>{token.is_active === 1 ? '启用' : '禁用'}</ToneBadge></td>
                <td className="px-3 py-2 align-top font-medium text-slate-950">{formatTokenQuota(token)}</td>
                <td className="px-3 py-2 align-top text-slate-700">{formatMoney(token.token_used_quota)}</td>
                <td className="px-3 py-2 align-top text-slate-700">{formatTokenRemainingQuota(token)}</td>
                <td className="px-3 py-2 align-top text-slate-600">{formatTokenExpiry(token.expired_time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TokenKeyValue({ tokenKey }: { tokenKey: string }) {
  const placeholder = isPlaceholderTokenKey(tokenKey)
  return (
    <div className="space-y-1">
      <code className="block break-all rounded-lg border border-line bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700">{maskTokenKey(tokenKey)}</code>
      {placeholder ? (
        <p className="text-xs text-amber-700">本地不是完整密钥，不能复制。</p>
      ) : (
        <button className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900" onClick={() => navigator.clipboard?.writeText(tokenKey)}>
          <Copy className="h-3.5 w-3.5" />
          复制完整密钥
        </button>
      )}
    </div>
  )
}

function SimpleTable({ headers, rows, mobile = 'generic', columnClassNames = [] }: {
  headers: string[]
  rows: ReactNode[][]
  mobile?: 'generic' | 'none'
  columnClassNames?: string[]
}) {
  if (!rows.length) {
    return <div className="soft-card px-4 py-8 text-center text-sm text-slate-500">暂无数据</div>
  }
  return (
    <div>
      {mobile === 'generic' ? (
        <div className="grid min-w-0 gap-3 md:hidden">
          {rows.map((row, rowIndex) => (
            <article key={rowIndex} className="soft-card min-w-0 p-4">
              <dl className="grid gap-3">
                {headers.map((header, cellIndex) => (
                  <div key={header} className="min-w-0">
                    <dt className="text-xs font-medium text-slate-500">{header}</dt>
                    <dd className="mt-1 min-w-0 text-sm text-slate-800">{renderLogCell(row[cellIndex])}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      ) : null}
      <div className="hidden overflow-hidden rounded-lg border border-line bg-white md:block">
        <table className="w-full table-fixed divide-y divide-line text-sm">
          <thead className="bg-slate-50/80 text-left text-xs text-slate-500">
            <tr>{headers.map((header, index) => <th key={header} className={`px-2 py-2 font-semibold ${columnClassNames[index] || ''}`}>{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => <td key={cellIndex} className="px-2 py-3 align-top leading-5 text-slate-700">{renderLogCell(cell)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function renderLogCell(cell: ReactNode): ReactNode {
  if (cell == null || cell === '') return <span>-</span>
  if (typeof cell === 'string' || typeof cell === 'number') {
    return <span className="block max-w-full truncate" title={String(cell)}>{cell}</span>
  }
  return cell
}

function JsonMessagePreview({ message, error }: {
  message?: string | null
  error?: string | null
}) {
  const raw = getLogMessageRaw(message, error)
  if (!raw) return <span>-</span>
  const parsed = parseJsonMessage(raw)
  const preview = formatStructuredMessage(raw)
  if (parsed === null) {
    return <span className="block max-w-full truncate" title={raw}>{preview}</span>
  }
  return (
    <details className="group min-w-0 max-w-full">
      <summary className="flex min-w-0 cursor-pointer list-none items-center gap-1 overflow-hidden leading-5 text-slate-700">
        <span className="block min-w-0 flex-1 truncate" title={preview}>{preview}</span>
        <span className="inline-flex h-4 shrink-0 items-center rounded border border-line bg-slate-50 px-1 text-[10px] font-semibold leading-none text-slate-500 group-open:bg-brandSoft group-open:text-brand">JSON</span>
      </summary>
      <pre className="mt-2 max-h-64 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md border border-line bg-slate-950 p-3 text-xs leading-relaxed text-slate-100">{JSON.stringify(parsed, null, 2)}</pre>
    </details>
  )
}
function LogMobileCards({ tab, checkinLogs, taskLogs }: {
  tab: 'checkin' | 'task'
  checkinLogs: CheckinLog[]
  taskLogs: TaskLog[]
}) {
  if (tab === 'checkin') {
    return (
      <div className="grid min-w-0 gap-3 md:hidden">
        {checkinLogs.map(log => (
          <article key={log.id} className="soft-card min-w-0 p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-950">{log.site_name || `#${log.api_site_id ?? '-'}`}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(log.checkin_time)}</p>
              </div>
              <ToneBadge tone={logStatusTone(log.status)}>{formatLogStatus(log.status)}</ToneBadge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3">
              <div className="min-w-0">
                <dt className="text-xs text-slate-500">签到类型</dt>
                <dd className="mt-1 truncate text-sm text-slate-800">{formatCheckinType(log.checkin_type)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-slate-500">余额</dt>
                <dd className="mt-1 truncate text-sm font-semibold text-slate-950">{formatMoney(log.new_balance)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-slate-500">奖励</dt>
                <dd className="mt-1 truncate text-sm text-slate-800">{formatMoney(log.reward_amount)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-slate-500">耗时 / HTTP</dt>
                <dd className="mt-1 truncate text-sm text-slate-800">{log.response_time || 0}ms / {log.http_status_code || 0}</dd>
              </div>
            </dl>
            <div className="mt-3 min-w-0 text-sm text-slate-600"><JsonMessagePreview message={log.message} error={log.error_details} /></div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className="grid min-w-0 gap-3 md:hidden">
      {taskLogs.map(log => (
        <article key={log.id} className="soft-card min-w-0 p-4">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-950">{log.site_name || `#${log.api_site_id ?? '-'}`}</p>
              <p className="mt-1 text-xs text-slate-500">{log.log_date}</p>
            </div>
            <ToneBadge tone={taskStatusTone(log.status)}>{formatTaskStatus(log.status)}</ToneBadge>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3">
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">定时任务</dt>
              <dd className="mt-1 truncate text-sm text-slate-800">{formatTaskType(log.task_type)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">执行时间</dt>
              <dd className="mt-1 truncate text-sm text-slate-800">{formatDate(log.exec_time)}</dd>
            </div>
          </dl>
          <div className="mt-3 min-w-0 text-sm text-slate-600"><JsonMessagePreview message={log.message} error={log.error} /></div>
        </article>
      ))}
    </div>
  )
}

function DeleteConfirmModal({ site, deleting, confirmName, onConfirmNameChange, onClose, onConfirm }: {
  site: ApiSite | null
  deleting: boolean
  confirmName: string
  onConfirmNameChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}) {
  if (!site) return null
  const currentSite = site

  async function copyName() {
    await navigator.clipboard?.writeText(currentSite.name).catch(() => undefined)
    onConfirmNameChange(currentSite.name)
  }

  return (
    <ModalShell>
      <DialogCard
        title="删除确认"
        description="此操作不可撤销，请输入站点名称以确认删除。"
        icon={<Trash2 size={18} />}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose}>取消</button>
            <button className="btn btn-danger" disabled={deleting || confirmName !== currentSite.name} onClick={onConfirm}>
              <ButtonIcon><Trash2 size={16} /></ButtonIcon>{deleting ? '删除中...' : '确定删除'}
            </button>
          </>
        }
      >
        <button
          type="button"
          className="mt-5 flex w-full items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-left font-mono text-sm font-semibold text-red-700 hover:border-red-200 hover:bg-red-100"
          onClick={() => void copyName()}
        >
          <span className="truncate">{currentSite.name}</span>
          <span className="ml-3 inline-flex items-center gap-1 text-xs font-medium text-red-500"><Copy size={13} />点击复制</span>
        </button>
        <label className="label mt-5">请输入站点名称</label>
        <input
          className="field"
          value={confirmName}
          onChange={event => onConfirmNameChange(event.target.value)}
          autoFocus
          onKeyDown={event => {
            if (event.key === 'Enter' && confirmName === currentSite.name) onConfirm()
          }}
        />
      </DialogCard>
    </ModalShell>
  )
}

function SiteMobileCard({ site, onDetail, onEdit, onDelete }: {
  site: ApiSite
  onDetail: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const checkin = getCheckinDisplay(site)
  return (
    <article className="soft-card p-4">
      <div className="grid grid-cols-[auto,minmax(0,1fr),auto] items-center gap-3">
        <SiteAvatar site={site} />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-slate-950">{site.name}</h3>
          <p className="mt-1 truncate text-sm text-slate-500">{site.url}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">{site.api_type}</span>
            <StatusBadge enabled={site.enabled}>{site.enabled ? '启用' : '未启用'}</StatusBadge>
          </div>
        </div>
        <button className="btn-icon h-10 w-10 border-transparent bg-slate-50 shadow-none" onClick={onDetail} aria-label="详情">
          <MoreHorizontal size={20} />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-[1fr,auto] items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ToneBadge tone={checkin.tone}>{checkin.text}</ToneBadge>
          </div>
          <p className="mt-1 text-sm text-slate-500">{checkin.hint}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-slate-950">{formatMoney(site.site_quota)}</p>
          <p className="mt-1 text-sm text-slate-500">已用 {formatMoney(site.site_used_quota)}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
        <button className="btn h-9" onClick={onDetail}><ButtonIcon><Eye size={16} /></ButtonIcon>详情</button>
        <button className="btn h-9" onClick={onEdit}><ButtonIcon><Edit3 size={16} /></ButtonIcon>编辑</button>
        <button className="btn btn-danger h-9" onClick={onDelete}><ButtonIcon><Trash2 size={16} /></ButtonIcon>删除</button>
      </div>
    </article>
  )
}

function BatchProgressPanel({ progress }: { progress: BatchProgress }) {
  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  return (
    <section className="mt-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-950">{progress.title}</p>
          <p className="mt-1 text-sm text-blue-800">
            {progress.phase}{progress.currentName ? `：${progress.currentName}` : ''} ({progress.current}/{progress.total})
          </p>
        </div>
        <p className="text-xs text-blue-700">
          成功 {progress.success} / 失败 {progress.failed}{progress.skipped ? ` / 跳过 ${progress.skipped}` : ''}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
      </div>
    </section>
  )
}

function Manager({ onLogout }: { onLogout: () => void }) {
  const [sites, setSites] = useState<ApiSite[]>([])
  const [stats, setStats] = useState<TodayCheckinStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingSite, setEditingSite] = useState<ApiSite | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [detailSite, setDetailSite] = useState<ApiSite | null>(null)
  const [deleteSite, setDeleteSite] = useState<ApiSite | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [busyKey, setBusyKey] = useState('')
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<SiteFilter>('all')
  const [actionsOpen, setActionsOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [activePage, setActivePage] = useState<PageKey>(() => getPageFromPath(window.location.pathname))
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [logoutSubmitting, setLogoutSubmitting] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // 列表和今日签到统计互不依赖，并行加载能让首页反馈更快。
      const [siteRows, todayStats] = await Promise.all([
        ApiSiteList(),
        ApiSiteGetTodayCheckinStatistics().catch(() => null)
      ])
      setSites(siteRows)
      setDetailSite(current => current ? siteRows.find(site => site.id === current.id) ?? null : null)
      setStats(todayStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    function syncPageFromUrl() {
      closeMenus()
      setActivePage(getPageFromPath(window.location.pathname))
    }
    window.addEventListener('popstate', syncPageFromUrl)
    return () => window.removeEventListener('popstate', syncPageFromUrl)
  }, [])

  useEffect(() => {
    if (!actionsOpen && !filterOpen) return

    function closeByTarget(target: EventTarget | null) {
      if (!(target instanceof Element)) return
      if (actionsOpen && !target.closest('[data-actions-menu-root="true"]')) {
        setActionsOpen(false)
      }
      if (filterOpen && !target.closest('[data-filter-menu-root="true"]')) {
        setFilterOpen(false)
      }
    }

    function handlePointerDown(event: PointerEvent) {
      closeByTarget(event.target)
    }

    function handleFocusIn(event: FocusEvent) {
      closeByTarget(event.target)
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') closeMenus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [actionsOpen, filterOpen])

  const enabledCount = useMemo(() => sites.filter(site => site.enabled).length, [sites])
  const totalBalance = useMemo(() => sites.reduce((sum, site) => sum + Number(site.site_quota || 0), 0), [sites])
  const usedBalance = useMemo(() => sites.reduce((sum, site) => sum + Number(site.site_used_quota || 0), 0), [sites])
  const visibleSites = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return sites.filter(site => {
      const checkin = getCheckinDisplay(site)
      const matchedKeyword = !keyword || [site.name, site.url, site.api_type].some(value => (value || '').toLowerCase().includes(keyword))
      if (!matchedKeyword) return false
      if (filter === 'enabled') return site.enabled
      if (filter === 'disabled') return !site.enabled
      if (filter === 'signed') return checkin.text === '已签到'
      if (filter === 'unsigned') return checkin.text === '未签到' || checkin.text === '未启用'
      if (filter === 'failed') return checkin.tone === 'danger'
      return true
    })
  }, [filter, query, sites])

  async function action(key: string, fn: () => Promise<unknown>, okMessage: string) {
    // 所有表格行操作统一走这里，确保成功后刷新列表，失败时只展示错误不破坏当前页面状态。
    setBusyKey(key)
    setError('')
    try {
      const result = await fn()
      toast.success(typeof result === 'string' ? result : okMessage)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败')
    } finally {
      setBusyKey('')
    }
  }

  function openCreate() {
    setEditingSite(null)
    setFormOpen(true)
  }

  function openEdit(site: ApiSite) {
    setEditingSite(site)
    setFormOpen(true)
  }

  function openDelete(site: ApiSite) {
    setDeleteSite(site)
    setDeleteConfirmName('')
  }

  async function confirmDelete() {
    if (!deleteSite || deleteConfirmName !== deleteSite.name) return
    setDeleting(true)
    setBusyKey(`delete-${deleteSite.id}`)
    setError('')
    try {
      await ApiSiteDelete(deleteSite.id)
      toast.success('站点删除成功')
      setDeleteSite(null)
      setDeleteConfirmName('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeleting(false)
      setBusyKey('')
    }
  }

  async function runBatchItems(
    title: string,
    phase: string,
    targets: ApiSite[],
    skipped: number,
    delayMs: number,
    run: (site: ApiSite) => Promise<unknown>,
    total = targets.length,
    offset = 0,
    base = { success: 0, failed: 0, skipped: 0 }
  ): Promise<{ success: number; failed: number; skipped: number }> {
    const result = { success: 0, failed: 0, skipped }
    for (let i = 0; i < targets.length; i++) {
      const site = targets[i]
      setBatchProgress({
        title,
        phase,
        current: offset + i + 1,
        total,
        currentName: site.name,
        success: base.success + result.success,
        failed: base.failed + result.failed,
        skipped: base.skipped + result.skipped
      })
      try {
        await run(site)
        result.success += 1
      } catch (err) {
        result.failed += 1
        console.error(`${phase}失败: ${site.name}`, err)
      }
      setBatchProgress({
        title,
        phase,
        current: offset + i + 1,
        total,
        currentName: site.name,
        success: base.success + result.success,
        failed: base.failed + result.failed,
        skipped: base.skipped + result.skipped
      })
      if (i < targets.length - 1) await sleep(delayMs)
    }
    return result
  }

  async function runSingleBatch(
    key: string,
    title: string,
    phase: string,
    targets: ApiSite[],
    skipped: number,
    delayMs: number,
    run: (site: ApiSite) => Promise<unknown>
  ) {
    setBusyKey(key)
    setError('')
    setBatchProgress({ title, phase: '准备执行', current: 0, total: targets.length, currentName: '', success: 0, failed: 0, skipped })
    try {
      const result = await runBatchItems(title, phase, targets, skipped, delayMs, run)
      toast.success(`${title}完成：成功 ${result.success}，失败 ${result.failed}${result.skipped ? `，跳过 ${result.skipped}` : ''}`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${title}失败`)
    } finally {
      setBusyKey('')
      setBatchProgress(null)
    }
  }

  async function runBatchBalance() {
    const targets = sites.filter(site => site.enabled)
    if (!targets.length) {
      toast.error('没有已启用的站点可查询余额')
      return
    }
    await runSingleBatch('batch-balance', '批量查询余额', '正在查询余额', targets, sites.length - targets.length, 500, site => ApiSiteRefreshBalance(site.id))
  }

  async function runBatchCheckin() {
    const targets = sites.filter(site => site.enabled && site.auto_checkin)
    if (!targets.length) {
      toast.error('没有已启用自动签到的站点')
      return
    }
    await runSingleBatch('batch-checkin', '批量签到', '正在签到', targets, sites.length - targets.length, 1000, site => ApiSiteCheckin(site.id))
  }

  async function runBatchTokens() {
    const targets = sites.filter(site => site.enabled)
    if (!targets.length) {
      toast.error('没有已启用的站点可同步 Token')
      return
    }
    await runSingleBatch('batch-tokens', '批量同步 Token', '正在同步 Token', targets, sites.length - targets.length, 1000, site => ApiSiteSyncTokens(site.id))
  }

  async function runBatchAll() {
    const enabledSites = sites.filter(site => site.enabled)
    const checkinSites = sites.filter(site => site.enabled && site.auto_checkin)
    if (!enabledSites.length && !checkinSites.length) {
      toast.error('没有可执行批量操作的站点')
      return
    }
    const total = enabledSites.length + checkinSites.length + enabledSites.length
    let offset = 0
    const aggregate = { success: 0, failed: 0, skipped: 0 }
    setBusyKey('batch-all')
    setError('')
    setBatchProgress({ title: '批量全部', phase: '准备执行', current: 0, total, currentName: '', success: 0, failed: 0, skipped: 0 })
    try {
      const balance = await runBatchItems('批量全部', '[1/3] 查询余额', enabledSites, sites.length - enabledSites.length, 500, site => ApiSiteRefreshBalance(site.id), total, offset, aggregate)
      offset += enabledSites.length
      aggregate.success += balance.success
      aggregate.failed += balance.failed
      aggregate.skipped += balance.skipped

      const checkin = await runBatchItems('批量全部', '[2/3] 签到', checkinSites, sites.length - checkinSites.length, 1000, site => ApiSiteCheckin(site.id), total, offset, aggregate)
      offset += checkinSites.length
      aggregate.success += checkin.success
      aggregate.failed += checkin.failed
      aggregate.skipped += checkin.skipped

      const tokens = await runBatchItems('批量全部', '[3/3] 同步 Token', enabledSites, sites.length - enabledSites.length, 1000, site => ApiSiteSyncTokens(site.id), total, offset, aggregate)
      aggregate.success += tokens.success
      aggregate.failed += tokens.failed
      aggregate.skipped += tokens.skipped

      toast.success(`批量全部完成：余额 成功 ${balance.success}/失败 ${balance.failed}；签到 成功 ${checkin.success}/失败 ${checkin.failed}；Token 成功 ${tokens.success}/失败 ${tokens.failed}`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '批量全部失败')
    } finally {
      setBusyKey('')
      setBatchProgress(null)
    }
  }

  async function saveSite(payload: SiteFormPayload) {
    setSaving(true)
    setError('')
    try {
      if (editingSite) await ApiSiteUpdate(editingSite.id, payload)
      else await ApiSiteCreate(payload)
      setFormOpen(false)
      toast.success('保存成功')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function exportSites() {
    const text = await ApiSiteExport()
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cloud-checkin-sites-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('导出文件已生成')
  }

  async function importSites(file: File): Promise<string> {
    // 导入沿用后端的去重逻辑；前端只负责读取 JSON 文本并展示汇总结果。
    const text = await file.text()
    const result = await ApiSiteImport(text)
    return `导入完成：成功 ${result.success_count}，跳过 ${result.skip_count}，失败 ${result.fail_count}`
  }

  function closeMenus() {
    setActionsOpen(false)
    setFilterOpen(false)
  }

  function navigatePage(page: PageKey) {
    closeMenus()
    setActivePage(page)
    const nextPath = PAGE_PATHS[page]
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ page }, '', nextPath)
    }
  }

  function requestLogout() {
    closeMenus()
    setLogoutConfirmOpen(true)
  }

  function requestConfirmAction(confirm: ConfirmAction) {
    closeMenus()
    setConfirmAction(confirm)
  }

  function confirmPendingAction() {
    const current = confirmAction
    if (!current) return
    setConfirmAction(null)
    current.run()
  }

  async function confirmLogout() {
    setLogoutSubmitting(true)
    try {
      await onLogout()
    } finally {
      setLogoutSubmitting(false)
      setLogoutConfirmOpen(false)
    }
  }

  const filterLabel = SITE_FILTERS.find(item => item.value === filter)?.label || '全部站点'
  const emptyText = loading ? '加载中...' : sites.length ? '没有匹配的站点' : '暂无站点'
  const pageMeta = {
    sites: { title: '站点管理', subtitle: '管理您的站点，自动签到与余额监控' },
    logs: { title: '日志', subtitle: '查看全局签到日志与任务执行记录' },
    settings: { title: '系统设置', subtitle: '系统概览、任务维护与数据操作' }
  }[activePage]
  const navItems: Array<{ key: PageKey; label: string; icon: ReactNode }> = [
    { key: 'sites', label: '站点管理', icon: <List size={18} /> },
    { key: 'logs', label: '日志', icon: <ClipboardList size={18} /> },
    { key: 'settings', label: '系统设置', icon: <Settings size={18} /> }
  ]

  function renderFilterMenu() {
    if (!filterOpen) return null
    return (
      <div className="absolute right-0 top-12 z-30 w-40 overflow-hidden rounded-lg border border-line bg-white p-1 shadow-panel" data-filter-menu-root="true">
        {SITE_FILTERS.map(item => (
          <button
            key={item.value}
            type="button"
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${filter === item.value ? 'bg-brandSoft text-brand' : 'text-slate-600 hover:bg-slate-50'}`}
            onClick={() => {
              setFilter(item.value)
              setFilterOpen(false)
            }}
          >
            {item.label}
            {filter === item.value ? <CircleCheck size={15} /> : null}
          </button>
        ))}
      </div>
    )
  }

  function renderActionMenu() {
    if (!actionsOpen) return null
    const actionClass = 'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-brand'
    function handleImportKeyDown(event: ReactKeyboardEvent<HTMLLabelElement>) {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      event.currentTarget.querySelector<HTMLInputElement>('input[type="file"]')?.click()
    }
    return (
      <div className="absolute right-0 top-12 z-30 w-52 overflow-hidden rounded-lg border border-line bg-white p-1 shadow-panel" data-actions-menu-root="true">
        <button
          type="button"
          className={actionClass}
          onClick={() => requestConfirmAction({
            title: '批量全部',
            description: '将依次查询余额、签到并同步 Token，可能对多个第三方站点发起请求。',
            confirmLabel: '确认批量执行',
            tone: 'warning',
            run: () => void runBatchAll()
          })}
          disabled={Boolean(busyKey)}
        >
          <RefreshCcw size={16} />批量全部
        </button>
        <button
          type="button"
          className={actionClass}
          onClick={() => requestConfirmAction({
            title: '批量查询余额',
            description: '将使用已保存认证信息向所有启用站点查询余额。',
            confirmLabel: '确认查询',
            tone: 'warning',
            run: () => void runBatchBalance()
          })}
          disabled={Boolean(busyKey)}
        >
          <Database size={16} />批量余额
        </button>
        <button
          type="button"
          className={actionClass}
          onClick={() => requestConfirmAction({
            title: '批量签到',
            description: '将使用已保存认证信息向所有启用自动签到的站点发起签到请求。',
            confirmLabel: '确认签到',
            tone: 'warning',
            run: () => void runBatchCheckin()
          })}
          disabled={Boolean(busyKey)}
        >
          <CheckCircle2 size={16} />批量签到
        </button>
        <button
          type="button"
          className={actionClass}
          onClick={() => requestConfirmAction({
            title: '批量同步 Token',
            description: '将使用已保存认证信息向所有启用站点同步 Token 数据。',
            confirmLabel: '确认同步',
            tone: 'warning',
            run: () => void runBatchTokens()
          })}
          disabled={Boolean(busyKey)}
        >
          <KeyRound size={16} />批量 Token
        </button>
        <button type="button" className={actionClass} onClick={() => { closeMenus(); void action('export', exportSites, '导出完成') }} disabled={busyKey === 'export'}>
          <Download size={16} />导出
        </button>
        <label
          className={`${actionClass} cursor-pointer`}
          role="button"
          tabIndex={0}
          onKeyDown={handleImportKeyDown}
        >
          <Upload size={16} />导入
          <input className="hidden" type="file" accept=".json,application/json" onChange={event => {
            const file = event.target.files?.[0]
            closeMenus()
            if (file) void action('import', () => importSites(file), '导入完成')
            event.currentTarget.value = ''
          }} />
        </label>
        <button type="button" className={`${actionClass} text-red-600 hover:bg-red-50 hover:text-red-700`} onClick={requestLogout}>
          <LogOut size={16} />退出
        </button>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-surface text-ink">
      <div className="app-shell">
        <aside className="app-sidebar" data-collapsed={sidebarCollapsed}>
          <button
            className="sidebar-collapse-trigger"
            type="button"
            aria-label={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
            title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
            onClick={() => setSidebarCollapsed(current => !current)}
          >
            {sidebarCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
          <div className={`flex min-w-0 items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <BrandMark />
            {!sidebarCollapsed ? <span className="truncate text-lg font-semibold text-slate-950">Cloud Checkin</span> : null}
          </div>
          <nav className="mt-10 space-y-2">
            {navItems.map(item => (
              <button
                key={item.key}
                title={item.label}
                className={`flex w-full items-center rounded-lg px-4 py-3 text-sm font-semibold transition ${sidebarCollapsed ? 'justify-center px-3' : 'gap-3'} ${activePage === item.key ? 'bg-brandSoft text-brand' : 'text-slate-600 hover:bg-slate-50 hover:text-brand'}`}
                onClick={() => navigatePage(item.key)}
              >
                {item.icon}
                {!sidebarCollapsed ? item.label : null}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-footer-card">
              <p className="text-xs text-slate-500">{sidebarCollapsed ? '余额' : '当前总余额'}</p>
              <p className={`mt-2 font-bold text-slate-950 ${sidebarCollapsed ? 'text-lg' : 'text-2xl'}`}>{formatMoney(totalBalance)}</p>
              {!sidebarCollapsed ? <p className="mt-2 text-sm text-emerald-600">已用 {formatMoney(usedBalance)}</p> : null}
            </div>
            <div className="sidebar-footer-actions">
              <button className="sidebar-footer-action" type="button" title="Admin">
                <span className={`inline-flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
                  <UserRound size={18} />
                  {!sidebarCollapsed ? 'Admin' : null}
                </span>
              </button>
              <button className="sidebar-footer-action" type="button" title="退出登录" onClick={requestLogout}>
                <span className={`inline-flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
                  <LogOut size={16} />
                  {!sidebarCollapsed ? '退出登录' : null}
                </span>
              </button>
            </div>
          </div>
        </aside>

        <section className="page-shell">
          <div className="page-content">
            <header className="md:hidden">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <BrandMark compact />
                  <div className="min-w-0">
                    <h1 className="text-3xl font-bold leading-tight text-slate-950">{pageMeta.title}</h1>
                    <p className="mt-1 text-sm text-slate-500">{pageMeta.subtitle}</p>
                  </div>
                </div>
                {activePage === 'sites' ? (
                  <button className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-soft" onClick={openCreate} aria-label="新增站点">
                    <Plus size={30} />
                  </button>
                ) : null}
              </div>
              <div className={`mt-5 flex gap-2 ${activePage === 'sites' ? '' : 'justify-end'}`}>
                {activePage === 'sites' ? (
                  <>
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        className="field pl-10"
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        placeholder="搜索站点名称或 URL"
                      />
                    </div>
                    <button className="btn-icon h-11 w-11" onClick={() => void load()} disabled={loading} aria-label="刷新">
                      <RotateCcw size={18} />
                    </button>
                    <div className="relative" data-filter-menu-root="true">
                      <button className="btn-icon h-11 w-11" onClick={() => { setActionsOpen(false); setFilterOpen(open => !open) }} aria-label="筛选">
                        <Filter size={19} />
                      </button>
                      {renderFilterMenu()}
                    </div>
                  </>
                ) : null}
                <div className="relative" data-actions-menu-root="true">
                  <button className="btn-icon h-11 w-11" onClick={() => { setFilterOpen(false); setActionsOpen(open => !open) }} aria-label="更多操作">
                    <Menu size={20} />
                  </button>
                  {renderActionMenu()}
                </div>
              </div>
              <nav className="mt-4 grid grid-cols-3 gap-2">
                {navItems.map(item => (
                  <button
                    key={item.key}
                    type="button"
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold transition ${activePage === item.key ? 'bg-brand text-white' : 'border border-line bg-white text-slate-600'}`}
                    onClick={() => navigatePage(item.key)}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </nav>
            </header>

            <header className="hidden items-start justify-between gap-5 md:flex">
              <div>
                <h1 className="text-3xl font-bold text-slate-950">{pageMeta.title}</h1>
                <p className="mt-2 text-sm text-slate-500">{pageMeta.subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {activePage === 'sites' ? (
                  <>
                    <div className="relative w-[340px]">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        className="field pl-10"
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        placeholder="搜索站点名称或 URL..."
                      />
                    </div>
                    <button className="btn h-11 px-3 xl:px-4" onClick={() => void load()} disabled={loading} title="刷新" aria-label="刷新">
                      <ButtonIcon><RotateCcw size={16} /></ButtonIcon><span className="hidden xl:inline">刷新</span>
                    </button>
                    <div className="relative" data-filter-menu-root="true">
                      <button className="btn h-11 px-3 xl:min-w-[104px] xl:px-4" onClick={() => { setActionsOpen(false); setFilterOpen(open => !open) }} title={filterLabel} aria-label={`筛选：${filterLabel}`}>
                        <ButtonIcon><Filter size={16} /></ButtonIcon><span className="hidden xl:inline">{filterLabel}</span><ChevronDown className="hidden xl:block" size={15} />
                      </button>
                      {renderFilterMenu()}
                    </div>
                  </>
                ) : null}
                <div className="relative" data-actions-menu-root="true">
                  <button className="btn h-11 px-3 xl:px-4" onClick={() => { setFilterOpen(false); setActionsOpen(open => !open) }} title="更多操作" aria-label="更多操作">
                    <ButtonIcon><MoreHorizontal size={16} /></ButtonIcon><span className="hidden xl:inline">更多</span>
                  </button>
                  {renderActionMenu()}
                </div>
                {activePage === 'sites' ? (
                  <button className="btn btn-primary h-11 px-3 xl:px-5" onClick={openCreate} title="新增站点" aria-label="新增站点">
                    <ButtonIcon><Plus size={17} /></ButtonIcon><span className="hidden xl:inline">新增站点</span>
                  </button>
                ) : null}
              </div>
            </header>

            {activePage === 'sites' ? (
              <>
                {batchProgress ? <BatchProgressPanel progress={batchProgress} /> : null}

                {error ? <p className="mt-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

                <section className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
                  <StatCard label="总站点" value={sites.length} hint="个站点" tone="blue" icon={<Globe2 size={30} />} />
                  <StatCard label="已启用" value={enabledCount} hint={`${sites.length ? Math.round((enabledCount / sites.length) * 100) : 0}% 启用率`} tone="green" hintTone="success" icon={<CircleCheck size={30} />} />
                  <StatCard label="今日已签到" value={stats?.success_count || 0} hint={`${stats?.checkin_enabled_count || 0} 个可签到`} tone="purple" hintTone="accent" icon={<CalendarCheck size={30} />} />
                  <StatCard label="总余额" value={formatMoney(totalBalance)} hint={`已用 ${formatMoney(usedBalance)}`} tone="orange" icon={<Wallet size={30} />} />
                  <StatCard label="失败" value={stats?.failed_count || 0} hint="失败记录" tone="red" icon={<CircleX size={30} />} />
                </section>

                <section className="mt-5 grid gap-3 md:hidden">
                  {visibleSites.map(site => (
                    <SiteMobileCard
                      key={site.id}
                      site={site}
                      onDetail={() => setDetailSite(site)}
                      onEdit={() => openEdit(site)}
                      onDelete={() => openDelete(site)}
                    />
                  ))}
                  {!visibleSites.length ? (
                    <div className="soft-card px-4 py-10 text-center text-sm text-slate-500">
                      {emptyText}
                    </div>
                  ) : null}
                </section>

                <section className="mt-6 hidden rounded-lg border border-line bg-white shadow-panel md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] table-fixed text-sm">
                      <thead className="border-b border-line bg-white text-left text-xs text-slate-500">
                        <tr>
                          <th className="w-[260px] px-5 py-4 font-medium">站点信息</th>
                          <th className="w-[90px] px-3 py-4 font-medium">类型</th>
                          <th className="w-[82px] px-3 py-4 font-medium">状态</th>
                          <th className="w-[150px] px-3 py-4 font-medium">签到状态</th>
                          <th className="w-[130px] px-3 py-4 font-medium">余额</th>
                          <th className="w-[150px] px-3 py-4 font-medium">最后签到时间</th>
                          <th className="w-[116px] px-3 py-4 font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {visibleSites.map(site => {
                          const checkin = getCheckinDisplay(site)
                          return (
                            <tr key={site.id} className="align-middle transition hover:bg-slate-50/70">
                              <td className="px-5 py-4">
                                <div className="flex min-w-0 items-center gap-3">
                                  <SiteAvatar site={site} />
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-slate-950">{site.name}</p>
                                    <p className="mt-1 truncate text-sm text-slate-500">{site.url}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-4 text-slate-600">{site.api_type}</td>
                              <td className="px-3 py-4"><StatusBadge enabled={site.enabled}>{site.enabled ? '启用' : '未启用'}</StatusBadge></td>
                              <td className="px-3 py-4">
                                <div className="space-y-1">
                                  <ToneBadge tone={checkin.tone}>{checkin.text}</ToneBadge>
                                  <p className="line-clamp-2 text-xs text-slate-500">{checkin.hint}</p>
                                </div>
                              </td>
                              <td className="px-3 py-4">
                                <div className="font-semibold text-slate-950">{formatMoney(site.site_quota)}</div>
                                <div className="mt-1 text-xs text-slate-500">已用 {formatMoney(site.site_used_quota)}</div>
                              </td>
                              <td className="px-3 py-4 text-slate-500">{formatDate(site.last_checkin)}</td>
                              <td className="px-3 py-4">
                                <div className="flex justify-end gap-1">
                                  <button className="btn-icon" onClick={() => setDetailSite(site)} aria-label="详情" title="详情"><Eye size={16} /></button>
                                  <button className="btn-icon" onClick={() => openEdit(site)} aria-label="编辑" title="编辑"><Edit3 size={16} /></button>
                                  <button className="btn-icon btn-danger" onClick={() => openDelete(site)} aria-label="删除" title="删除"><Trash2 size={16} /></button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                        {!visibleSites.length ? (
                          <tr>
                            <td className="px-6 py-12 text-center text-slate-500" colSpan={7}>{emptyText}</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : null}

            {activePage === 'logs' ? <LogsPage /> : null}
            {activePage === 'settings' ? (
              <SettingsPage
                onOpenLogs={() => navigatePage('logs')}
                onLogoutNow={onLogout}
              />
            ) : null}
          </div>
        </section>
      </div>

      <SiteFormModal
        site={editingSite}
        open={formOpen}
        saving={saving}
        onClose={() => setFormOpen(false)}
        onSaved={saveSite}
      />
      <SiteDetailDrawer
        site={detailSite}
        open={Boolean(detailSite)}
        busyKey={busyKey}
        onClose={() => setDetailSite(null)}
        onAction={action}
      />
      <DeleteConfirmModal
        site={deleteSite}
        deleting={deleting}
        confirmName={deleteConfirmName}
        onConfirmNameChange={setDeleteConfirmName}
        onClose={() => setDeleteSite(null)}
        onConfirm={() => void confirmDelete()}
      />
      <LogoutConfirmModal
        open={logoutConfirmOpen}
        loading={logoutSubmitting}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={() => void confirmLogout()}
      />
      <ActionConfirmModal
        action={confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={confirmPendingAction}
      />
    </main>
  )
}

function StatCard({ label, value, hint, tone, hintTone = 'default', icon }: {
  label: string
  value: number | string
  hint: string
  tone: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  hintTone?: 'default' | 'success' | 'accent'
  icon: ReactNode
}) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-violet-50 text-violet-600',
    orange: 'bg-orange-50 text-orange-500',
    red: 'bg-red-50 text-red-500'
  }
  const hintClasses = {
    default: 'text-slate-500',
    success: 'text-emerald-600',
    accent: 'text-violet-600'
  }
  return (
    <div className="soft-card min-w-0 p-3 sm:p-5">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 ${toneClasses[tone]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold leading-tight text-slate-950 tabular-nums sm:text-2xl">{value}</p>
          <p className={`mt-2 truncate text-xs sm:text-sm ${hintClasses[hintTone]}`}>{hint}</p>
        </div>
      </div>
    </div>
  )
}

function LogsPage() {
  const { pageSize, listRef, paginationRef } = useLogPageSize()
  const [tab, setTab] = useState<'checkin' | 'task'>('checkin')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [clearTarget, setClearTarget] = useState<'checkin' | 'task' | null>(null)
  const [checkinData, setCheckinData] = useState<Paginated<CheckinLog>>({ logs: [], total: 0, page: 1, page_size: pageSize, total_pages: 0 })
  const [taskData, setTaskData] = useState<Paginated<TaskLog>>({ logs: [], total: 0, page: 1, page_size: pageSize, total_pages: 0 })
  const toast = useToast()

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize, status: status === 'all' ? undefined : status }
      if (tab === 'checkin') setCheckinData(await ApiCheckinLogs(params))
      else setTaskData(await ApiTaskLogs(params))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '日志加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, status, tab, toast])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  async function clearLogs() {
    if (!clearTarget) return
    setLoading(true)
    try {
      const result = clearTarget === 'checkin' ? await ApiClearCheckinLogs() : await ApiClearTaskLogs()
      toast.success(result.message || '日志已清空')
      setClearTarget(null)
      setPage(1)
      await loadLogs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '清空日志失败')
    } finally {
      setLoading(false)
    }
  }

  const data = tab === 'checkin' ? checkinData : taskData
  const statusOptions = tab === 'checkin'
    ? [
      ['all', '全部状态'],
      ['success', '成功'],
      ['already_checked_in', '已签到'],
      ['failed', '失败'],
      ['error', '错误']
    ]
    : [
      ['all', '全部状态'],
      ['success', '成功'],
      ['failed', '失败'],
      ['pending', '等待']
    ]
  const rows = tab === 'checkin'
    ? checkinData.logs.map(log => [
      log.site_name || `#${log.api_site_id ?? '-'}`,
      formatDate(log.checkin_time),
      formatCheckinType(log.checkin_type),
      formatLogStatus(log.status),
      formatMoney(log.reward_amount),
      formatMoney(log.new_balance),
      String(log.http_status_code || 0),
      `${log.response_time || 0}ms`,
      <JsonMessagePreview message={log.message} error={log.error_details} />
    ])
    : taskData.logs.map(log => [
      log.site_name || `#${log.api_site_id ?? '-'}`,
      log.log_date,
      formatTaskType(log.task_type),
      formatTaskStatus(log.status),
      formatDate(log.exec_time),
      <JsonMessagePreview message={log.message} error={log.error} />
    ])
  const headers = tab === 'checkin'
    ? ['站点', '时间', '类型', '状态', '奖励', '新余额', 'HTTP', '耗时', '消息']
    : ['站点', '日期', '定时任务', '状态', '执行时间', '消息']
  const columnClassNames = tab === 'checkin'
    ? ['w-[14%]', 'w-[15%]', 'w-[10%]', 'w-[8%]', 'w-[8%]', 'w-[10%]', 'w-[7%]', 'w-[7%]', 'w-[21%]']
    : ['w-[18%]', 'w-[13%]', 'w-[12%]', 'w-[10%]', 'w-[17%]', 'w-[30%]']

  return (
    <section className="mt-6 space-y-4">
      <div className="soft-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button className={`${tab === 'checkin' ? 'btn btn-primary' : 'btn'} w-full sm:w-auto`} onClick={() => { setTab('checkin'); setStatus('all'); setPage(1) }}>
              <ButtonIcon><CalendarCheck size={16} /></ButtonIcon>签到日志
            </button>
            <button className={`${tab === 'task' ? 'btn btn-primary' : 'btn'} w-full sm:w-auto`} onClick={() => { setTab('task'); setStatus('all'); setPage(1) }}>
              <ButtonIcon><FileText size={16} /></ButtonIcon>定时任务日志
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select className="field w-full sm:w-40" value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}>
              {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button className="btn w-full sm:w-auto" onClick={() => void loadLogs()} disabled={loading}>
              <ButtonIcon><RotateCcw size={16} /></ButtonIcon>{loading ? '刷新中...' : '刷新'}
            </button>
            <button className="btn btn-danger w-full sm:w-auto" onClick={() => setClearTarget(tab)}>
              <ButtonIcon><Trash2 size={16} /></ButtonIcon>{tab === 'checkin' ? '清空签到日志' : '清空定时任务日志'}
            </button>
          </div>
        </div>
      </div>

      <div ref={listRef}>
        <LogMobileCards tab={tab} checkinLogs={checkinData.logs} taskLogs={taskData.logs} />
        <SimpleTable headers={headers} rows={rows} mobile="none" columnClassNames={columnClassNames} />
      </div>
      <div ref={paginationRef} className="flex flex-col gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <span>共 {data.total} 条，每页 {pageSize} 条，当前第 {data.total_pages ? data.page : 0} / {data.total_pages || 0} 页</span>
        <div className="flex gap-2">
          <button className="btn" disabled={loading || page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>上一页</button>
          <button className="btn" disabled={loading || page >= (data.total_pages || 1)} onClick={() => setPage(current => current + 1)}>下一页</button>
        </div>
      </div>

      <ClearLogsModal
        target={clearTarget}
        loading={loading}
        onClose={() => setClearTarget(null)}
        onConfirm={() => void clearLogs()}
      />
    </section>
  )
}

function ClearLogsModal({ target, loading, onClose, onConfirm }: {
  target: 'checkin' | 'task' | null
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!target) return null
  const label = target === 'checkin' ? '签到日志' : '定时任务日志'
  return (
    <ModalShell>
      <DialogCard
        title={`清空${label}`}
        description={`此操作会删除全部${label}数据，执行后不可撤销。`}
        icon={<AlertTriangle size={18} />}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose}>取消</button>
            <button className="btn btn-danger" disabled={loading} onClick={onConfirm}>
              <ButtonIcon><Trash2 size={16} /></ButtonIcon>{loading ? '清空中...' : '确认清空'}
            </button>
          </>
        }
      >
        <div className="modal-note-danger">
          请确认你确实要清空{label}。站点配置不会被删除。
        </div>
      </DialogCard>
    </ModalShell>
  )
}

function LogoutConfirmModal({ open, loading, onClose, onConfirm }: {
  open: boolean
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  return (
    <ModalShell>
      <DialogCard
        title="退出登录"
        description="退出后需要重新输入密码才能继续管理站点和系统设置。"
        icon={<LogOut size={18} />}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose}>取消</button>
            <button className="btn btn-danger" disabled={loading} onClick={onConfirm}>
              <ButtonIcon><LogOut size={16} /></ButtonIcon>{loading ? '退出中...' : '确认退出'}
            </button>
          </>
        }
      >
        <div className="modal-note-danger">
          当前登录态会立即失效，未保存的本地输入不会自动保留。
        </div>
      </DialogCard>
    </ModalShell>
  )
}

function ActionConfirmModal({ action, onClose, onConfirm }: {
  action: ConfirmAction | null
  onClose: () => void
  onConfirm: () => void
}) {
  if (!action) return null
  const icon = action.tone === 'danger' ? <AlertTriangle size={18} /> : <Activity size={18} />
  const buttonClass = action.tone === 'danger' ? 'btn btn-danger' : 'btn btn-primary'
  return (
    <ModalShell>
      <DialogCard
        title={action.title}
        description={action.description}
        icon={icon}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose}>取消</button>
            <button className={buttonClass} onClick={onConfirm}>
              <ButtonIcon><CheckCircle2 size={16} /></ButtonIcon>{action.confirmLabel}
            </button>
          </>
        }
      >
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          请确认你确实要执行该操作。操作开始后会按当前站点配置请求接口，并刷新页面数据。
        </div>
      </DialogCard>
    </ModalShell>
  )
}

function SettingsPage({ onOpenLogs, onLogoutNow }: {
  onOpenLogs: () => void
  onLogoutNow: () => void
}) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSettings(normalizeAppSettings(await ApiGetSettings()))
    } catch (err) {
      setError(err instanceof Error ? err.message : '设置加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const groupedSettings = useMemo(() => {
    if (!settings) return []
    // 分组标题、说明和排序全部跟随接口返回，避免前端自己维护第二套设置文案。
    const categoryMeta = new Map(settings.categories.map(category => [category.key, category]))
    const sections = new Map<string, SettingItem[]>()
    settings.items.forEach(item => {
      const group = sections.get(item.category) || []
      group.push(item)
      sections.set(item.category, group)
    })

    return [...sections.entries()].map(([category, items]) => ({
      category,
      title: categoryMeta.get(category)?.title || category,
      description: categoryMeta.get(category)?.description || '',
      sort_order: categoryMeta.get(category)?.sort_order || Number.MAX_SAFE_INTEGER,
      items
    })).sort((left, right) => left.sort_order - right.sort_order)
  }, [settings])

  function updateSettingItem(key: string, value: string) {
    // 前端始终维护字符串态，提交时再按元数据类型转换，避免输入中途被数字/布尔格式打断。
    setSettings(current => current ? {
      ...current,
      items: current.items.map(item => item.key === key ? { ...item, value } : item)
    } : current)
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault()
    if (!settings) return
    setSaving(true)
    setError('')
    try {
      // 页面内部始终编辑字符串态，提交时再按每个设置项的元数据转换成后端期望的原始类型。
      const updated = await ApiUpdateSettings({
        values: Object.fromEntries(
          settings.items
            .filter(item => item.editable)
            .map(item => [item.key, coerceSettingPayloadValue(item)])
        )
      })
      setSettings(normalizeAppSettings(updated))
      toast.success('系统设置已保存')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存设置失败')
    } finally {
      setSaving(false)
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault()
    setPasswordSaving(true)
    setError('')
    try {
      await ApiUpdatePassword(newPassword, confirmPassword)
      toast.success('登录密码已更新，请重新登录')
      setNewPassword('')
      setConfirmPassword('')
      window.setTimeout(() => onLogoutNow(), 600)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '修改密码失败')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading && !settings) {
    return <section className="mt-6 soft-card px-4 py-10 text-center text-sm text-slate-500">设置加载中...</section>
  }

  if (!settings) {
    return (
      <section className="mt-6 soft-card p-5">
        {error ? <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <button className="btn mt-4" onClick={() => void loadSettings()}>重新加载</button>
      </section>
    )
  }

  return (
    <section className="mt-6 space-y-5">
      {error ? <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <form onSubmit={saveSettings} className="space-y-5">
        <input className="sr-only" name="username" type="text" autoComplete="username" value="cloud-checkin" readOnly tabIndex={-1} aria-hidden="true" />
        <section className="page-section">
          <div className="section-header">
            <div>
              <h2 className="text-lg font-bold text-slate-950">数据库设置概览</h2>
              <p className="mt-1 text-sm text-slate-500">当前系统设置由数据库元数据驱动，表单项会按 `items + values` 同步展示与提交。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ToneBadge tone={settings.auth.database_password_configured ? 'success' : 'warning'}>
                {settings.auth.database_password_configured ? '数据库密码已配置' : '数据库密码未配置'}
              </ToneBadge>
              <ToneBadge tone="info">Cron 来源：wrangler.toml</ToneBadge>
            </div>
          </div>
          <div className="settings-overview-grid">
            <div className="setting-item-card h-full">
              <p className="text-sm font-semibold text-slate-800">密码状态</p>
              <p className="mt-2 text-sm text-slate-700">
                首次密码只用于初始化登录，不在页面明文显示。需要重置时请直接处理数据库或重新初始化本地数据。
              </p>
            </div>
            <div className="setting-item-card h-full">
              <p className="text-sm font-semibold text-slate-800">Cron 同步状态</p>
              <p className="mt-2 text-sm text-slate-700">
                Worker 由 Wrangler 管理时，Cron Triggers 只允许通过配置文件维护。当前页面只读显示，不允许在这里修改。
              </p>
            </div>
            <div className="setting-item-card h-full md:col-span-2 xl:col-span-1">
              <p className="text-sm font-semibold text-slate-800">当前设置项</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{settings.items.length}</p>
              <p className="mt-2 text-xs text-slate-500">其中可编辑 {settings.items.filter(item => item.editable).length} 项，分类 {groupedSettings.length} 组。</p>
            </div>
          </div>
        </section>

        {groupedSettings.map(section => (
          <section key={section.category} className="page-section">
            <div className="section-header">
              <div>
                <h2 className="text-lg font-bold text-slate-950">{section.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{section.description}</p>
              </div>
              <ToneBadge tone="info">{`${section.items.length} 项`}</ToneBadge>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {section.items.map(item => (
                <div key={item.key} className={item.type === 'boolean' ? '' : 'setting-item-card'}>
                  {item.type === 'boolean' ? (
                    <label className="setting-boolean-card">
                      <div>
                        <span className="label mb-2">{item.label}</span>
                        <p className="text-sm text-slate-700">{item.description}</p>
                      </div>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={item.value === 'true'}
                          disabled={!item.editable}
                          onChange={event => updateSettingItem(item.key, String(event.target.checked))}
                        />
                        {item.value === 'true' ? '已启用' : '已关闭'}
                      </span>
                    </label>
                  ) : (
                    <>
                      <input
                        className={`field ${item.type === 'cron' ? 'font-mono' : ''}`}
                        type={item.type === 'number' ? 'number' : item.type === 'secret' ? 'password' : 'text'}
                        autoComplete={item.type === 'secret' ? 'off' : undefined}
                        min={item.options?.min}
                        max={item.options?.max}
                        step={item.options?.step}
                        placeholder={item.options?.placeholder}
                        value={item.value}
                        disabled={!item.editable}
                        onChange={event => updateSettingItem(item.key, event.target.value)}
                      />
                      <label className="label mt-3">{item.label}</label>
                      <p className="text-xs text-slate-500">{formatSettingDescription(item)}</p>
                      <p className="mt-2 text-[11px] text-slate-400">
                        键名：{item.key}
                        {item.updated_at ? ` · 最近更新：${formatDate(item.updated_at)}` : ''}
                        {!item.editable ? ' · 当前为只读项' : ''}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="setting-action-bar">
          <button className="btn" type="button" onClick={onOpenLogs}><ClipboardList size={16} />查看日志</button>
          <button className="btn" type="button" onClick={() => void loadSettings()} disabled={loading}><RotateCcw size={16} />重新加载</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? '保存中...' : '保存系统设置'}</button>
        </div>
      </form>

      <form onSubmit={savePassword} className="page-section">
        <input className="sr-only" name="username" type="text" autoComplete="username" value="cloud-checkin" readOnly tabIndex={-1} aria-hidden="true" />
        <h2 className="text-lg font-bold text-slate-950">修改登录密码</h2>
        <p className="mt-1 text-sm text-slate-500">保存后会写入 D1 哈希，并退出当前会话让新密码生效。</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">新密码</label>
            <input className="field" type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} />
          </div>
          <div>
            <label className="label">确认新密码</label>
            <input className="field" type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button className="btn btn-primary" disabled={passwordSaving || !newPassword || !confirmPassword}>
            {passwordSaving ? '保存中...' : '保存密码并重新登录'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default function App() {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    AuthMe()
      .then(result => setAuthenticated(result.authenticated))
      .catch(() => setAuthenticated(false))
      .finally(() => setLoading(false))
  }, [])

  async function logout() {
    await AuthLogout()
    setAuthenticated(false)
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">加载中...</div>
  }

  return authenticated ? <Manager onLogout={logout} /> : <LoginView onLoggedIn={() => setAuthenticated(true)} />
}
