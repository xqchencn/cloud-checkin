import { all, nowIso } from '../db'
import type { PublicSettingItem, SettingValueType } from '../types'

interface SettingRow {
  key: string
  value: string
  type: SettingValueType
  label: string
  description: string
  category: string
  sort_order: number
  editable: number
  options: string | null
  updated_at: string | null
}

function parseOptions(value: string | null): PublicSettingItem['options'] {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'object' && parsed ? parsed : null
  } catch {
    return null
  }
}

function toPublicItem(row: SettingRow): PublicSettingItem {
  return {
    key: row.key,
    value: row.value,
    type: row.type,
    label: row.label,
    description: row.description,
    category: row.category,
    sort_order: Number(row.sort_order || 0),
    editable: Boolean(row.editable),
    options: parseOptions(row.options),
    updated_at: row.updated_at
  }
}

export function settingsRepository(db: D1Database) {
  return {
    async getMany(keys: string[]): Promise<Record<string, string>> {
      if (!keys.length) return {}
      // 设置项键集很小，按 key IN 查询足够直接，也方便服务层一次性拿到运行时设置和页面元数据。
      const placeholders = keys.map(() => '?').join(', ')
      const rows = await all<{ key: string; value: string }>(
        db.prepare(`SELECT key, value FROM app_settings WHERE key IN (${placeholders})`).bind(...keys)
      )
      return Object.fromEntries(rows.map(row => [row.key, row.value]))
    },

    async listPublic(): Promise<PublicSettingItem[]> {
      // 页面只展示 editable=1 的数据库项；Cron 这类只读配置由服务层额外拼只读项。
      const rows = await all<SettingRow>(
        db.prepare(`
          SELECT key, value, type, label, description, category, sort_order, editable, options, updated_at
          FROM app_settings
          WHERE editable = 1
          ORDER BY category ASC, sort_order ASC, key ASC
        `)
      )
      return rows.map(toPublicItem)
    },

    async setMany(values: Record<string, string>): Promise<void> {
      const entries = Object.entries(values)
      if (!entries.length) return
      const timestamp = nowIso()
      // 当前只允许更新已存在的设置项，避免前端传任意 key 时把数据库写脏。
      const statements = entries.map(([key, value]) => db.prepare(`
        UPDATE app_settings
        SET value = ?, updated_at = ?
        WHERE key = ?
      `).bind(value, timestamp, key))
      await db.batch(statements)
    }
  }
}
