/**
 * 平台端点配置
 */
export interface PlatformEndpoints {
  /** 用户信息端点 */
  userInfo: string[]
  /** 模型端点 */
  models: string[]
  /** 签到端点 */
  checkin: string[]
  /** 日志端点 */
  log?: string
  /** 兑换端点 */
  redeem?: string
  /** Token 端点 */
  tokens: string[]
  /** Token 分组端点 */
  tokenGroups: string[]
}

/**
 * 平台能力配置
 */
export interface PlatformCapabilities {
  /** 是否支持签到 */
  checkin: boolean
  /** 是否支持 Token 管理 */
  tokenManagement: boolean
  /** 是否支持站点检测 */
  siteDetection: boolean
}

/**
 * 平台认证配置
 */
export interface PlatformAuthConfig {
  /** 是否需要用户 ID */
  requiresUserId: boolean
  /** 用户 ID 头列表 */
  userIdHeaders: string[]
  /** 是否支持 Cookie 回退 */
  cookieFallback: boolean
}

/**
 * 平台 Token 配置
 */
export interface PlatformTokenConfig {
  /** 列表分页大小 */
  listPageSize: number
  /** 是否支持远程创建 */
  createRemote: boolean
  /** 是否支持远程删除 */
  deleteRemote: boolean
  /** 是否支持远程更新 */
  updateRemote: false
}

/**
 * 平台余额配置
 */
export interface PlatformBalanceConfig {
  /** 配额转换因子 */
  quotaFactor: number
  /** DoneHub 配额语义 */
  doneHubQuotaSemantics?: boolean
}

/**
 * 平台适配器
 */
export interface PlatformAdapter {
  /** 名称 */
  name: string
  /** 显示名称 */
  displayName: string
  /** 能力配置 */
  capabilities: PlatformCapabilities
  /** 认证配置 */
  auth: PlatformAuthConfig
  /** 端点配置 */
  endpoints: PlatformEndpoints
  /** Token 配置 */
  token: PlatformTokenConfig
  /** 余额配置 */
  balance: PlatformBalanceConfig
  /** 模型解析策略 */
  modelsParseStrategy: 'array' | 'object' | 'openai'
}
