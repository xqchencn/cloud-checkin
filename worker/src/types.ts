/**
 * Cloudflare Worker 环境变量接口
 */
export interface Env {
  /** D1 数据库实例 */
  DB: D1Database
  /** 静态资源 fetcher */
  ASSETS: Fetcher
  /** Session 签名密钥 */
  SESSION_SECRET: string
}

/**
 * 设置值类型
 */
export type SettingValueType = 'string' | 'number' | 'boolean' | 'cron' | 'secret'

/**
 * 设置选项元数据
 */
export interface SettingOptionMeta {
  /** 最小值 */
  min?: number
  /** 最大值 */
  max?: number
  /** 步长 */
  step?: number
  /** 单位 */
  unit?: string
  /** 占位符 */
  placeholder?: string
}

/**
 * 公共设置项
 */
export interface PublicSettingItem {
  /** 设置键 */
  key: string
  /** 设置值 */
  value: string
  /** 设置类型 */
  type: SettingValueType
  /** 设置标签 */
  label: string
  /** 设置描述 */
  description: string
  /** 设置分类 */
  category: string
  /** 排序顺序 */
  sort_order: number
  /** 是否可编辑 */
  editable: boolean
  /** 选项元数据 */
  options: SettingOptionMeta | null
  /** 更新时间 */
  updated_at: string | null
}

/**
 * 运行时应用设置
 */
export interface RuntimeAppSettings {
  /** 会话设置 */
  session: {
    /** 会话 TTL 秒数 */
    ttl_seconds: number
  }
  /** 日志设置 */
  logs: {
    /** 日志保留天数 */
    retention_days: number
  }
  /** 调度器设置 */
  scheduler: {
    /** 签到任务 Cron */
    checkin_cron: string
    /** 清理任务 Cron */
    cleanup_cron: string
  }
}

/**
 * 公共应用设置
 */
export interface PublicAppSettings {
  /** 认证设置 */
  auth: {
    /** 数据库密码是否已配置 */
    database_password_configured: boolean
  }
  /** Cloudflare 设置 */
  cloudflare: {
    /** Cron 来源 */
    cron_source: 'wrangler'
    /** Cron 是否可编辑 */
    cron_editable: false
  }
  /** 分类列表 */
  categories: Array<{
    key: string
    title: string
    description: string
    sort_order: number
  }>
  /** 设置项列表 */
  items: PublicSettingItem[]
  /** 运行时设置值 */
  values: RuntimeAppSettings
}

/**
 * 设置更新请求体
 */
export interface SettingsUpdatePayload {
  /** 设置值映射 */
  values?: Record<string, string | number | boolean>
}

/**
 * 密码更新请求体
 */
export interface PasswordUpdatePayload {
  /** 新密码 */
  new_password?: string
  /** 确认密码 */
  confirm_password?: string
}

/**
 * API 错误响应体
 */
export interface ApiErrorBody {
  success: false
  error: {
    code: string
    message: string
  }
}

/**
 * API 成功响应体
 */
export interface ApiSuccessBody<T> {
  success: true
  data: T
}

/**
 * API 站点信息
 */
