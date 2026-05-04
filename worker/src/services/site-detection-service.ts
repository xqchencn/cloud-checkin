import { getSiteTypeConfig } from './site-types'

/** 检测来源类型 */
export type DetectionSource = 'preset' | 'url_hint' | 'title_hint' | 'adapter_detect' | 'html_title' | 'hostname' | 'default'
/** URL 操作类型 */
export type UrlAction = 'none' | 'strip_known_api_suffix' | 'preserve_semantic_path'

/**
 * 站点 URL 分析结果
 */
export interface SiteUrlAnalysis {
  /** 输入 URL */
  inputUrl: string
  /** 持久化 URL */
  persistedUrl: string
  /** 规范 URL */
  canonicalUrl: string
  /** URL 操作 */
  urlAction: UrlAction
}

/**
 * 平台猜测结果
 */
export interface PlatformGuess {
  /** API 类型 */
  apiType: string
  /** 来源 */
  source: DetectionSource
  /** 置信度 */
  confidence: number
}

/**
 * 站点名称猜测结果
 */
export interface NameGuess {
  /** 名称值 */
  value: string
  /** 来源 */
  source: DetectionSource
  /** 置信度 */
  confidence: number
}

/**
 * 站点检测输入
 */
export interface SiteDetectInput {
  /** URL */
  url: string
  /** HTML 标题 */
  htmlTitle?: string | null
  /** 是否检测预设 */
  detectPreset?: boolean
}

/**
 * 站点检测结果
 */
export interface SiteDetectResult {
  /** 输入 URL */
  input_url: string
  /** URL */
  url: string
  /** 规范 URL */
  canonical_url: string
  /** URL 操作 */
  url_action: UrlAction
  /** API 类型 */
  api_type: string
  /** API 类型来源 */
  api_type_source: DetectionSource
  /** API 类型置信度 */
  api_type_confidence: number
  /** 站点名称 */
  site_name: string
  /** 站点名称来源 */
  site_name_source: DetectionSource
  /** 站点名称置信度 */
  site_name_confidence: number
  /** 账号标签猜测 */
  account_label_guess: string | null
  /** 初始化预设 ID */
  initialization_preset_id: string | null
  /** 初始化预设标签 */
  initialization_preset_label: string | null
  /** 是否支持签到 */
  supports_checkin: boolean
  /** 是否需要用户 ID */
  requires_user_id: boolean
  /** 默认签到端点 */
  default_checkin_endpoint: string
  /** 默认用户信息端点 */
  default_user_info_endpoint: string
  /** 默认模型端点 */
  default_models_endpoint: string
  /** 推荐跳过模型获取 */
  recommended_skip_model_fetch: boolean
  /** 推荐模型列表 */
  recommended_models: string[]
  /** 警告列表 */
  warnings: string[]
}

/** 已知的 API 后缀 */
const KNOWN_API_SUFFIXES = ['/v1/models', '/v1/chat/completions', '/v1/completions', '/v1']
// 这些路径本身带有平台语义，不能像通用 OpenAI-compatible `/v1` 后缀一样剥掉。
/** 语义路径模式 */
const SEMANTIC_PATH_PATTERNS = [/\/anthropic(?:\/|$)/i, /\/api\/coding\/paas\/v4(?:\/|$)/i]

// 先用低成本 URL hint 做平台猜测；后续接入 title/adapter 检测时仍要保留 source 和 confidence，方便人工复核。
/** URL 平台提示列表 */
const URL_PLATFORM_HINTS: Array<{ pattern: RegExp; apiType: string; confidence: number }> = [
  { pattern: /one[-.]api/i, apiType: 'OneApi', confidence: 0.82 },
  { pattern: /one[-.]hub/i, apiType: 'OneHub', confidence: 0.84 },
  { pattern: /rix[-.]?api/i, apiType: 'RixApi', confidence: 0.82 },
  { pattern: /veloera/i, apiType: 'Veloera', confidence: 0.86 },
  { pattern: /anyrouter/i, apiType: 'AnyRouter', confidence: 0.86 },
  { pattern: /vo[-.]?api/i, apiType: 'VoApi', confidence: 0.82 },
  { pattern: /done[-.]hub/i, apiType: 'DoneHub', confidence: 0.84 },
  { pattern: /new[-.]api/i, apiType: 'NewApi', confidence: 0.8 }
]

