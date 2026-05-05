import { apiRequest } from './http'

/**
 * 认证方法类型
 */
export type AuthMethod = 'token' | 'sessions' | 'password'

/**
 * API 站点接口
 * 表示一个 API 站点的配置和状态信息
 */
export interface ApiSite {
  id: number                    // 站点唯一标识符
  name: string                  // 站点名称
  url: string                   // 站点基础 URL
  api_type: string              // API 类型（NewApi、OneApi、Veloera 等）
  account_label: string | null  // 账户标签（用于区分同一 URL 的多个账户）
  sort_order: number            // 排序顺序（数字越小越靠前）
  auth_method: AuthMethod       // 认证方式（token、sessions、password）
  auth_value: string | null     // 认证值（token 或 session cookie）
  user_id: string | null        // 用户 ID
  login_username: string | null // 登录用户名（密码认证模式）
  login_password: string | null // 登录密码（密码认证模式）
  enabled: boolean              // 是否启用
  auto_checkin: boolean         // 是否自动签到
  site_username: string | null  // 站点用户名（从用户信息接口获取）
  site_user_group: string | null // 站点用户组
  site_aff_code: string | null  // 站点推广码
  site_quota: number            // 站点总配额（已转换为标准单位）
  site_used_quota: number       // 站点已用配额（已转换为标准单位）
  site_request_count: number    // 站点请求次数统计
  site_aff_count: number        // 站点推广次数统计
  site_aff_quota: number        // 站点推广配额
  site_aff_history_quota: number // 站点历史推广配额
  last_checkin: string | null   // 最后签到时间
  last_checkin_status: string | null // 最后签到状态
  last_check_time: string | null // 最后检查时间
  last_check_status: string     // 最后检查状态（pending、success、failed）
  last_check_message: string | null // 最后检查消息
  remarks: string | null        // 备注信息
  checkin_endpoint: string | null // 自定义签到端点（路径或完整 URL）
  created_at: string            // 创建时间
  updated_at: string            // 更新时间
}

/**
 * 站点表单数据接口
 * 用于站点创建和编辑的表单数据
 */
export interface SiteFormPayload {
  name: string                  // 站点名称
  url: string                   // 站点基础 URL
  api_type: string              // API 类型
  account_label: string         // 账户标签
  sort_order: number            // 排序顺序
  auth_method: AuthMethod       // 认证方式
  auth_value: string            // 认证值
  user_id: string               // 用户 ID
  login_username: string        // 登录用户名
  login_password: string        // 登录密码
  enabled: boolean              // 是否启用
  auto_checkin: boolean         // 是否自动签到
  remarks: string               // 备注信息
  checkin_endpoint: string      // 自定义签到端点
}

/**
 * 站点检测请求接口
 */
export interface SiteDetectPayload {
  url: string
  htmlTitle?: string
  fetchTitle?: boolean
  detectPreset?: boolean
}

/**
 * 站点检测结果接口
 * 站点检测功能返回的结果数据
 */
export interface SiteDetectResult {
  input_url: string                     // 输入的 URL
  url: string                           // 处理后的 URL
  canonical_url: string                 // 规范化后的 URL
  url_action: 'none' | 'strip_known_api_suffix' | 'preserve_semantic_path'  // URL 处理动作
  api_type: string                      // 检测到的 API 类型
  api_type_source: string               // API 类型来源（url_hint、html_title 等）
  api_type_confidence: number           // API 类型置信度（0-1）
  site_name: string                     // 站点名称
  site_name_source: string              // 站点名称来源（hostname、html_title 等）
  site_name_confidence: number          // 站点名称置信度（0-1）
  account_label_guess: string | null    // 账户标签猜测
  initialization_preset_id: string | null  // 初始化预设 ID
  initialization_preset_label: string | null  // 初始化预设标签
  supports_checkin: boolean             // 是否支持签到
  requires_user_id: boolean             // 是否需要用户 ID
  default_checkin_endpoint: string      // 默认签到端点
  default_user_info_endpoint: string    // 默认用户信息端点
  default_models_endpoint: string       // 默认模型端点
  recommended_skip_model_fetch: boolean // 是否推荐跳过模型获取
  recommended_models: string[]          // 推荐模型列表
  warnings: string[]                    // 警告信息
}

/**
 * 今日签到统计接口
 */
export interface TodayCheckinStats {
  checkin_enabled_count: number
  success_count: number
  unchecked_count: number
  failed_count: number
}

/**
 * 分页结果接口
 * @param T - 日志类型
 */
export interface Paginated<T> {
  logs: T[]              // 日志列表
  total: number          // 总记录数
  page: number           // 当前页码
  page_size: number      // 每页记录数
  total_pages: number    // 总页数
}

/**
 * API Token 接口
 * 表示一个 API 令牌的详细信息
 */
