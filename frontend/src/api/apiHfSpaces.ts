import { apiRequest } from './http'
import type { Paginated } from './apiSite'

/**
 * HF Space 添加弹框里的候选项
 */
export interface HfSpaceOption {
  /** Space 标识，格式为 owner/name */
  space_id: string
  /** Space 短名称，不含 owner */
  space_name: string
  /** Space 展示标题 */
  title: string
  /** Space SDK 类型 */
  sdk: string | null
  /** Space 应用基础地址 */
  app_url: string
  /** 默认保活请求地址 */
  default_keepalive_url: string
  /** Hugging Face runtime 阶段 */
  runtime_stage: string | null
  /** Hugging Face 运行域名阶段 */
  domain_stage: string | null
  /** 是否允许勾选添加 */
  selectable: boolean
  /** 禁用原因，用于暂停或已添加的 Space */
  disabled_reason: string | null
}

/**
 * HF 用户或地址识别预览
 */
export interface HfSpacePreview {
  /** 识别出的 HF 用户名 */
  username: string
  /** 输入单个 Space 地址时识别出的 Space ID */
  preferred_space_id: string | null
  /** 该用户下展示的全部 Space */
  spaces: HfSpaceOption[]
}

/**
 * HF 用户卡片汇总信息
 */
export interface HfSpaceUserSummary {
  /** HF 用户本地 ID */
  id: number
  /** Hugging Face 用户名 */
  username: string
  /** 添加用户时输入的原始内容 */
  source_input: string
  /** 最近一次同步 Space 列表的时间 */
  last_synced_at: string | null
  /** 已添加的 Space 数量 */
  selected_count: number
  /** 已启用保活的 Space 数量 */
  enabled_count: number
  /** 最近一次保活状态 */
  latest_status: 'success' | 'failed' | null
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

/**
 * HF Space 保活目标
 */
export interface HfSpaceTarget {
  /** 保活目标本地 ID */
  id: number
  /** 关联的 HF 用户 ID */
  hf_user_id: number
  /** 关联的 HF 用户名 */
  username: string | null
  /** Space 标识，格式为 owner/name */
  space_id: string
  /** Space 短名称，不含 owner */
  space_name: string
  /** Space 展示标题 */
  title: string | null
  /** Space 别名，默认等于原项目名 */
  alias: string
  /** Space 应用基础地址 */
  base_url: string
  /** 实际保活请求地址 */
  keepalive_url: string
  /** Hugging Face runtime 阶段 */
  runtime_stage: string | null
  /** Hugging Face 运行域名阶段 */
  domain_stage: string | null
  /** 是否启用保活 */
  enabled: boolean
  /** 最近一次保活请求时间 */
  last_checked_at: string | null
  /** 最近一次保活结果 */
  last_status: 'success' | 'failed' | null
  /** 最近一次 HTTP 状态码 */
  last_http_status: number | null
  /** 最近一次请求耗时（毫秒） */
  last_latency_ms: number | null
  /** 最近一次失败原因 */
  last_error: string | null
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
  /** 最近 48 小时保活日志 */
  logs: HfSpaceKeepaliveLog[]
}

/**
 * HF Space 保活日志
 */
export interface HfSpaceKeepaliveLog {
  /** 保活日志 ID */
  id: number
  /** 关联的保活目标 ID */
  target_id: number
  /** 关联的 HF 用户 ID */
  hf_user_id: number
  /** 关联的 HF 用户名 */
  username: string | null
  /** Space 标识，格式为 owner/name */
  space_id: string
  /** 本次实际请求地址 */
  request_url: string
  /** 请求结果 */
  status: 'success' | 'failed'
  /** HTTP 状态码 */
  http_status: number | null
  /** 请求耗时（毫秒） */
  latency_ms: number | null
  /** 响应正文摘要 */
  response_excerpt: string | null
  /** 失败错误信息 */
  error: string | null
  /** 创建时间 */
  created_at: string
}

export const ApiHfSpacesPreview = (input: string) => apiRequest<HfSpacePreview>('/api/hf-spaces/preview', {
  method: 'POST',
  body: JSON.stringify({ input })
})

export const ApiHfSpacesUsers = () => apiRequest<HfSpaceUserSummary[]>('/api/hf-spaces/users')

export const ApiHfSpacesCreateUser = (input: string, selectedSpaces: Array<{ space_id: string; keepalive_url?: string }>) => apiRequest<{ user: HfSpaceUserSummary; created_targets: number }>('/api/hf-spaces/users', {
  method: 'POST',
  body: JSON.stringify({ input, selected_spaces: selectedSpaces })
})

export const ApiHfSpacesRefreshUser = (id: number) => apiRequest<HfSpacePreview>(`/api/hf-spaces/users/${id}/refresh`, {
  method: 'POST'
})

export const ApiHfSpacesTargets = () => apiRequest<HfSpaceTarget[]>('/api/hf-spaces/targets')

export const ApiHfSpacesUpdateTarget = (id: number, payload: { keepalive_url?: string; enabled?: boolean; alias?: string }) => apiRequest<HfSpaceTarget>(`/api/hf-spaces/targets/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(payload)
})

export const ApiHfSpacesDeleteTarget = (id: number) => apiRequest<{ deleted: boolean }>(`/api/hf-spaces/targets/${id}`, {
  method: 'DELETE'
})

export const ApiHfSpacesPingTarget = (id: number) => apiRequest<{ status: 'success' | 'failed'; http_status: number | null; latency_ms: number; error: string | null }>(`/api/hf-spaces/targets/${id}/ping`, {
  method: 'POST'
})

export const ApiHfSpacesLogs = (params: { page?: number; page_size?: number; status?: string; user_id?: number; target_id?: number }) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') search.set(key, String(value))
  }
  return apiRequest<Paginated<HfSpaceKeepaliveLog>>(`/api/hf-spaces/logs?${search.toString()}`)
}