/** 初始化预设列表 */
const INITIALIZATION_PRESETS: Array<{
  id: string
  label: string
  providerLabel: string
  pattern: RegExp
  apiType: string
  recommendedModels?: string[]
  skipModelFetch?: boolean
}> = [
  { id: 'new-api', label: 'New API', providerLabel: 'New API', pattern: /new[-.]api/i, apiType: 'NewApi' },
  { id: 'one-api', label: 'One API', providerLabel: 'One API', pattern: /one[-.]api/i, apiType: 'OneApi' },
  { id: 'one-hub', label: 'OneHub', providerLabel: 'OneHub', pattern: /one[-.]hub/i, apiType: 'OneHub' },
  { id: 'rix-api', label: 'Rix API', providerLabel: 'Rix API', pattern: /rix[-.]?api/i, apiType: 'RixApi' },
  { id: 'veloera', label: 'Veloera', providerLabel: 'Veloera', pattern: /veloera/i, apiType: 'Veloera' },
  { id: 'anyrouter', label: 'AnyRouter', providerLabel: 'AnyRouter', pattern: /anyrouter/i, apiType: 'AnyRouter' },
  { id: 'vo-api', label: 'VoAPI', providerLabel: 'VoAPI', pattern: /vo[-.]?api/i, apiType: 'VoApi' },
  { id: 'donehub', label: 'DoneHub', providerLabel: 'DoneHub', pattern: /done[-.]hub/i, apiType: 'DoneHub' }
]

/**
 * 规范化源和路径
 * @param rawUrl - 原始 URL
 * @returns URL 对象
 */
function normalizeOriginAndPath(rawUrl: string): URL {
  const trimmed = rawUrl.trim()
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return new URL(withProtocol)
}

/**
 * 去除尾部斜杠
 * @param value - 输入值
 * @returns 去除尾部斜杠后的值
 */
function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

/**
 * 标题转名称
 * @param title - 标题
 * @returns 名称
 */
