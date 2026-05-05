import { ApiHttpError } from '../response'
import { hfSpaceRepository } from '../repositories/hf-space-repository'
import type { Env, HfSpaceOption, HfSpacePreview, HfSpaceTarget } from '../types'

export interface HfKeepaliveResult {
  status: 'success' | 'failed'
  http_status: number | null
  latency_ms: number
  response_excerpt: string | null
  error: string | null
}

export interface HfRemoteSpace {
  id: string
  author?: string | null
  subdomain?: string | null
  cardData?: {
    title?: string | null
    sdk?: string | null
  } | null
  runtime?: {
    stage?: string | null
    domains?: Array<{ domain?: string | null; stage?: string | null }>
  } | null
}

export function parseHfSpaceInput(input: string): { username: string; preferredSpaceId: string | null } {
  const text = input.trim()
  if (!text) throw new ApiHttpError('BAD_REQUEST', '请输入 Hugging Face 用户名或地址', 400)

  if (!/^https?:\/\//i.test(text)) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/.test(text)) throw new ApiHttpError('BAD_REQUEST', 'Hugging Face 用户名格式不正确', 400)
    return { username: text, preferredSpaceId: null }
  }

  const url = new URL(text)
  if (url.hostname.endsWith('.hf.space')) {
    const subdomain = url.hostname.slice(0, -'.hf.space'.length)
    const separator = subdomain.indexOf('-')
    if (separator <= 0 || separator === subdomain.length - 1) throw new ApiHttpError('BAD_REQUEST', '无法从 hf.space 应用地址中识别用户名和 Space 名称', 400)
    const username = subdomain.slice(0, separator)
    const spaceName = subdomain.slice(separator + 1)
    return { username, preferredSpaceId: `${username}/${spaceName}` }
  }

  if (url.hostname !== 'huggingface.co') throw new ApiHttpError('BAD_REQUEST', '请输入 huggingface.co 用户名或地址，或 hf.space 应用地址', 400)
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0] === 'spaces' && parts[1] && parts[2]) {
    return { username: parts[1], preferredSpaceId: `${parts[1]}/${parts[2]}` }
  }
  if (parts[0]) return { username: parts[0], preferredSpaceId: null }
  throw new ApiHttpError('BAD_REQUEST', '无法从地址中识别 Hugging Face 用户名', 400)
}

function spaceNameFromId(spaceId: string): string {
  return spaceId.split('/')[1] || spaceId
}

function formatRuntimeStageLabel(stage: string | null | undefined): string {
  if (stage === 'RUNNING') return '运行中'
  if (stage === 'PAUSED') return '已暂停'
  if (stage === 'BUILDING') return '构建中'
  if (stage === 'SLEEPING') return '休眠中'
  if (stage === 'STARTING') return '启动中'
  return stage || '未知'
}

function normalizeHfSpaceAlias(value: string | null | undefined, fallback: string): string {
  const alias = (value || '').trim()
  return alias || fallback.trim()
}

export function buildDefaultKeepaliveUrl(space: HfRemoteSpace): { appUrl: string; keepaliveUrl: string } {
  const domain = space.runtime?.domains?.find(item => item.domain)?.domain
  const fallbackDomain = space.subdomain || space.id.replace('/', '-')
  const appUrl = `https://${domain || `${fallbackDomain}.hf.space`}`.replace(/\/+$/, '')
  return { appUrl, keepaliveUrl: `${appUrl}/` }
}

export function validateKeepaliveUrl(baseUrl: string, value: string | null | undefined): string {
  const base = new URL(baseUrl)
  if (base.protocol !== 'https:') throw new ApiHttpError('BAD_REQUEST', '应用地址必须使用 https', 400)
  const raw = (value || '').trim()
  const target = raw ? new URL(raw, `${base.origin}/`) : new URL(`${base.origin}/`)
  if (target.protocol !== 'https:') throw new ApiHttpError('BAD_REQUEST', '保活地址必须使用 https', 400)
  if (target.origin !== base.origin) throw new ApiHttpError('BAD_REQUEST', '保活地址必须与应用地址保持同一域名', 400)
  return target.toString()
}

export function assertCanDeleteHfSpaceTarget(target: { enabled: boolean }): void {
  if (target.enabled) throw new ApiHttpError('HF_TARGET_ENABLED', '请先停用该 HF Space 保活目标，再删除', 400)
}