export interface ApiSite {
  /** 站点 ID */
  id: number
  /** 站点名称 */
  name: string
  /** 站点 URL */
  url: string
  /** API 类型 */
  api_type: string
  /** 账号标签 */
  account_label: string | null
  /** 排序顺序 */
  sort_order: number
  /** 认证方式 */
  auth_method: AuthMethod
  /** 认证值 */
  auth_value: string | null
  /** 用户 ID */
  user_id: string | null
  /** 登录用户名 */
  login_username: string | null
  /** 登录密码 */
  login_password: string | null
  /** 是否启用 */
  enabled: boolean
  /** 是否自动签到 */
  auto_checkin: boolean
  /** 站点用户名 */
  site_username: string | null
  /** 站点用户组 */
  site_user_group: string | null
  /** 站点邀请码 */
  site_aff_code: string | null
  /** 站点配额 */
  site_quota: number
  /** 站点已用配额 */
  site_used_quota: number
  /** 站点请求次数 */
  site_request_count: number
  /** 站点邀请次数 */
  site_aff_count: number
  /** 站点邀请配额 */
  site_aff_quota: number
  /** 站点历史邀请配额 */
  site_aff_history_quota: number
  /** 最后签到时间 */
  last_checkin: string | null
  /** 最后签到状态 */
  last_checkin_status: string | null
  /** 最后检查时间 */
  last_check_time: string | null
  /** 最后检查状态 */
  last_check_status: string
  /** 最后检查消息 */
  last_check_message: string | null
  /** 备注 */
  remarks: string | null
  /** 签到端点 */
  checkin_endpoint: string | null
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

/**
 * 认证方式
 */
export type AuthMethod = 'token' | 'sessions' | 'password'

/**
 * API 站点输入
 */
export interface ApiSiteInput {
  /** 站点名称 */
  name: string
  /** 站点 URL */
  url: string
  /** API 类型 */
  api_type: string
  /** 账号标签 */
  account_label?: string
  /** 排序顺序 */
  sort_order?: number
  /** 认证方式 */
  auth_method: AuthMethod
  /** 认证值 */
  auth_value?: string
  /** 用户 ID */
  user_id?: string
  /** 登录用户名 */
  login_username?: string
  /** 登录密码 */
  login_password?: string
  /** 是否启用 */
  enabled: boolean
  /** 是否自动签到 */
  auto_checkin: boolean
  /** 备注 */
  remarks?: string
  /** 签到端点 */
  checkin_endpoint?: string
}

/**
 * API 站点 Token
 */
export interface ApiSiteToken {
  /** Token ID */
  id: number
  /** 站点 ID */
  api_site_id: number
  /** 远程 Token ID */
  remote_token_id: string | null
  /** Token 键 */
  token_key: string
  /** Token 值状态 */
  value_status: 'ready' | 'masked_pending' | 'missing'
  /** Token 名称 */
  token_name: string | null
  /** Token 分组 */
  token_group: string
  /** 来源 */
  source: string
  /** 是否激活 */
  is_active: number
  /** Token 配额 */
  token_quota: number | null
  /** Token 已用配额 */
  token_used_quota: number | null
  /** Token 无限配额 */
  token_unlimited_quota: boolean
  /** 创建时间 */
  created_time: string | null
  /** 访问时间 */
  accessed_time: string | null
  /** 过期时间 */
  expired_time: string | null
  /** 最后同步时间 */
  last_synced: string | null
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

/**
 * API 站点模型
 */
export interface ApiSiteModel {
  /** 模型 ID */
  id: number
  /** 站点 ID */
  site_id: number
  /** 模型名称 */
  model_name: string
  /** 模型类型 */
  model_type: string
  /** 是否激活 */
  is_active: boolean
  /** 创建时间 */
  created_at: string
}

/**
 * 签到结果
 */
export interface CheckinResult {
  /** 站点 ID */
  api_site_id: number
  /** 签到状态 */
  status: 'success' | 'already_checked_in' | 'skipped' | 'failed' | 'error'
  /** 签到消息 */
  message: string
  /** 奖励金额 */
  reward_amount: number
  /** 新余额 */
  new_balance: number
  /** 签到时间 */
  checkin_time: string
  /** 响应时间 */
  response_time: number
  /** HTTP 状态码 */
  http_status_code: number
}

/**
 * 签到日志
 */
export interface CheckinLog {
  /** 日志 ID */
  id: number
  /** 站点 ID */
  api_site_id: number
  /** 站点名称 */
  site_name?: string
  /** 签到时间 */
  checkin_time: string
  /** 签到类型 */
  checkin_type: string
  /** 状态 */
  status: string
  /** 消息 */
  message: string | null
  /** 奖励金额 */
  reward_amount: number | null
  /** 新余额 */
  new_balance: number | null
  /** 响应时间 */
  response_time: number | null
  /** HTTP 状态码 */
  http_status_code: number | null
  /** 错误详情 */
  error_details: string | null
  /** 跳过原因 */
  skip_reason: string | null
  /** 失败原因 */
  failure_reason: string | null
  /** 余额之前 */
  balance_before: number | null
  /** 余额之后 */
  balance_after: number | null
  /** 创建时间 */
  created_at: string
}

/**
 * 任务日志显示
 */
export interface TaskLogDisplay {
  /** 日志 ID */
  id: number
  /** 站点 ID */
  api_site_id: number
  /** 站点名称 */
  site_name: string
  /** 日志日期 */
  log_date: string
  /** 任务类型 */
  task_type: 'checkin' | 'sync_token' | 'query_balance'
  /** 状态 */
  status: string
  /** 消息 */
  message: string | null
  /** 错误 */
  error: string | null
  /** 执行时间 */
  exec_time: string | null
}

/**
 * 分页响应
 */
export interface Paginated<T> {
  /** 日志列表 */
  logs: T[]
  /** 总数 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页数量 */
  page_size: number
  /** 总页数 */
  total_pages: number
}