export interface ApiToken {
  id: number                          // 令牌唯一标识符
  remote_token_id: string | null      // 远程令牌 ID（从平台获取）
  token_key: string                   // 令牌密钥（实际的 API 密钥）
  value_status: 'ready' | 'masked_pending' | 'missing'  // 令牌值状态
  token_name: string | null           // 令牌名称
  token_group: string                 // 令牌分组
  source: string                      // 令牌来源（remote、import）
  is_active: number                   // 是否激活（1=激活，0=未激活）
  token_quota: number | null          // 令牌配额
  token_used_quota: number | null     // 令牌已用配额
  token_unlimited_quota: boolean      // 令牌是否无限配额
  created_time: string | null         // 令牌创建时间（从平台获取）
  accessed_time: string | null        // 令牌访问时间（从平台获取）
  expired_time: string | null         // 令牌过期时间（从平台获取）
  last_synced: string | null          // 最后同步时间
}

/**
 * 远程 Token 创建请求接口
 * 用于创建远程令牌的请求数据
 */
export interface RemoteTokenPayload {
  tokenName: string  // 令牌名称
  group: string      // 令牌分组
}

/**
 * API 站点分组接口
 * 表示相同 URL 的站点分组信息
 */
export interface ApiSiteGroup {
  name: string           // 分组名称
  url: string            // 分组 URL
  api_type: string       // API 类型
  total_sites: number    // 总站点数
  enabled_sites: number  // 启用站点数
  sites: ApiSite[]
}

/**
 * API 模型接口
 * 表示站点支持的 AI 模型信息
 */
export interface ApiModel {
  id: number                    // 模型唯一标识符
  model_name: string            // 模型名称（如 gpt-4o、claude-sonnet）
  model_type: string            // 模型类型（如 chat、embedding）
  is_active: boolean            // 是否激活
  created_at: string            // 创建时间
}

/**
 * 签到日志接口
 * 表示一次签到操作的详细记录
 */
export interface CheckinLog {
  id: number                    // 签到日志唯一标识符
  api_site_id?: number          // 关联的站点 ID
  site_name?: string            // 站点名称
  checkin_time: string          // 签到时间
  checkin_type: string          // 签到类型（manual、auto、batch）
  status: string                // 签到状态（success、failed、skipped）
  message: string | null        // 签到消息
  reward_amount: number | null  // 签到奖励金额
  new_balance: number | null    // 新余额
  response_time: number | null  // 响应时间（毫秒）
  http_status_code: number | null  // HTTP 状态码
  error_details?: string | null // 错误详情
  skip_reason?: string | null   // 跳过原因
  failure_reason?: string | null // 失败原因
  balance_before?: number | null // 签到前余额
  balance_after?: number | null  // 签到后余额
  created_at?: string           // 创建时间
}

/**
 * 任务日志接口
 * 表示一次定时任务执行的详细记录
 */
export interface TaskLog {
  id: number                    // 任务日志唯一标识符
  api_site_id?: number          // 关联的站点 ID
  site_name?: string            // 站点名称
  log_date: string              // 日志日期（YYYY-MM-DD）
  task_type: string             // 任务类型（checkin、sync_token、query_balance）
  status: string                // 任务状态（success、failed）
  message: string | null        // 任务消息
  error: string | null          // 任务错误
  exec_time: string | null      // 执行时间
}

/**
 * 批量操作结果类型
 */
export type BatchOperationResult = Record<string, unknown>

/**
 * 批量更新结果接口
 * 按 URL 批量更新站点的结果
 */
export interface BatchUpdateByUrlResult {
  matched_count: number   // 匹配的站点数
  updated_count: number   // 更新的站点数
  site_ids: number[]      // 更新的站点 ID 列表
}

/**
 * 日志查询参数接口
 * 用于查询日志的参数
 */
export interface LogQueryParams {
  page?: number          // 页码
  page_size?: number     // 每页记录数
  status?: string        // 状态筛选
  site_id?: number       // 站点 ID 筛选
  checkin_type?: string  // 签到类型筛选
  task_type?: string     // 任务类型筛选
}

/**
 * 设置值基础类型
 */
export type SettingValuePrimitive = string | number | boolean

/**
 * 设置值树类型
 */
export type SettingValueTree = {
  [key: string]: SettingValuePrimitive | SettingValueTree
}

/**
 * 设置项接口
 * Settings API 现在拆成两层：
 * 1. `categories` 提供分组标题/说明/排序
 * 2. `items` 提供具体可编辑项和只读展示项
 */
