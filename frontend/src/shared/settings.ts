import type { AppSettings, SettingItem, SettingValuePrimitive, SettingValueTree } from '../api/apiSite'

/**
 * 检查是否为设置树
 * @param value - 设置值
 * @returns 是否为设置树
 */
function isSettingTree(value: SettingValuePrimitive | SettingValueTree): value is SettingValueTree {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 序列化设置值
 * @param value - 设置值
 * @returns 序列化后的字符串
 */
function stringifySettingValue(value: SettingValuePrimitive): string {
  return typeof value === 'boolean' ? String(value) : `${value ?? ''}`
}

/**
 * 展平设置值
 * @param values - 设置值树
 * @param prefix - 前缀
 * @returns 展平后的设置值
 */
function flattenSettingValues(values: SettingValueTree, prefix = ''): Record<string, string> {
  return Object.entries(values).reduce<Record<string, string>>((acc, [key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key
    if (isSettingTree(value)) Object.assign(acc, flattenSettingValues(value, nextKey))
    else acc[nextKey] = stringifySettingValue(value)
    return acc
  }, {})
}

/**
 * 规范化应用设置
 * @param settings - 应用设置
 * @returns 规范化后的应用设置
 */
export function normalizeAppSettings(settings: AppSettings): AppSettings {
  const runtimeValues = flattenSettingValues(settings.values)
  return {
    ...settings,
    items: [...settings.items]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map(item => ({ ...item, value: runtimeValues[item.key] ?? item.value ?? '' }))
  }
}

/**
 * 格式化设置描述
 * @param item - 设置项
 * @returns 格式化后的描述
 */
export function formatSettingDescription(item: SettingItem): string {
  return [item.description, item.options?.unit ? `单位：${item.options.unit}` : ''].filter(Boolean).join(' ')
}

/**
 * 强制转换设置负载值
 * @param item - 设置项
 * @returns 转换后的设置值
 */
export function coerceSettingPayloadValue(item: SettingItem): SettingValuePrimitive {
  if (item.type === 'boolean') return item.value === 'true'
  if (item.type === 'number') {
    const parsed = Number(item.value)
    return Number.isFinite(parsed) ? parsed : item.value
  }
  return item.value
}