export function buildSpaceOptions(spaces: HfRemoteSpace[], existingSpaceIds: Set<string>): HfSpaceOption[] {
  return spaces.map(space => {
    const { appUrl, keepaliveUrl } = buildDefaultKeepaliveUrl(space)
    const runtimeStage = space.runtime?.stage || null
    const alreadyAdded = existingSpaceIds.has(space.id)
    const selectable = runtimeStage === 'RUNNING' && !alreadyAdded
    const disabledReason = alreadyAdded
      ? '已添加'
      : runtimeStage === 'RUNNING'
        ? null
        : runtimeStage
          ? `当前状态 ${formatRuntimeStageLabel(runtimeStage)}，只有运行中的 Space 可添加`
          : '缺少运行态，只有运行中的 Space 可添加'
    return {
      space_id: space.id,
      space_name: spaceNameFromId(space.id),
      title: space.cardData?.title || spaceNameFromId(space.id),
      sdk: space.cardData?.sdk || null,
      app_url: appUrl,
      default_keepalive_url: keepaliveUrl,
      runtime_stage: runtimeStage,
      domain_stage: space.runtime?.domains?.[0]?.stage || null,
      selectable,
      disabled_reason: disabledReason
    }
  })
}

async function fetchRemoteSpaces(username: string): Promise<HfRemoteSpace[]> {
  const url = `https://huggingface.co/api/spaces?author=${encodeURIComponent(username)}&expand[]=runtime&expand[]=author&expand[]=subdomain&expand[]=cardData`
  const response = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  })
  if (!response.ok) throw new ApiHttpError('HF_FETCH_FAILED', `Hugging Face Spaces 拉取失败：${response.status}`, 502)
  return await response.json<HfRemoteSpace[]>()
}

