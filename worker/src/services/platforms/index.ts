import type { PlatformAdapter } from './base'

/** 默认能力配置 */
const defaultCapabilities = {
  checkin: true,
  tokenManagement: false,
  siteDetection: true
}

/** 远程 Token 配置 */
const remoteTokenConfig = {
  listPageSize: 100,
  createRemote: true,
  deleteRemote: true,
  updateRemote: false as const
}

/** New API 兼容的用户头 */
const newApiCompatibleUserHeaders = ['New-API-User', 'new-api-user', 'User-id', 'Rix-Api-User', 'voapi-user', 'neo-api-user']

/** 平台适配器注册表 */
export const platformAdapters: Record<string, PlatformAdapter> = {
  NewApi: {
    name: 'NewApi',
    displayName: 'New API',
    capabilities: { ...defaultCapabilities, tokenManagement: true },
    auth: { requiresUserId: true, userIdHeaders: newApiCompatibleUserHeaders, cookieFallback: true },
    endpoints: {
      userInfo: ['/api/user/self'],
      models: ['/api/user/models', '/v1/models'],
      checkin: ['/api/user/checkin', '/api/user/sign_in'],
      log: '/console/log',
      redeem: '/console/topup',
      tokens: ['/api/token/'],
      tokenGroups: ['/api/user/self/groups', '/api/user_group_map']
    },
    token: remoteTokenConfig,
    balance: { quotaFactor: 500000 },
    modelsParseStrategy: 'array'
  },
  OneApi: {
    name: 'OneApi',
    displayName: 'One API',
    capabilities: { ...defaultCapabilities, tokenManagement: true },
    auth: { requiresUserId: false, userIdHeaders: [], cookieFallback: false },
    endpoints: {
      userInfo: ['/api/user/self'],
      models: ['/v1/models'],
      checkin: ['/api/user/checkin'],
      log: '/console/log',
      redeem: '/console/topup',
      tokens: ['/api/token/'],
      tokenGroups: ['/api/user_group_map', '/api/user/self/groups']
    },
    token: remoteTokenConfig,
    balance: { quotaFactor: 500000 },
    modelsParseStrategy: 'openai'
  },
  OneHub: {
    name: 'OneHub',
    displayName: 'One Hub',
    capabilities: { ...defaultCapabilities, tokenManagement: true },
    auth: { requiresUserId: false, userIdHeaders: [], cookieFallback: false },
    endpoints: {
      userInfo: ['/api/user/self'],
      models: ['/v1/models', '/api/available_model'],
      checkin: ['/api/user/checkin'],
      log: '/panel/log',
      redeem: '/panel/topup',
      tokens: ['/api/token/'],
      tokenGroups: ['/api/user_group_map', '/api/user/self/groups']
    },
    token: remoteTokenConfig,
    balance: { quotaFactor: 500000 },
    modelsParseStrategy: 'object'
  },
  RixApi: {
    name: 'RixApi',
    displayName: 'Rix API',
    capabilities: { ...defaultCapabilities, tokenManagement: true },
    auth: { requiresUserId: true, userIdHeaders: ['Rix-Api-User', ...newApiCompatibleUserHeaders], cookieFallback: true },
    endpoints: {
      userInfo: ['/api/user/self'],
      models: ['/api/user/models', '/v1/models'],
      checkin: ['/api/user/checkin', '/api/user/sign_in', '/panel'],
      log: '/log',
      redeem: '/topup',
      tokens: ['/api/token/'],
      tokenGroups: ['/api/user/self/groups', '/api/user_group_map']
    },
    token: remoteTokenConfig,
    balance: { quotaFactor: 500000 },
    modelsParseStrategy: 'array'
  },
  Veloera: {
    name: 'Veloera',
    displayName: 'Veloera',
    capabilities: { ...defaultCapabilities, tokenManagement: true },
    auth: { requiresUserId: true, userIdHeaders: ['Veloera-User', 'New-API-User', 'User-id'], cookieFallback: false },
    endpoints: {
      userInfo: ['/api/user/self'],
      models: ['/v1/models', '/api/user/models'],
      checkin: ['/api/user/checkin'],
      log: '/console/log',
      redeem: '/console/topup',
      tokens: ['/api/token/'],
      tokenGroups: ['/api/user/self/groups', '/api/user_group_map']
    },
    token: remoteTokenConfig,
    balance: { quotaFactor: 1000000 },
    modelsParseStrategy: 'openai'
  },
  AnyRouter: {
    name: 'AnyRouter',
    displayName: 'Any Router',
    capabilities: { ...defaultCapabilities, tokenManagement: true },
    auth: { requiresUserId: true, userIdHeaders: newApiCompatibleUserHeaders, cookieFallback: true },
    endpoints: {
      userInfo: ['/api/user/self'],
      models: ['/api/user/models', '/v1/models'],
      checkin: ['/api/user/sign_in', '/api/user/checkin'],
      log: '/console/log',
      redeem: '/console/topup',
      tokens: ['/api/token/'],
      tokenGroups: ['/api/user/self/groups', '/api/user_group_map']
    },
    token: remoteTokenConfig,
    balance: { quotaFactor: 500000 },
    modelsParseStrategy: 'array'
  },
  VoApi: {
    name: 'VoApi',
    displayName: 'VoAPI',
    capabilities: { ...defaultCapabilities, tokenManagement: true },
    auth: { requiresUserId: true, userIdHeaders: ['voapi-user', ...newApiCompatibleUserHeaders], cookieFallback: true },
    endpoints: {
      userInfo: ['/api/user/self'],
      models: ['/api/user/models', '/v1/models'],
      checkin: ['/api/user/checkin', '/api/user/sign_in', '/api/user/clock_in'],
      log: '/console/log',
      redeem: '/wallet',
      tokens: ['/api/token/'],
      tokenGroups: ['/api/user/self/groups', '/api/user_group_map']
    },
    token: remoteTokenConfig,
    balance: { quotaFactor: 500000 },
    modelsParseStrategy: 'array'
  },
  DoneHub: {
    name: 'DoneHub',
    displayName: 'Done Hub',
    capabilities: { ...defaultCapabilities, checkin: false, tokenManagement: true },
    auth: { requiresUserId: false, userIdHeaders: [], cookieFallback: false },
    endpoints: {
      userInfo: ['/api/user/self'],
      models: ['/v1/models', '/api/available_model'],
      checkin: [],
      log: '/console/log',
      redeem: '/console/topup',
      tokens: ['/api/token/'],
      tokenGroups: ['/api/user_group_map', '/api/user/self/groups']
    },
    token: remoteTokenConfig,
    balance: { quotaFactor: 500000, doneHubQuotaSemantics: true },
    modelsParseStrategy: 'object'
  }
}

/**
 * 获取平台适配器
 * @param apiType - API 类型
 * @returns 平台适配器或 null
 */
export function getPlatformAdapter(apiType: string): PlatformAdapter | null {
  return platformAdapters[apiType] ?? null
}

/**
 * 列出所有平台适配器
 * @returns 平台适配器数组
 */
export function listPlatformAdapters(): PlatformAdapter[] {
  return Object.values(platformAdapters).sort((left, right) => left.name.localeCompare(right.name))
}
