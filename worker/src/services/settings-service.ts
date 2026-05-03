import { settingsRepository } from '../repositories/settings-repository'
import { WRANGLER_CHECKIN_CRON, WRANGLER_CLEANUP_CRON } from '../../../shared/generated/wrangler-crons'
import type { Env, PasswordUpdatePayload, PublicAppSettings, PublicSettingItem, RuntimeAppSettings, SettingsUpdatePayload } from '../types'

const PASSWORD_ITERATIONS = 210000
const PASSWORD_KEY_LENGTH_BITS = 256
export const DEFAULT_INITIAL_PASSWORD = 'change-this-password'

export const SETTING_KEYS = {
  passwordHash: 'auth.password_hash',
  passwordSalt: 'auth.password_salt',
  passwordIterations: 'auth.password_iterations',
  sessionTtl: 'session.ttl_seconds',
  logRetentionDays: 'logs.retention_days'
} as const

const ALL_KEYS = Object.values(SETTING_KEYS)
// 分类标题和说明同样进入 D1，这样前端分组文本就不需要再写死在组件里。
const CATEGORY_KEYS = {
  authTitle: 'meta.category.auth.title',
  authDescription: 'meta.category.auth.description',
  authSortOrder: 'meta.category.auth.sort_order',
  schedulerTitle: 'meta.category.scheduler.title',
  schedulerDescription: 'meta.category.scheduler.description',
  schedulerSortOrder: 'meta.category.scheduler.sort_order',
  logsTitle: 'meta.category.logs.title',
  logsDescription: 'meta.category.logs.description',
  logsSortOrder: 'meta.category.logs.sort_order'
} as const

const ALL_SETTING_KEYS = [...ALL_KEYS, ...Object.values(CATEGORY_KEYS)]

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (const byte of array) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4)
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0))
}

function parseNumber(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value || '')
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    PASSWORD_KEY_LENGTH_BITS
  )
  return bytesToBase64Url(bits)
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let diff = 0
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i)
  return diff === 0
}

function getConfiguredCron(): RuntimeAppSettings['scheduler'] {
  return {
    checkin_cron: WRANGLER_CHECKIN_CRON,
    cleanup_cron: WRANGLER_CLEANUP_CRON
  }
}

function parseRuntimeSettings(values: Record<string, string>): RuntimeAppSettings {
  return {
    session: {
      ttl_seconds: parseNumber(values[SETTING_KEYS.sessionTtl], 60 * 60 * 24 * 30, 300, 31536000)
    },
    logs: {
      retention_days: parseNumber(values[SETTING_KEYS.logRetentionDays], 31, 1, 3650)
    },
    scheduler: getConfiguredCron()
  }
}