async function pingUrl(url: string): Promise<HfKeepaliveResult> {
  const started = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    const text = await response.text().catch(() => '')
    return {
      status: response.status >= 200 && response.status < 400 ? 'success' : 'failed',
      http_status: response.status,
      latency_ms: Date.now() - started,
      response_excerpt: text.slice(0, 500) || null,
      error: response.status >= 200 && response.status < 400 ? null : `HTTP ${response.status}`
    }
  } catch (err) {
    return {
      status: 'failed',
      http_status: null,
      latency_ms: Date.now() - started,
      response_excerpt: null,
      error: err instanceof Error ? err.message : String(err)
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function keepaliveCreatedTargets(
  targets: HfSpaceTarget[],
  ping: (url: string) => Promise<HfKeepaliveResult>,
  record: (target: HfSpaceTarget, result: HfKeepaliveResult) => Promise<void>
): Promise<HfKeepaliveResult[]> {
  const results: HfKeepaliveResult[] = []
  for (const target of targets) {
    const result = await ping(target.keepalive_url)
    await record(target, result)
    results.push(result)
  }
  return results
}

export async function keepaliveUpdatedTarget(
  previousKeepaliveUrl: string,
  target: HfSpaceTarget,
  ping: (url: string) => Promise<HfKeepaliveResult>,
  record: (target: HfSpaceTarget, result: HfKeepaliveResult) => Promise<void>
): Promise<HfKeepaliveResult | null> {
  if (previousKeepaliveUrl === target.keepalive_url) return null
  const result = await ping(target.keepalive_url)
  await record(target, result)
  return result
}

export function hfSpaceService(env: Env) {
  const repo = hfSpaceRepository(env.DB)

  return {
    async preview(input: string): Promise<HfSpacePreview> {
      const parsed = parseHfSpaceInput(input)
      const [remoteSpaces, existing] = await Promise.all([fetchRemoteSpaces(parsed.username), repo.existingSpaceIds()])
      return {
        username: parsed.username,
        preferred_space_id: parsed.preferredSpaceId,
        spaces: buildSpaceOptions(remoteSpaces, existing)
      }
    },

    async listUsers() {
      const [users, targets] = await Promise.all([repo.listUsers(), repo.listTargets()])
      return users.map(user => {
        const userTargets = targets.filter(target => target.hf_user_id === user.id)
        return {
          ...user,
          selected_count: userTargets.length,
          enabled_count: userTargets.filter(target => target.enabled).length,
          latest_status: userTargets.find(target => target.last_status)?.last_status || null
        }
      })
    },

    async createUser(input: string, selected: Array<{ space_id: string; keepalive_url?: string }>) {
      const preview = await this.preview(input)
      const user = await repo.upsertUser(preview.username, input)
      const selectedById = new Map(selected.map(item => [item.space_id, item]))
      const targets = preview.spaces
        .filter(option => option.selectable && selectedById.has(option.space_id))
        .map(option => ({
          space_id: option.space_id,
          space_name: option.space_name,
          title: option.title,
          alias: normalizeHfSpaceAlias(option.title, option.title || option.space_name),
          base_url: option.app_url,
          keepalive_url: validateKeepaliveUrl(option.app_url, selectedById.get(option.space_id)?.keepalive_url || option.default_keepalive_url),
          runtime_stage: option.runtime_stage,
          domain_stage: option.domain_stage,
          enabled: true
        }))
      const createdTargets = await repo.createTargets(user.id, targets)
      await keepaliveCreatedTargets(createdTargets, pingUrl, (target, result) => repo.recordKeepalive(target, result))
      return { user, created_targets: createdTargets.length }
    },

    async refreshUser(id: number) {
      const users = await repo.listUsers()
      const user = users.find(item => item.id === id)
      if (!user) throw new ApiHttpError('NOT_FOUND', 'HF 用户不存在', 404)
      const remoteSpaces = await fetchRemoteSpaces(user.username)
      const existing = await repo.existingSpaceIds()
      return {
        username: user.username,
        preferred_space_id: null,
        spaces: buildSpaceOptions(remoteSpaces, existing)
      }
    },

    async listTargets() {
      const targets = await repo.listTargets()
      const sinceIso = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      const logs = await repo.listRecentLogsForTargets(targets.map(target => target.id), sinceIso)
      const logsByTarget = new Map<number, typeof logs>()
      for (const log of logs) {
        const targetLogs = logsByTarget.get(log.target_id) || []
        targetLogs.push(log)
        logsByTarget.set(log.target_id, targetLogs)
      }
      return targets.map(target => ({ ...target, logs: logsByTarget.get(target.id) || [] }))
    },

    async updateTarget(id: number, patch: { keepalive_url?: string; enabled?: boolean; alias?: string }) {
      const target = await repo.findTarget(id)
      if (!target) throw new ApiHttpError('NOT_FOUND', 'HF 保活目标不存在', 404)
      const previousKeepaliveUrl = target.keepalive_url
      await repo.updateTarget(id, {
        alias: patch.alias === undefined ? undefined : normalizeHfSpaceAlias(patch.alias, target.title || target.space_name),
        keepalive_url: patch.keepalive_url === undefined ? undefined : validateKeepaliveUrl(target.base_url, patch.keepalive_url),
        enabled: patch.enabled
      })
      const updatedTarget = await repo.findTarget(id)
      if (updatedTarget) await keepaliveUpdatedTarget(previousKeepaliveUrl, updatedTarget, pingUrl, (item, result) => repo.recordKeepalive(item, result))
      return updatedTarget
    },

    async deleteTarget(id: number) {
      const target = await repo.findTarget(id)
      if (!target) throw new ApiHttpError('NOT_FOUND', 'HF 保活目标不存在', 404)
      assertCanDeleteHfSpaceTarget(target)
      await repo.deleteTarget(id)
      return { deleted: true }
    },

    async pingTarget(id: number) {
      const target = await repo.findTarget(id)
      if (!target) throw new ApiHttpError('NOT_FOUND', 'HF 保活目标不存在', 404)
      const result = await pingUrl(target.keepalive_url)
      await repo.recordKeepalive(target, result)
      return result
    },

    async pingEnabledTargets() {
      const targets = await repo.listTargets({ enabledOnly: true })
      for (const target of targets) {
        const result = await pingUrl(target.keepalive_url)
        await repo.recordKeepalive(target, result)
      }
      return { total: targets.length }
    },

    async paginateLogs(params: { userId?: number; targetId?: number; status?: string; page?: number; pageSize?: number }) {
      return repo.paginateLogs(params)
    },

    async deleteOlderHfSpaceKeepaliveLogs(cutoffIso: string) {
      return repo.deleteOlderHfSpaceKeepaliveLogs(cutoffIso)
    }
  }
}
