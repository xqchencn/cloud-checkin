import type { AppSettings, SettingItem, SettingValuePrimitive, SettingValueTree } from '../api/apiSite'

function isSettingTree(value: SettingValuePrimitive | SettingValueTree): value is SettingValueTree {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringifySettingValue(value: SettingValuePrimitive): string {
  return typeof value === 'boolean' ? String(value) : `${value ?? ''}`
}

function flattenSettingValues(values: SettingValueTree, prefix = ''): Record<string, string> {
  return Object.entries(values).reduce<Record<string, string>>((acc, [key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key
    if (isSettingTree(value)) Object.assign(acc, flattenSettingValues(value, nextKey))
    else acc[nextKey] = stringifySettingValue(value)
    return acc
  }, {})
}

export function normalizeAppSettings(settings: AppSettings): AppSettings {
  const runtimeValues = flattenSettingValues(settings.values)
  return {
    ...settings,
    items: [...settings.items]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map(item => ({ ...item, value: runtimeValues[item.key] ?? item.value ?? '' }))
  }
}

export function formatSettingDescription(item: SettingItem): string {
  return [item.description, item.options?.unit ? `单位：${item.options.unit}` : ''].filter(Boolean).join(' ')
}

export function coerceSettingPayloadValue(item: SettingItem): SettingValuePrimitive {
  if (item.type === 'boolean') return item.value === 'true'
  if (item.type === 'number') {
    const parsed = Number(item.value)
    return Number.isFinite(parsed) ? parsed : item.value
  }
  return item.value
}