export interface SettingItem {
  key: string                           // 设置键名
  value: string                         // 设置值
  type: 'string' | 'number' | 'boolean' | 'cron' | 'secret'  // 设置类型
  label: string                         // 设置标签（显示名称）
  description: string                   // 设置描述
  category: string                      // 设置分类
  sort_order: number                    // 排序顺序
  editable: boolean                     // 是否可编辑
  options: {                            // 选项配置
    min?: number                        // 最小值
    max?: number                        // 最大值
    step?: number                       // 步长
    unit?: string
    placeholder?: string
  } | null
  updated_at: string | null
}

/**
 * 应用设置接口
 */
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

/**
 * 设置更新请求接口
 */
export interface SettingsUpdatePayload {
  values: Record<string, SettingValuePrimitive>
}

/**
 * 将查询参数转换为 URL 查询字符串
 * @param params - 查询参数
 * @returns string - URL 查询字符串
 */
function toQuery(params: LogQueryParams): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

/**
 * 获取认证状态
 */
export const AuthMe = () => apiRequest<{ authenticated: boolean }>('/api/auth/me')

/**
 * 用户登录
 * @param password - 密码
 */
export const AuthLogin = (password: string) => apiRequest<{ authenticated: boolean }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) })

/**
 * 用户登出
 */
export const AuthLogout = () => apiRequest<{ authenticated: boolean }>('/api/auth/logout', { method: 'POST' })

/**
 * 获取站点列表
 */
export const ApiSiteList = () => apiRequest<ApiSite[]>('/api/sites')

/**
 * 获取分组站点列表
 */
export const ApiSiteGrouped = () => apiRequest<ApiSiteGroup[]>('/api/sites/grouped')

/**
 * 检测站点信息
 * @param payload - 检测请求数据
 */
export const ApiSiteDetect = (payload: SiteDetectPayload) => apiRequest<SiteDetectResult>('/api/sites/detect', {
  method: 'POST',
  body: JSON.stringify(payload)
})

/**
 * 创建站点
 * @param payload - 站点表单数据
 */
export const ApiSiteCreate = (payload: SiteFormPayload) => apiRequest<{ id: number }>('/api/sites', { method: 'POST', body: JSON.stringify(payload) })

/**
 * 更新站点
 * @param id - 站点 ID
 * @param payload - 站点表单数据
 */
export const ApiSiteUpdate = (id: number, payload: SiteFormPayload) => apiRequest<{ id: number }>(`/api/sites/${id}`, { method: 'PUT', body: JSON.stringify(payload) })

/**
 * 批量按 URL 更新站点
 * @param payload - 批量更新数据
 */
export const ApiSiteBatchUpdateByUrl = (payload: Record<string, unknown>) => apiRequest<BatchUpdateByUrlResult>('/api/sites/batch-update-by-url', { method: 'POST', body: JSON.stringify(payload) })

/**
 * 重新绑定站点认证
 * @param id - 站点 ID
 * @param payload - 认证数据
 */
export const ApiSiteRebindAuth = (id: number, payload: Partial<SiteFormPayload>) => apiRequest<{ id: number }>(`/api/sites/${id}/rebind-auth`, { method: 'POST', body: JSON.stringify(payload) })

/**
 * 删除站点
 * @param id - 站点 ID
 */
export const ApiSiteDelete = (id: number) => apiRequest<{ id: number }>(`/api/sites/${id}`, { method: 'DELETE' })

/**
 * 签到
 * @param id - 站点 ID
 */
export const ApiSiteCheckin = (id: number) => apiRequest(`/api/sites/${id}/checkin`, { method: 'POST' })

/**
 * 刷新余额
 * @param id - 站点 ID
 */
export const ApiSiteRefreshBalance = (id: number) => apiRequest(`/api/sites/${id}/refresh-balance`, { method: 'POST' })

/**
 * 同步 Token
 * @param id - 站点 ID
 */
export const ApiSiteSyncTokens = (id: number) => apiRequest(`/api/sites/${id}/sync-tokens`, { method: 'POST' })

/**
 * 刷新站点模型列表
 * 从平台重新获取模型信息并更新本地数据库
 * @param id - 站点 ID
 * @returns Promise<void>
 */
export const ApiSiteRefreshModels = (id: number) => apiRequest(`/api/sites/${id}/models/refresh`, { method: 'POST' })

/**
 * 批量刷新余额
 * @param siteIds - 站点 ID 列表
 */
export const ApiSiteBatchRefreshBalance = (siteIds: number[]) => apiRequest<BatchOperationResult>('/api/sites/batch-refresh-balance', { method: 'POST', body: JSON.stringify({ site_ids: siteIds }) })

/**
 * 批量签到
 * @param siteIds - 站点 ID 列表
 */
export const ApiSiteBatchCheckin = (siteIds: number[]) => apiRequest<BatchOperationResult>('/api/sites/batch-checkin', { method: 'POST', body: JSON.stringify({ site_ids: siteIds }) })

/**
 * 批量同步 Token
 * @param siteIds - 站点 ID 列表
 */
