import type { ApiSite } from '../api/apiSite'
import { SUPPORTED_CHECKIN_TYPES } from './constants'
import { formatDate } from './format'

export function supportsSiteCheckin(site: ApiSite): boolean {
  return SUPPORTED_CHECKIN_TYPES.includes(site.api_type)
}

export function getCheckinDisabledReason(site: ApiSite): string {
  if (!supportsSiteCheckin(site)) return '当前站点类型不支持签到'
  if (!site.auto_checkin) return '自动签到未启用，无法签到'
  return ''
}

function businessDateKey(value: string): string | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const businessDate = new Date(date)
  if (businessDate.getHours() < 8) businessDate.setDate(businessDate.getDate() - 1)
  return `${businessDate.getFullYear()}-${businessDate.getMonth() + 1}-${businessDate.getDate()}`
}

function isCurrentCheckinCycle(value: string | null | undefined): boolean {
  if (!value) return false
  return businessDateKey(value) === businessDateKey(new Date().toISOString())
}

function isCheckinSuccess(status: string | null | undefined): boolean {
  return status === 'success' || status === 'already_checked_in'
}

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
