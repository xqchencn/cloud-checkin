export interface PlatformEndpoints {
  userInfo: string[]
  models: string[]
  checkin: string[]
  log?: string
  redeem?: string
  tokens: string[]
  tokenGroups: string[]
}

export interface PlatformCapabilities {
  checkin: boolean
  tokenManagement: boolean
  siteDetection: boolean
}

export interface PlatformAuthConfig {
  requiresUserId: boolean
  userIdHeaders: string[]
  cookieFallback: boolean
}

export interface PlatformTokenConfig {
  listPageSize: number
  createRemote: boolean
  deleteRemote: boolean
  updateRemote: false
}

export interface PlatformBalanceConfig {
  quotaFactor: number
  doneHubQuotaSemantics?: boolean
}

export interface PlatformAdapter {
  name: string
  displayName: string
  capabilities: PlatformCapabilities
  auth: PlatformAuthConfig
  endpoints: PlatformEndpoints
  token: PlatformTokenConfig
  balance: PlatformBalanceConfig
  modelsParseStrategy: 'array' | 'object' | 'openai'
}