function titleToName(title: string): string {
  return title
    .replace(/\s*[-|·]\s*(控制台|Console|Dashboard|Panel|后台|管理).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 主机名转名称
 * @param hostname - 主机名
 * @returns 名称
 */
function hostnameToName(hostname: string): string {
  const first = hostname.replace(/^www\./i, '').split('.')[0] || hostname
  return first
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * 分析站点 URL
 * @param rawUrl - 原始 URL
 * @returns SiteUrlAnalysis - URL 分析结果
 */
export function analyzeSiteUrl(rawUrl: string): SiteUrlAnalysis {
  const parsed = normalizeOriginAndPath(rawUrl)
  const origin = parsed.origin
  const path = trimTrailingSlash(parsed.pathname)
  const fullWithoutQuery = `${origin}${path}`

  // 语义路径优先级高于通用后缀规则，避免把真实 API 根路径误改成站点首页。
  if (SEMANTIC_PATH_PATTERNS.some(pattern => pattern.test(path))) {
    return {
      inputUrl: rawUrl,
      persistedUrl: trimTrailingSlash(fullWithoutQuery),
      canonicalUrl: trimTrailingSlash(fullWithoutQuery),
      urlAction: 'preserve_semantic_path'
    }
  }

  const suffix = KNOWN_API_SUFFIXES.find(item => path.toLowerCase().endsWith(item))
  if (suffix) {
    const persistedPath = trimTrailingSlash(path.slice(0, -suffix.length))
    const persistedUrl = persistedPath ? `${origin}${persistedPath}` : origin
    // 当前项目仍以 `api_sites.url` 作为调用基准保存主站，`canonicalUrl` 单独给后续 API base URL 演进使用。
    const canonicalUrl = `${persistedUrl}/v1`
    return {
      inputUrl: rawUrl,
      persistedUrl: trimTrailingSlash(persistedUrl),
      canonicalUrl: trimTrailingSlash(canonicalUrl),
      urlAction: 'strip_known_api_suffix'
    }
  }

  return {
    inputUrl: rawUrl,
    persistedUrl: trimTrailingSlash(fullWithoutQuery || origin),
    canonicalUrl: trimTrailingSlash(fullWithoutQuery || origin),
    urlAction: 'none'
  }
}

/**
 * 通过 URL 提示检测平台
 * @param rawUrl - 原始 URL
 * @returns PlatformGuess | null - 平台猜测结果或 null
 */
export function detectPlatformByUrlHint(rawUrl: string): PlatformGuess | null {
  const parsed = normalizeOriginAndPath(rawUrl)
  const target = `${parsed.hostname}${parsed.pathname}`
  const matched = URL_PLATFORM_HINTS.find(item => item.pattern.test(target))
  return matched ? { apiType: matched.apiType, source: 'url_hint', confidence: matched.confidence } : null
}

/**
 * 检测站点名称
 * @param rawUrl - 原始 URL
 * @param htmlTitle - HTML 标题
 * @returns NameGuess - 站点名称猜测结果
 */
export function detectSiteName(rawUrl: string, htmlTitle?: string | null): NameGuess {
  const parsed = normalizeOriginAndPath(rawUrl)
  const titleName = htmlTitle ? titleToName(htmlTitle) : ''
  if (titleName) return { value: titleName, source: 'html_title', confidence: 0.78 }
  return { value: hostnameToName(parsed.hostname), source: 'hostname', confidence: 0.55 }
}

/**
 * 检测初始化预设
 * @param rawUrl - 原始 URL
 * @param apiType - API 类型
 * @returns 初始化预设或 null
 */
function detectInitializationPreset(rawUrl: string, apiType: string) {
  const parsed = normalizeOriginAndPath(rawUrl)
  const target = `${parsed.hostname}${parsed.pathname}`
  return INITIALIZATION_PRESETS.find(preset => preset.apiType === apiType && preset.pattern.test(target)) || null
}

/**
 * 从 URL 检测站点
 * @param input - 站点检测输入
 * @returns SiteDetectResult - 站点检测结果
 */
export function detectSiteFromUrl(input: SiteDetectInput): SiteDetectResult {
  const analysis = analyzeSiteUrl(input.url)
  // 未识别平台时默认 NewApi，只能作为低置信度建议，前端仍允许用户覆盖。
  const platform = detectPlatformByUrlHint(analysis.persistedUrl) ?? { apiType: 'NewApi', source: 'default' as const, confidence: 0.4 }
  const preset = input.detectPreset ? detectInitializationPreset(analysis.persistedUrl, platform.apiType) : null
  const apiType = preset?.apiType || platform.apiType
  const name = detectSiteName(analysis.persistedUrl, input.htmlTitle)
  const config = getSiteTypeConfig(apiType) ?? getSiteTypeConfig('NewApi')

  return {
    input_url: input.url,
    url: analysis.persistedUrl,
    canonical_url: analysis.canonicalUrl,
    url_action: analysis.urlAction,
    api_type: apiType,
    api_type_source: preset ? 'preset' : platform.source,
    api_type_confidence: preset ? Math.max(platform.confidence, 0.9) : platform.confidence,
    site_name: preset?.providerLabel || preset?.label || name.value,
    site_name_source: preset ? 'preset' : name.source,
    site_name_confidence: preset ? 0.9 : name.confidence,
    account_label_guess: null,
    initialization_preset_id: preset?.id || null,
    initialization_preset_label: preset?.label || null,
    supports_checkin: Boolean(config?.supportsCheckin),
    requires_user_id: Boolean(config?.requiresUserId),
    default_checkin_endpoint: config?.endpointCheckin ?? '',
    default_user_info_endpoint: config?.endpointUserInfo ?? '/api/user/self',
    default_models_endpoint: config?.endpointModels ?? '/v1/models',
    recommended_skip_model_fetch: Boolean(preset?.skipModelFetch),
    recommended_models: preset?.recommendedModels || [],
    warnings: []
  }
}
