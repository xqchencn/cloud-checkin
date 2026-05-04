import type { ApiSite } from '../api/apiSite'
import { SUPPORTED_CHECKIN_TYPES } from './constants'
import { formatDate } from './format'

/**
 * 检查站点是否支持签到
 * @param site - 站点对象
 * @returns boolean - 是否支持签到
 */
export function supportsSiteCheckin(site: ApiSite): boolean {
  return SUPPORTED_CHECKIN_TYPES.includes(site.api_type)
}

/**
 * 获取站点签到禁用原因
 * @param site - 站点对象
 * @returns string - 禁用原因
 */
export function getCheckinDisabledReason(site: ApiSite): string {
  if (!supportsSiteCheckin(site)) return '当前站点类型不支持签到'
  if (!site.auto_checkin) return '自动签到未启用，无法签到'
  return ''
}

/**
 * 获取业务日期键
 * @param value - 日期字符串
 * @returns string | null - 业务日期键
 */
function businessDateKey(value: string): string | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const businessDate = new Date(date)
  if (businessDate.getHours() < 8) businessDate.setDate(businessDate.getDate() - 1)
  return `${businessDate.getFullYear()}-${businessDate.getMonth() + 1}-${businessDate.getDate()}`
}

/**
 * 检查是否为当前签到周期
 * @param value - 日期字符串
 * @returns boolean - 是否为当前周期
 */
function isCurrentCheckinCycle(value: string | null | undefined): boolean {
  if (!value) return false
  return businessDateKey(value) === businessDateKey(new Date().toISOString())
}

/**
 * 检查签到是否成功
 * @param status - 签到状态
 * @returns boolean - 是否成功
 */
function isCheckinSuccess(status: string | null | undefined): boolean {
  return status === 'success' || status === 'already_checked_in'
}

/**
 * 获取签到显示信息
 * @param site - 站点对象
 * @returns { text: string; tone: 'success' | 'warning' | 'danger' | 'muted' | 'info'; hint: string } - 签到显示信息
 */
export function getCheckinDisplay(site: ApiSite): { text: string; tone: 'success' | 'warning' | 'danger' | 'muted' | 'info'; hint: string } {
  if (!supportsSiteCheckin(site)) return { text: '不支持', tone: 'muted', hint: '当前站点类型不支持签到' }
  if (!site.auto_checkin) return { text: '未启用', tone: 'muted', hint: '自动签到未启用' }
  if (!site.last_checkin) return { text: '未签到', tone: 'warning', hint: '暂无签到记录' }
  if (isCheckinSuccess(site.last_checkin_status) && isCurrentCheckinCycle(site.last_checkin)) {
    return { text: '已签到', tone: 'success', hint: `本轮签到成功：${formatDate(site.last_checkin)}` }
  }
  if (site.last_checkin_status === 'failed' || site.last_checkin_status === 'error') {
    return { text: '失败', tone: 'danger', hint: site.last_check_message || formatDate(site.last_checkin) }
  }
  return { text: '未签到', tone: 'warning', hint: `上次签到：${formatDate(site.last_checkin)}` }
}
