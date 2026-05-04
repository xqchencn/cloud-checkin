import { getPlatformAdapter, listPlatformAdapters, platformAdapters } from './platforms/index'

/** 端点候选键类型 */
type EndpointCandidateKey = 'userInfo' | 'models' | 'checkin' | 'tokens' | 'tokenGroups'

/**
 * 站点类型配置
 */
export interface SiteTypeConfig {
  /** 名称 */
  name: string
  /** 显示名称 */
  displayName: string
  /** 是否支持签到 */
  supportsCheckin: boolean
  /** 是否支持用户组 */
  supportsUserGroup?: boolean
  /** 是否支持 Token 管理 */
  supportsTokenManagement?: boolean
  /** 是否支持站点检测 */
  supportsSiteDetection?: boolean
  /** 是否需要用户 ID */
  requiresUserId: boolean
  /** 用户 ID 头 */
  userIdHeader: string
  /** 用户 ID 头列表 */
  userIdHeaders: string[]
  /** 用户信息端点 */
  endpointUserInfo: string
  /** 模型端点 */
  endpointModels: string
  /** 签到端点 */
  endpointCheckin: string
  /** 日志端点 */
  endpointLog?: string
  /** 兑换端点 */
  endpointRedeem?: string
  /** Token 端点 */
  endpointTokens?: string
  /** Token 分组端点 */
  endpointTokenGroups?: string
  /** 模型解析策略 */
  modelsParseStrategy: 'array' | 'object' | 'openai'
}

/**
 * 适配器转站点类型配置
 * @param apiType - API 类型
 * @returns 站点类型配置或 null
 */
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

/** 站点类型注册表 */
export const siteTypeRegistry: Record<string, SiteTypeConfig> = Object.fromEntries(
  Object.keys(platformAdapters).map(apiType => [apiType, adapterToSiteTypeConfig(apiType)])
) as Record<string, SiteTypeConfig>

/**
 * 获取站点类型配置
 * @param apiType - API 类型
 * @returns 站点类型配置或 null
 */
export function getSiteTypeConfig(apiType: string): SiteTypeConfig | null {
  return adapterToSiteTypeConfig(apiType)
}

/**
 * 获取所有站点类型
 * @returns 站点类型名称数组
 */
export function getAllSiteTypes(): string[] {
  return listPlatformAdapters().map(adapter => adapter.name)
}

/**
 * 验证 API 类型
 * @param apiType - API 类型
 * @returns 是否有效
 */
export function validateApiType(apiType: string): boolean {
  return Boolean(getPlatformAdapter(apiType))
}

/**
 * 判断是否支持签到
 * @param apiType - API 类型
 * @returns 是否支持签到
 */
export function supportsCheckin(apiType: string): boolean {
  return Boolean(getPlatformAdapter(apiType)?.capabilities.checkin)
}

/**
 * 判断是否需要用户 ID
 * @param apiType - API 类型
 * @returns 是否需要用户 ID
 */
export function requiresUserId(apiType: string): boolean {
  return Boolean(getPlatformAdapter(apiType)?.auth.requiresUserId)
}

/**
 * 获取用户 ID 头
 * @param apiType - API 类型
 * @returns 用户 ID 头
 */
export function getUserIdHeader(apiType: string): string {
  return getUserIdHeaders(apiType)[0] ?? ''
}

/**
 * 获取用户 ID 头列表
 * @param apiType - API 类型
 * @returns 用户 ID 头列表
 */
export function getUserIdHeaders(apiType: string): string[] {
  return getPlatformAdapter(apiType)?.auth.userIdHeaders ?? []
}

/**
 * 获取端点候选列表
 * @param apiType - API 类型
 * @param key - 端点键
 * @returns 端点候选列表
 */
export function getEndpointCandidates(apiType: string, key: EndpointCandidateKey): string[] {
  return getPlatformAdapter(apiType)?.endpoints[key] ?? []
}

/**
 * 获取用户信息端点
 * @param apiType - API 类型
 * @returns 用户信息端点
 */
export function getEndpointUserInfo(apiType: string): string {
  return getEndpointCandidates(apiType, 'userInfo')[0] ?? '/api/user/self'
}

/**
 * 获取模型端点
 * @param apiType - API 类型
 * @returns 模型端点
 */
export function getEndpointModels(apiType: string): string {
  return getEndpointCandidates(apiType, 'models')[0] ?? '/api/user/models'
}

/**
 * 获取签到端点
 * @param apiType - API 类型
 * @returns 签到端点
 */
export function getEndpointCheckin(apiType: string): string {
  return getEndpointCandidates(apiType, 'checkin')[0] ?? '/api/user/checkin'
}

/**
 * 获取 Token 端点
 * @param apiType - API 类型
 * @returns Token 端点
 */
export function getEndpointTokens(apiType: string): string {
  return getEndpointCandidates(apiType, 'tokens')[0] ?? '/api/token/'
}

/**
 * 获取 Token 分组端点
 * @param apiType - API 类型
 * @returns Token 分组端点
 */
export function getEndpointTokenGroups(apiType: string): string {
  return getEndpointCandidates(apiType, 'tokenGroups')[0] ?? '/api/user/self/groups'
}

/**
 * 获取模型解析策略
 * @param apiType - API 类型
 * @returns 模型解析策略
 */
export function getModelsParseStrategy(apiType: string): 'array' | 'object' | 'openai' {
  return getPlatformAdapter(apiType)?.modelsParseStrategy ?? 'array'
}
