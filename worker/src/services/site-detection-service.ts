import { getSiteTypeConfig } from './site-types'

export type DetectionSource = 'preset' | 'url_hint' | 'title_hint' | 'adapter_detect' | 'html_title' | 'hostname' | 'default'
export type UrlAction = 'none' | 'strip_known_api_suffix' | 'preserve_semantic_path'

export interface SiteUrlAnalysis {
  inputUrl: string
  persistedUrl: string
  canonicalUrl: string
  urlAction: UrlAction
}

export interface PlatformGuess {
  apiType: string
  source: DetectionSource
  confidence: number
}

export interface NameGuess {
  value: string
  source: DetectionSource
  confidence: number
}

export interface SiteDetectInput {
  url: string
  htmlTitle?: string | null
  detectPreset?: boolean
}

export interface SiteDetectResult {
  input_url: string
  url: string
  canonical_url: string
  url_action: UrlAction
  api_type: string
  api_type_source: DetectionSource
  api_type_confidence: number
  site_name: string
  site_name_source: DetectionSource
  site_name_confidence: number
  account_label_guess: string | null
  initialization_preset_id: string | null
  initialization_preset_label: string | null
  supports_checkin: boolean
  requires_user_id: boolean
  default_checkin_endpoint: string
  default_user_info_endpoint: string
  default_models_endpoint: string
  recommended_skip_model_fetch: boolean
  recommended_models: string[]
  warnings: string[]
}

const KNOWN_API_SUFFIXES = ['/v1/models', '/v1/chat/completions', '/v1/completions', '/v1']
// 这些路径本身带有平台语义，不能像通用 OpenAI-compatible `/v1` 后缀一样剥掉。
const SEMANTIC_PATH_PATTERNS = [/\/anthropic(?:\/|$)/i, /\/api\/coding\/paas\/v4(?:\/|$)/i]

// 先用低成本 URL hint 做平台猜测；后续接入 title/adapter 检测时仍要保留 source 和 confidence，方便人工复核。
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

function normalizeOriginAndPath(rawUrl: string): URL {
  const trimmed = rawUrl.trim()
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return new URL(withProtocol)
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function titleToName(title: string): string {
  return title
    .replace(/\s*[-|·]\s*(控制台|Console|Dashboard|Panel|后台|管理).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function hostnameToName(hostname: string): string {
  const first = hostname.replace(/^www\./i, '').split('.')[0] || hostname
  return first
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

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

export function detectPlatformByUrlHint(rawUrl: string): PlatformGuess | null {
  const parsed = normalizeOriginAndPath(rawUrl)
  const target = `${parsed.hostname}${parsed.pathname}`
  const matched = URL_PLATFORM_HINTS.find(item => item.pattern.test(target))
  return matched ? { apiType: matched.apiType, source: 'url_hint', confidence: matched.confidence } : null
}

export function detectSiteName(rawUrl: string, htmlTitle?: string | null): NameGuess {
  const parsed = normalizeOriginAndPath(rawUrl)
  const titleName = htmlTitle ? titleToName(htmlTitle) : ''
  if (titleName) return { value: titleName, source: 'html_title', confidence: 0.78 }
  return { value: hostnameToName(parsed.hostname), source: 'hostname', confidence: 0.55 }
}

function detectInitializationPreset(rawUrl: string, apiType: string) {
  const parsed = normalizeOriginAndPath(rawUrl)
  const target = `${parsed.hostname}${parsed.pathname}`
  return INITIALIZATION_PRESETS.find(preset => preset.apiType === apiType && preset.pattern.test(target)) || null
}

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
