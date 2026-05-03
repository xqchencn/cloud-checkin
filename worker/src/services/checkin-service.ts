import { checkinLogRepository } from '../repositories/checkin-log-repository'
import { siteRepository } from '../repositories/site-repository'
import { ApiHttpError } from '../response'
import type { ApiSite, CheckinResult, Env } from '../types'
import { buildApiEndpoint, extractBoolean, extractDataObject, extractOptionalNumber, getNestedObject, getRemoteMessage, getSiteCookies, isFullUrl, isSuccessResponse, requestWithSite } from './api-client'
import { balanceService } from './balance-service'
import { getEndpointCheckin, supportsCheckin } from './site-types'

function alreadyCheckedIn(message: string): boolean {
  const lower = message.toLowerCase()
  return ['已签到', '今日已签', 'already checked in', 'already signed', 'duplicate'].some(keyword => lower.includes(keyword.toLowerCase()))
}

function convertQuota(remoteQuota: number): number {
  return remoteQuota / 500000
}

function firstNumber(data: Record<string, unknown>, fields: string[]): number | null {
  for (const field of fields) {
    const value = extractOptionalNumber(data, field)
    if (value !== null) return value
  }
  return null
}

function currentMonth(): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(new Date())
  const year = parts.find(part => part.type === 'year')?.value
  const month = parts.find(part => part.type === 'month')?.value
  return `${year}-${month}`
}

function extractRewardAmountFromMessage(message: string): number {
  const patterns = [
    /\$(\d+\.?\d*)/,
    /[￥¥]\s*(\d+\.?\d*)/,
    /(\d+\.?\d*)\s*美元/,
    /(\d+\.?\d*)\s*人民币/,
    /(\d+\.?\d*)\s*元/,
    /(\d+\.?\d*)\s*额度/,
    /(\d+\.?\d*)\s*USD/i,
    /(\d+\.?\d*)\s*CNY/i,
    /获得\s*(\d+\.?\d*)/,
    /奖励\s*(\d+\.?\d*)/
  ]
  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match?.[1]) return Number(match[1]) || 0
  }
  return 0
}

function isAlreadyCheckedInData(data: Record<string, unknown>, message: string): boolean {
  const rawMessage = data.message ?? data.msg
  if (rawMessage === undefined || rawMessage === null || String(rawMessage).trim() === '') return true
  return alreadyCheckedIn(String(rawMessage)) || alreadyCheckedIn(message)
}

function failedResult(siteId: number, message: string, checkinTime = new Date().toISOString()): CheckinResult {
  return {
    api_site_id: siteId,
    status: 'failed',
    message,
    reward_amount: 0,
    new_balance: 0,
    checkin_time: checkinTime,
    response_time: 0,
    http_status_code: 0
  }
}

export function buildCheckinEndpoint(site: ApiSite): string {
  // 支持单站点覆盖签到端点；未配置时走站点类型注册表里的默认端点。
  const custom = site.checkin_endpoint?.trim()
  if (custom) return isFullUrl(custom) ? custom : buildApiEndpoint(site.url, custom)
  const endpoint = getEndpointCheckin(site.api_type)
  return endpoint ? buildApiEndpoint(site.url, endpoint) : ''
}