function requireNumber(value: unknown, item: PublicSettingItem): string {
  const parsed = Number(value)
  const min = item.options?.min ?? Number.MIN_SAFE_INTEGER
  const max = item.options?.max ?? Number.MAX_SAFE_INTEGER
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${item.label}必须在 ${min} 到 ${max} 之间`)
  }
  return String(Math.floor(parsed))
}

function normalizeSettingValue(value: unknown, item: PublicSettingItem): string {
  if (item.type === 'number') return requireNumber(value, item)
  if (item.type === 'boolean') {
    if (typeof value !== 'boolean') throw new Error(`${item.label}必须是布尔值`)
    return String(value)
  }
  return String(value ?? '')
}

function buildReadonlySchedulerItems(): PublicSettingItem[] {
  const scheduler = getConfiguredCron()
  return [
    {
      key: 'scheduler.checkin_cron',
      value: scheduler.checkin_cron,
      type: 'cron',
      label: '签到任务 Cron',
      description: '由 wrangler.toml 管理，页面只读显示。需要修改时请直接改配置文件并重新部署。',
      category: 'scheduler',
      sort_order: 20,
      editable: false,
      options: { placeholder: scheduler.checkin_cron },
      updated_at: null
    },
    {
      key: 'scheduler.cleanup_cron',
      value: scheduler.cleanup_cron,
      type: 'cron',
      label: '历史记录清理 Cron',
      description: '由 wrangler.toml 管理，页面只读显示。需要修改时请直接改配置文件并重新部署。',
      category: 'scheduler',
      sort_order: 30,
      editable: false,
      options: { placeholder: scheduler.cleanup_cron },
      updated_at: null
    }
  ]
}

function buildCategories(values: Record<string, string>): PublicAppSettings['categories'] {
  return [
    {
      key: 'auth',
      title: values[CATEGORY_KEYS.authTitle] || '认证与会话',
      description: values[CATEGORY_KEYS.authDescription] || '登录密码保存在 D1，SESSION_SECRET 仍由 Cloudflare Secret 管理。',
      sort_order: parseNumber(values[CATEGORY_KEYS.authSortOrder], 10, 0, 1000)
    },
    {
      key: 'scheduler',
      title: values[CATEGORY_KEYS.schedulerTitle] || '定时任务',
      description: values[CATEGORY_KEYS.schedulerDescription] || 'Cron 由 wrangler.toml 维护，这里只读展示当前配置。',
      sort_order: parseNumber(values[CATEGORY_KEYS.schedulerSortOrder], 20, 0, 1000)
    },
    {
      key: 'logs',
      title: values[CATEGORY_KEYS.logsTitle] || '历史记录',
      description: values[CATEGORY_KEYS.logsDescription] || '历史记录保留策略由数据库设置驱动。',
      sort_order: parseNumber(values[CATEGORY_KEYS.logsSortOrder], 30, 0, 1000)
    }
  ].sort((left, right) => left.sort_order - right.sort_order)
}

export function settingsService(env: Env) {
  const repo = settingsRepository(env.DB)

  async function getRawSettings(): Promise<Record<string, string>> {
    return repo.getMany(ALL_SETTING_KEYS)
  }

  async function getPublicSettingsFromValues(values: Record<string, string>): Promise<PublicAppSettings> {
    const items = [...await repo.listPublic(), ...buildReadonlySchedulerItems()].sort((left, right) => left.sort_order - right.sort_order)
    return {
      auth: {
        database_password_configured: Boolean(values[SETTING_KEYS.passwordHash] && values[SETTING_KEYS.passwordSalt])
      },
      cloudflare: {
        cron_source: 'wrangler',
        cron_editable: false
      },
      categories: buildCategories(values),
      items,
      values: parseRuntimeSettings(values)
    }
  }

  return {
    async getPublicSettings(): Promise<PublicAppSettings> {
      return getPublicSettingsFromValues(await getRawSettings())
    },

    async getRuntimeSettings(): Promise<RuntimeAppSettings> {
      return parseRuntimeSettings(await getRawSettings())
    },

    async getSessionTtlSeconds(): Promise<number> {
      return parseRuntimeSettings(await getRawSettings()).session.ttl_seconds
    },

    async updateSettings(payload: SettingsUpdatePayload): Promise<PublicAppSettings> {
      const publicItems = await repo.listPublic()
      const itemByKey = new Map(publicItems.map(item => [item.key, item]))
      const updates: Record<string, string> = {}
      for (const [key, value] of Object.entries(payload.values || {})) {
        const item = itemByKey.get(key)
        if (!item || !item.editable) throw new Error(`设置项不可修改: ${key}`)
        updates[key] = normalizeSettingValue(value, item)
      }

      await repo.setMany(updates)
      return getPublicSettingsFromValues(await repo.getMany(ALL_SETTING_KEYS))
    },

    async updatePassword(payload: PasswordUpdatePayload): Promise<PublicAppSettings> {
      const password = payload.new_password || ''
      if (password.length < 8) throw new Error('新密码至少需要 8 位')
      if (password !== payload.confirm_password) throw new Error('两次输入的密码不一致')
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const hash = await derivePasswordHash(password, salt, PASSWORD_ITERATIONS)
      await repo.setMany({
        [SETTING_KEYS.passwordHash]: hash,
        [SETTING_KEYS.passwordSalt]: bytesToBase64Url(salt),
        [SETTING_KEYS.passwordIterations]: String(PASSWORD_ITERATIONS)
      })
      return getPublicSettingsFromValues(await repo.getMany(ALL_SETTING_KEYS))
    },

    async verifyLoginPassword(password: string): Promise<boolean> {
      const values = await getRawSettings()
      const hash = values[SETTING_KEYS.passwordHash]
      const salt = values[SETTING_KEYS.passwordSalt]
      if (!hash || !salt) return false
      // 迭代次数和 salt 一起保存在 D1，后续如果调整密码策略，不需要改旧密码的验证流程。
      const iterations = parseNumber(values[SETTING_KEYS.passwordIterations], PASSWORD_ITERATIONS, 1, 1000000)
      const derived = await derivePasswordHash(password, base64UrlToBytes(salt), iterations)
      return safeEqual(derived, hash)
    }
  }
}
