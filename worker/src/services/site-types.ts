export interface SiteTypeConfig {
  name: string
  displayName: string
  supportsCheckin: boolean
  supportsUserGroup?: boolean
  requiresUserId: boolean
  userIdHeader: string
  endpointUserInfo: string
  endpointModels: string
  endpointCheckin: string
  endpointLog?: string
  endpointRedeem?: string
  endpointTokens?: string
  modelsParseStrategy: 'array' | 'object'
}

export const siteTypeRegistry: Record<string, SiteTypeConfig> = {
  NewApi: {
    name: 'NewApi',
    displayName: 'New API',
    supportsCheckin: true,
    requiresUserId: true,
    userIdHeader: 'new-api-user',
    endpointUserInfo: '/api/user/info',
    endpointModels: '/api/user/models',
    endpointCheckin: '/api/user/checkin',
    endpointLog: '/console/log',
    endpointRedeem: '/console/topup',
    modelsParseStrategy: 'array'
  },
  OneApi: {
    name: 'OneApi',
    displayName: 'One API',
    supportsCheckin: true,
    requiresUserId: false,
    userIdHeader: '',
    endpointUserInfo: '/api/user/self',
    endpointModels: '/api/user/models',
    endpointCheckin: '/api/user/checkin',
    endpointLog: '/console/log',
    endpointRedeem: '/console/topup',
    modelsParseStrategy: 'array'
  },
  OneHub: {
    name: 'OneHub',
    displayName: 'One Hub',
    supportsCheckin: true,
    supportsUserGroup: true,
    requiresUserId: false,
    userIdHeader: '',
    endpointUserInfo: '/api/user/info',
    endpointModels: '/api/available_model',
    endpointCheckin: '/api/user/checkin',
    endpointLog: '/panel/log',
    endpointRedeem: '/panel/topup',
    endpointTokens: '/api/token/',
    modelsParseStrategy: 'object'
  },
  RixApi: {
    name: 'RixApi',
    displayName: 'Rix API',
    supportsCheckin: true,
    requiresUserId: true,
    userIdHeader: 'Rix-Api-User',
    endpointUserInfo: '/api/user/self',
    endpointModels: '/api/user/models',
    endpointCheckin: '/panel',
    endpointLog: '/log',
    endpointRedeem: '/topup',
    modelsParseStrategy: 'array'
  },
  Veloera: {
    name: 'Veloera',
    displayName: 'Veloera',
    supportsCheckin: true,
    requiresUserId: true,
    userIdHeader: 'veloera-user',
    endpointUserInfo: '/api/user/info',
    endpointModels: '/api/user/models',
    endpointCheckin: '/api/user/check_in',
    endpointLog: '/console/log',
    endpointRedeem: '/console/topup',
    modelsParseStrategy: 'array'
  },
  AnyRouter: {
    name: 'AnyRouter',
    displayName: 'Any Router',
    supportsCheckin: true,
    requiresUserId: true,
    userIdHeader: 'new-api-user',
    endpointUserInfo: '/api/user/info',
    endpointModels: '/api/user/models',
    endpointCheckin: '/api/user/sign_in',
    endpointLog: '/console/log',
    endpointRedeem: '/console/topup',
    modelsParseStrategy: 'array'
  },
  VoApi: {
    name: 'VoApi',
    displayName: 'VoAPI',
    supportsCheckin: true,
    requiresUserId: true,
    userIdHeader: 'voapi-user',
    endpointUserInfo: '/api/user/self',
    endpointModels: '/api/user/models',
    endpointCheckin: '/api/user/clock_in',
    endpointLog: '/console/log',
    endpointRedeem: '/wallet',
    modelsParseStrategy: 'array'
  },
  DoneHub: {
    name: 'DoneHub',
    displayName: 'Done Hub',
    supportsCheckin: false,
    requiresUserId: false,
    userIdHeader: '',
    endpointUserInfo: '/api/user/info',
    endpointModels: '/api/available_model',
    endpointCheckin: '',
    endpointLog: '/console/log',
    endpointRedeem: '/console/topup',
    modelsParseStrategy: 'object'
  }
}

export function getSiteTypeConfig(apiType: string): SiteTypeConfig | null {
  return siteTypeRegistry[apiType] ?? null
}

export function getAllSiteTypes(): string[] {
  return Object.keys(siteTypeRegistry).sort()
}

export function validateApiType(apiType: string): boolean {
  return Boolean(getSiteTypeConfig(apiType))
}

export function supportsCheckin(apiType: string): boolean {
  return Boolean(getSiteTypeConfig(apiType)?.supportsCheckin)
}

export function requiresUserId(apiType: string): boolean {
  return Boolean(getSiteTypeConfig(apiType)?.requiresUserId)
}

export function getUserIdHeader(apiType: string): string {
  return getSiteTypeConfig(apiType)?.userIdHeader ?? ''
}

export function getEndpointUserInfo(apiType: string): string {
  return getSiteTypeConfig(apiType)?.endpointUserInfo ?? '/api/user/info'
}

export function getEndpointModels(apiType: string): string {
  return getSiteTypeConfig(apiType)?.endpointModels ?? '/api/user/models'
}

export function getEndpointCheckin(apiType: string): string {
  return getSiteTypeConfig(apiType)?.endpointCheckin ?? '/api/user/checkin'
}

export function getModelsParseStrategy(apiType: string): 'array' | 'object' {
  return getSiteTypeConfig(apiType)?.modelsParseStrategy ?? 'array'
}
