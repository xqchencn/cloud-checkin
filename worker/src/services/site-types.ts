import { getPlatformAdapter, listPlatformAdapters, platformAdapters } from './platforms/index'

type EndpointCandidateKey = 'userInfo' | 'models' | 'checkin' | 'tokens' | 'tokenGroups'

export interface SiteTypeConfig {
  name: string
  displayName: string
  supportsCheckin: boolean
  supportsUserGroup?: boolean
  supportsTokenManagement?: boolean
  supportsSiteDetection?: boolean
  requiresUserId: boolean
  userIdHeader: string
  userIdHeaders: string[]
  endpointUserInfo: string
  endpointModels: string
  endpointCheckin: string
  endpointLog?: string
  endpointRedeem?: string
  endpointTokens?: string
  endpointTokenGroups?: string
  modelsParseStrategy: 'array' | 'object' | 'openai'
}

function adapterToSiteTypeConfig(apiType: string): SiteTypeConfig | null {
  const adapter = getPlatformAdapter(apiType)
  if (!adapter) return null
  return {
    name: adapter.name,
    displayName: adapter.displayName,
    supportsCheckin: adapter.capabilities.checkin,
    supportsUserGroup: adapter.endpoints.tokenGroups.length > 0,
    supportsTokenManagement: adapter.capabilities.tokenManagement,
    supportsSiteDetection: adapter.capabilities.siteDetection,
    requiresUserId: adapter.auth.requiresUserId,
    userIdHeader: adapter.auth.userIdHeaders[0] ?? '',
    userIdHeaders: adapter.auth.userIdHeaders,
    endpointUserInfo: adapter.endpoints.userInfo[0] ?? '',
    endpointModels: adapter.endpoints.models[0] ?? '',
    endpointCheckin: adapter.endpoints.checkin[0] ?? '',
    endpointLog: adapter.endpoints.log,
    endpointRedeem: adapter.endpoints.redeem,
    endpointTokens: adapter.endpoints.tokens[0] ?? '',
    endpointTokenGroups: adapter.endpoints.tokenGroups[0] ?? '',
    modelsParseStrategy: adapter.modelsParseStrategy
  }
}

export const siteTypeRegistry: Record<string, SiteTypeConfig> = Object.fromEntries(
  Object.keys(platformAdapters).map(apiType => [apiType, adapterToSiteTypeConfig(apiType)])
) as Record<string, SiteTypeConfig>

export function getSiteTypeConfig(apiType: string): SiteTypeConfig | null {
  return adapterToSiteTypeConfig(apiType)
}

export function getAllSiteTypes(): string[] {
  return listPlatformAdapters().map(adapter => adapter.name)
}

export function validateApiType(apiType: string): boolean {
  return Boolean(getPlatformAdapter(apiType))
}

export function supportsCheckin(apiType: string): boolean {
  return Boolean(getPlatformAdapter(apiType)?.capabilities.checkin)
}

export function requiresUserId(apiType: string): boolean {
  return Boolean(getPlatformAdapter(apiType)?.auth.requiresUserId)
}

export function getUserIdHeader(apiType: string): string {
  return getUserIdHeaders(apiType)[0] ?? ''
}

export function getUserIdHeaders(apiType: string): string[] {
  return getPlatformAdapter(apiType)?.auth.userIdHeaders ?? []
}

export function getEndpointCandidates(apiType: string, key: EndpointCandidateKey): string[] {
  return getPlatformAdapter(apiType)?.endpoints[key] ?? []
}

export function getEndpointUserInfo(apiType: string): string {
  return getEndpointCandidates(apiType, 'userInfo')[0] ?? '/api/user/self'
}

export function getEndpointModels(apiType: string): string {
  return getEndpointCandidates(apiType, 'models')[0] ?? '/api/user/models'
}

export function getEndpointCheckin(apiType: string): string {
  return getEndpointCandidates(apiType, 'checkin')[0] ?? '/api/user/checkin'
}

export function getEndpointTokens(apiType: string): string {
  return getEndpointCandidates(apiType, 'tokens')[0] ?? '/api/token/'
}

export function getEndpointTokenGroups(apiType: string): string {
  return getEndpointCandidates(apiType, 'tokenGroups')[0] ?? '/api/user/self/groups'
}

export function getModelsParseStrategy(apiType: string): 'array' | 'object' | 'openai' {
  return getPlatformAdapter(apiType)?.modelsParseStrategy ?? 'array'
}