export function checkinService(env: Env) {
  const sites = siteRepository(env.DB)
  const logs = checkinLogRepository(env.DB)

  async function logAndStore(siteId: number, result: CheckinResult, checkinType: string): Promise<void> {
    await sites.updateFields(siteId, {
      last_checkin: result.checkin_time,
      last_checkin_status: result.status
    })
    await logs.create({
      api_site_id: siteId,
      checkin_time: result.checkin_time,
      checkin_type: checkinType,
      status: result.status,
      message: result.message,
      reward_amount: result.reward_amount,
      new_balance: result.new_balance,
      response_time: result.response_time,
      http_status_code: result.http_status_code,
      error_details: result.status === 'failed' ? result.message : ''
    })
  }

  async function checkRemoteCheckinStatus(site: ApiSite): Promise<'continue' | 'already_checked_in' | 'disabled'> {
    // 和 Go 版保持一致：仅 NewApi 且未配置自定义端点时，先 GET 查询远程签到状态。
    if (site.api_type !== 'NewApi' || site.checkin_endpoint?.trim()) return 'continue'

    const isWongChannel = site.name.toLowerCase().includes('wong')
    const endpoint = isWongChannel
      ? buildApiEndpoint(site.url, '/api/user/checkin')
      : buildApiEndpoint(site.url, `/api/user/checkin?month=${currentMonth()}`)

    try {
      const cookies = await getSiteCookies(site.url)
      const response = await requestWithSite<Record<string, unknown>>(site, 'GET', endpoint, undefined, '', cookies)
      const data = extractDataObject(response.data)
      const enabled = extractBoolean(data, 'enabled')
      if (enabled === null) return 'continue'
      if (!enabled) return 'disabled'

      if (isWongChannel) {
        const checkedIn = extractBoolean(data, 'checked_in')
        return checkedIn === true ? 'already_checked_in' : 'continue'
      }

      const stats = getNestedObject(data, 'stats')
      if (!stats) return 'continue'
      const checkedInToday = extractBoolean(stats, 'checked_in_today')
      return checkedInToday === true ? 'already_checked_in' : 'continue'
    } catch {
      // Go 版这里是降级策略：状态查询失败不阻断实际签到请求。
      return 'continue'
    }
  }

  async function checkin(siteId: number, checkinType: string): Promise<CheckinResult> {
    const site = await sites.findById(siteId)
    if (!site) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
    if (!site.enabled) throw new ApiHttpError('VALIDATION_ERROR', '站点未启用')
    if (!supportsCheckin(site.api_type)) throw new ApiHttpError('VALIDATION_ERROR', `站点 ${site.name} 不支持签到`)

    const remoteStatus = await checkRemoteCheckinStatus(site)
    if (remoteStatus === 'disabled') {
      const result = failedResult(siteId, '签到功能未启用')
      await logAndStore(siteId, result, checkinType)
      return result
    }
    if (remoteStatus === 'already_checked_in') {
      const result: CheckinResult = {
        api_site_id: siteId,
        status: 'already_checked_in',
        message: '今日已签到（远程检测）',
        reward_amount: 0,
        new_balance: 0,
        checkin_time: new Date().toISOString(),
        response_time: 0,
        http_status_code: 0
      }
      await logAndStore(siteId, result, checkinType)
      return result
    }

    const endpoint = buildCheckinEndpoint(site)
    if (!endpoint) throw new ApiHttpError('VALIDATION_ERROR', '未配置签到端点')

    const started = Date.now()
    const checkinTime = new Date().toISOString()
    let result: CheckinResult

    try {
      const cookies = await getSiteCookies(site.url)
      const response = await requestWithSite<Record<string, unknown>>(site, 'POST', endpoint, null, '', cookies)
      const data = extractDataObject(response.data)
      const message = getRemoteMessage(response.data)
      // 各类 New API 分支返回格式不完全一致，这里同时看 success/code/status 和文案里的“已签到”。
      const isAlready = isAlreadyCheckedInData(data, message) || alreadyCheckedIn(JSON.stringify(data))
      const ok = isSuccessResponse(response.data) || isAlready
      const rewardRaw = firstNumber(data, ['reward', 'amount', 'quota_awarded'])
      const balanceRaw = firstNumber(data, ['balance', 'quota'])
      const rewardFromMessage = extractRewardAmountFromMessage(message)
      const rewardAmount = rewardRaw === null ? rewardFromMessage : convertQuota(rewardRaw)
      const newBalance = balanceRaw === null ? 0 : convertQuota(balanceRaw)
      result = {
        api_site_id: siteId,
        status: isAlready ? 'already_checked_in' : ok ? 'success' : 'failed',
        message: isAlready ? '今日已签到' : message,
        reward_amount: rewardAmount,
        new_balance: newBalance,
        checkin_time: checkinTime,
        response_time: response.responseTimeMs,
        http_status_code: response.status
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      result = {
        api_site_id: siteId,
        status: alreadyCheckedIn(message) ? 'already_checked_in' : 'failed',
        message: alreadyCheckedIn(message) ? '今日已签到' : `签到请求失败: ${message}`,
        reward_amount: 0,
        new_balance: 0,
        checkin_time: checkinTime,
        response_time: Date.now() - started,
        http_status_code: 0
      }
    }

    await logAndStore(siteId, result, checkinType)

    if (result.status === 'success') {
      // 签到成功后顺手刷新余额；失败不阻断签到日志写入。
      await balanceService(env).queryUserInfo(siteId).catch(() => undefined)
    }

    return result
  }

  return {
    checkin,

    async batchCheckin(siteIds: number[], checkinType = 'manual') {
      const started = Date.now()
      const results: CheckinResult[] = []
      for (const siteId of siteIds) {
        try {
          const site = await sites.findById(siteId)
          if (!site) {
            results.push(failedResult(siteId, '站点不存在'))
            continue
          }
          if (!site.auto_checkin) {
            continue
          }
          results.push(await checkin(siteId, checkinType))
        } catch (error) {
          results.push(failedResult(siteId, error instanceof Error ? `签到失败: ${error.message}` : `签到失败: ${String(error)}`))
        }
      }
      return {
        total_sites: siteIds.length,
        success_count: results.filter(r => r.status === 'success' || r.status === 'already_checked_in').length,
        failed_count: results.filter(r => r.status === 'failed' || r.status === 'error').length,
        results,
        execution_time: Date.now() - started
      }
    },

    async checkinAllAutoSites() {
      const autoSites = await sites.findAutoCheckin()
      return this.batchCheckin(autoSites.map(site => site.id), 'scheduled')
    }
  }
}