export const ApiSiteBatchSyncTokens = (siteIds: number[]) => apiRequest<BatchOperationResult>('/api/sites/batch-sync-tokens', { method: 'POST', body: JSON.stringify({ site_ids: siteIds }) })

/**
 * 获取站点 Token 列表
 * @param id - 站点 ID
 */
export const ApiSiteGetTokens = (id: number) => apiRequest<ApiToken[]>(`/api/sites/${id}/tokens`)

/**
 * 获取远程 Token 分组
 * @param siteId - 站点 ID
 */
export const ApiSiteGetRemoteTokenGroups = (siteId: number) => apiRequest<{ groups: string[] }>(`/api/sites/${siteId}/remote-token-groups`)

/**
 * 创建远程 Token
 * @param siteId - 站点 ID
 * @param payload - Token 数据
 */
export const ApiSiteCreateRemoteToken = (siteId: number, payload: RemoteTokenPayload) => apiRequest<{ ok: boolean }>(`/api/sites/${siteId}/remote-tokens`, {
  method: 'POST',
  body: JSON.stringify(payload)
})

/**
 * 删除远程 Token
 * @param siteId - 站点 ID
 * @param remoteTokenId - 远程 Token ID
 */
export const ApiSiteDeleteRemoteToken = (siteId: number, remoteTokenId: string) => apiRequest<{ ok: boolean }>(`/api/sites/${siteId}/remote-tokens/${encodeURIComponent(remoteTokenId)}`, { method: 'DELETE' })

/**
 * 获取 Token 值
 * @param id - Token ID
 */
export const ApiTokenValue = (id: number) => apiRequest<{ id: number; token_key: string }>(`/api/tokens/${id}/value`)

/**
 * 获取站点模型列表
 * 从本地数据库获取站点支持的模型信息
 * @param id - 站点 ID
 * @returns 包含模型数组的 Promise
 */
export const ApiSiteGetModels = (id: number) => apiRequest<{ models: ApiModel[] }>(`/api/sites/${id}/models`)

/**
 * 获取站点签到日志
 * @param id - 站点 ID
 */
export const ApiSiteGetCheckinLogs = (id: number) => apiRequest<CheckinLog[]>(`/api/sites/${id}/checkin-logs`)

/**
 * 获取站点任务日志
 * @param id - 站点 ID
 */
export const ApiSiteGetTaskLogs = (id: number) => apiRequest<Paginated<TaskLog>>(`/api/sites/${id}/task-logs`)

/**
 * 获取签到日志列表
 * @param params - 查询参数
 */
export const ApiCheckinLogs = (params: LogQueryParams = {}) => apiRequest<Paginated<CheckinLog>>(`/api/checkin-logs${toQuery(params)}`)

/**
 * 获取任务日志列表
 * @param params - 查询参数
 */
export const ApiTaskLogs = (params: LogQueryParams = {}) => apiRequest<Paginated<TaskLog>>(`/api/task-logs${toQuery(params)}`)

/**
 * 清空签到日志
 */
export const ApiClearCheckinLogs = () => apiRequest<{ deleted_count: number; success: boolean; message: string }>('/api/checkin-logs', { method: 'DELETE' })

/**
 * 清空任务日志
 */
export const ApiClearTaskLogs = () => apiRequest<{ deleted_count: number; success: boolean; message: string }>('/api/task-logs', { method: 'DELETE' })

/**
 * 获取应用设置
 */
export const ApiGetSettings = () => apiRequest<AppSettings>('/api/settings')

/**
 * 更新应用设置
 * @param payload - 设置更新数据
 */
export const ApiUpdateSettings = (payload: SettingsUpdatePayload) => apiRequest<AppSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(payload) })

/**
 * 更新密码
 * @param newPassword - 新密码
 * @param confirmPassword - 确认密码
 */
export const ApiUpdatePassword = (newPassword: string, confirmPassword: string) => apiRequest<AppSettings>('/api/settings/password', {
  method: 'PUT',
  body: JSON.stringify({ new_password: newPassword, confirm_password: confirmPassword })
})

/**
 * 获取今日签到统计
 */
export const ApiSiteGetTodayCheckinStatistics = () => apiRequest<TodayCheckinStats>('/api/sites/checkin/today-statistics')

/**
 * 导出站点数据
 */
export const ApiSiteExport = (includeSensitive = true) => apiRequest<string>(`/api/sites/export${includeSensitive ? '?include_sensitive=true' : ''}`)

/**
 * 导入站点数据
 * @param jsonData - JSON 数据
 */
export const ApiSiteImport = (jsonData: string) => apiRequest<{ success_count: number; skip_count: number; fail_count: number }>('/api/sites/import', { method: 'POST', body: JSON.stringify({ jsonData }) })
