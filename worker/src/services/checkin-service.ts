import { checkinLogRepository } from '../repositories/checkin-log-repository'
import { siteRepository } from '../repositories/site-repository'
import { ApiHttpError } from '../response'
import type { ApiSite, CheckinResult, Env } from '../types'
import { buildApiEndpoint, extractBoolean, extractDataObject, extractOptionalNumber, getNestedObject, getRemoteMessage, getSiteCookies, isFullUrl, isSuccessResponse, requestWithSite } from './api-client'
import { balanceService } from './balance-service'
import { getPlatformAdapter } from './platforms'
import { getEndpointCandidates, supportsCheckin } from './site-types'

/**
 * 判断是否已签到
 * @param message - 消息内容
 * @returns 是否已签到
 */
function alreadyCheckedIn(message: string): boolean {
  const lower = message.toLowerCase()
  return ['已签到', '今日已签', 'already checked in', 'already signed', 'duplicate'].some(keyword => lower.includes(keyword.toLowerCase()))
}

/**
 * 转换配额
 * @param remoteQuota - 远程配额
 * @param apiType - API 类型
 * @returns 转换后的配额
 */
function convertQuota(remoteQuota: number, apiType: string): number {
  return remoteQuota / (getPlatformAdapter(apiType)?.balance.quotaFactor ?? 500000)
}

/**
 * 获取第一个数字值
 * @param data - 数据对象
 * @param fields - 字段列表
 * @returns 数字值或 null
 */
function firstNumber(data: Record<string, unknown>, fields: string[]): number | null {
  for (const field of fields) {
    const value = extractOptionalNumber(data, field)
    if (value !== null) return value
  }
  return null
}

/**
 * 获取当前月份
 * @returns 当前月份字符串
 */
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

/**
 * 从消息中提取奖励金额
 * @param message - 消息内容
 * @returns 奖励金额
 */
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

/**
 * 判断是否已签到数据
 * @param data - 数据对象
 * @param message - 消息内容
 * @returns 是否已签到
 */
function isAlreadyCheckedInData(data: Record<string, unknown>, message: string): boolean {
  const rawMessage = data.message ?? data.msg
  if (rawMessage === undefined || rawMessage === null || String(rawMessage).trim() === '') return true
  return alreadyCheckedIn(String(rawMessage)) || alreadyCheckedIn(message)
}

/**
 * 创建失败结果
 * @param siteId - 站点 ID
 * @param message - 消息
 * @param checkinTime - 签到时间
 * @returns 签到结果
 */
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

/**
 * 创建跳过结果
 * @param siteId - 站点 ID
 * @param message - 消息
 * @param currentBalance - 当前余额
 * @param checkinTime - 签到时间
 * @returns 签到结果
 */
function skippedResult(siteId: number, message: string, currentBalance = 0, checkinTime = new Date().toISOString()): CheckinResult {
  return {
    api_site_id: siteId,
    status: 'skipped',
    message,
    reward_amount: 0,
    new_balance: currentBalance,
    checkin_time: checkinTime,
    response_time: 0,
    http_status_code: 0
  }
}

/**
 * 构建签到诊断信息
 * @param site - 站点信息
 * @param result - 签到结果
 * @returns 诊断信息
 */
function buildCheckinDiagnostics(site: ApiSite, result: CheckinResult) {
  const failed = result.status === 'failed' || result.status === 'error'
  const skipped = result.status === 'skipped' || result.status === 'already_checked_in'
  return {
    skip_reason: skipped ? result.message : null,
    failure_reason: failed ? result.message : null,
    balance_before: site.site_quota,
    balance_after: result.status === 'success' ? result.new_balance : null
  }
}

/**
 * 构建签到端点
 * @param site - 站点信息
 * @returns 签到端点
 */
export function buildCheckinEndpoint(site: ApiSite): string {
  // 支持单站点覆盖签到端点；未配置时走站点类型注册表里的默认端点。
  const custom = site.checkin_endpoint?.trim()
  if (custom) return isFullUrl(custom) ? custom : buildApiEndpoint(site.url, custom)
  const endpoint = checkinEndpointCandidates(site.api_type)[0] ?? ''
  return endpoint ? buildApiEndpoint(site.url, endpoint) : ''
}

/**
 * 获取签到端点候选列表
 * @param apiType - API 类型
 * @returns 签到端点候选列表
 */
export function checkinEndpointCandidates(apiType: string): string[] {
  return getEndpointCandidates(apiType, 'checkin')
}

/**
 * 构建签到端点列表
 * @param site - 站点信息
 * @returns 签到端点列表
 */
export function buildCheckinEndpoints(site: ApiSite): string[] {
  const custom = site.checkin_endpoint?.trim()
  if (custom) return [isFullUrl(custom) ? custom : buildApiEndpoint(site.url, custom)]
  return checkinEndpointCandidates(site.api_type).map(endpoint => buildApiEndpoint(site.url, endpoint))
}

/**
 * 判断是否应该尝试下一个签到端点
 * @param message - 消息内容
 * @returns 是否应该尝试下一个端点
 */
function shouldTryNextCheckinEndpoint(message: string): boolean {
  const lower = message.toLowerCase()
  return [
    'invalid url',
    'endpoint not found',
    'checkin endpoint not found',
    'not support checkin',
    'does not support checkin',
    '404'
  ].some(keyword => lower.includes(keyword))
}

/** 签到服务测试钩子 */
export const __checkinServiceTestHooks = {
  checkinEndpointCandidates,
  extractRewardAmountFromMessage
}

/**
 * 签到服务工厂函数
 * @param env - 环境变量
 * @returns 签到服务对象
 */
export function checkinService(env: Env) {
  const sites = siteRepository(env.DB)
  const logs = checkinLogRepository(env.DB)

  /**
   * 记录并存储签到结果
   * @param site - 站点信息
   * @param result - 签到结果
   * @param checkinType - 签到类型
   */
  async function logAndStore(site: ApiSite, result: CheckinResult, checkinType: string): Promise<void> {
    await sites.updateFields(site.id, {
      last_checkin: result.checkin_time,
      last_checkin_status: result.status
    })
    await logs.create({
      api_site_id: site.id,
      checkin_time: result.checkin_time,
      checkin_type: checkinType,
      status: result.status,
      message: result.message,
      reward_amount: result.reward_amount,
      new_balance: result.new_balance,
      response_time: result.response_time,
      http_status_code: result.http_status_code,
      error_details: result.status === 'failed' ? result.message : '',
      ...buildCheckinDiagnostics(site, result)
    })
  }

  /**
   * 检查远程签到状态
   * @param site - 站点信息
   * @returns 远程签到状态
   */
  async function checkRemoteCheckinStatus(site: ApiSite): Promise<'continue' | 'already_checked_in' | 'disabled'> {
    // 仅 NewApi 且未配置自定义端点时，先 GET 查询远程签到状态。
    if (site.api_type !== 'NewApi' || site.checkin_endpoint?.trim()) return 'continue'

    const isWongChannel = site.name.toLowerCase().includes('wong')

    try {
      const endpoint = isWongChannel
        ? buildApiEndpoint(site.url, '/api/user/checkin')
        : buildApiEndpoint(site.url, `/api/user/checkin?month=${currentMonth()}`)
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
      // 状态探测失败不阻断实际签到请求，避免远端查询接口波动影响签到。
      return 'continue'
    }
  }

  /**
   * 执行签到
   * @param siteId - 站点 ID
   * @param checkinType - 签到类型
   * @returns Promise<CheckinResult> - 签到结果
   */
  async function checkin(siteId: number, checkinType: string): Promise<CheckinResult> {
    const site = await sites.findById(siteId)
    if (!site) throw new ApiHttpError('NOT_FOUND', '站点不存在', 404)
    if (!site.enabled) {
      const result = skippedResult(siteId, '站点未启用', site.site_quota)
      await logAndStore(site, result, checkinType)
      return result
    }
    if (!supportsCheckin(site.api_type)) {
      const result = skippedResult(siteId, `站点 ${site.name} 不支持签到`, site.site_quota)
      await logAndStore(site, result, checkinType)
      return result
    }

    const remoteStatus = await checkRemoteCheckinStatus(site)
    if (remoteStatus === 'disabled') {
      const result = skippedResult(siteId, '签到功能未启用', site.site_quota)
      await logAndStore(site, result, checkinType)
      return result
    }
    if (remoteStatus === 'already_checked_in') {
      const result: CheckinResult = {
        api_site_id: siteId,
        status: 'already_checked_in',
        message: '今日已签到（远程检测）',
        reward_amount: 0,
        new_balance: site.site_quota,
        checkin_time: new Date().toISOString(),
        response_time: 0,
        http_status_code: 0
      }
      await logAndStore(site, result, checkinType)
      return result
    }

    const endpoints = buildCheckinEndpoints(site)
    if (!endpoints.length) throw new ApiHttpError('VALIDATION_ERROR', '未配置签到端点')

    const started = Date.now()
    const checkinTime = new Date().toISOString()
    let result: CheckinResult | null = null
    let lastFailureMessage = ''

    const cookies = await getSiteCookies(site.url)
    for (const endpoint of endpoints) {
      try {
        const body = endpoint.includes('/sign_in') ? {} : null
        const response = await requestWithSite<Record<string, unknown>>(site, 'POST', endpoint, body, '', cookies)
        const data = extractDataObject(response.data)
        const message = getRemoteMessage(response.data)
        // 各类 New API 分支返回格式不完全一致，这里同时看 success/code/status 和文案里的”已签到”。
        const isAlready = isAlreadyCheckedInData(data, message) || alreadyCheckedIn(JSON.stringify(data))
        const ok = isSuccessResponse(response.data) || isAlready
        const rewardRaw = firstNumber(data, ['reward', 'amount', 'quota_awarded'])
        const balanceRaw = firstNumber(data, ['balance', 'quota'])
        const rewardFromMessage = extractRewardAmountFromMessage(message)
        const rewardAmount = rewardRaw === null ? rewardFromMessage : convertQuota(rewardRaw, site.api_type)
        const newBalance = balanceRaw === null ? 0 : convertQuota(balanceRaw, site.api_type)
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
        if (result.status !== 'failed' || !shouldTryNextCheckinEndpoint(message)) break
        lastFailureMessage = message
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        lastFailureMessage = message
        if (!shouldTryNextCheckinEndpoint(message)) {
          result = {
            api_site_id: siteId,
            status: alreadyCheckedIn(message) ? 'already_checked_in' : 'failed',
            message: alreadyCheckedIn(message) ? '今日已签到' : `签到请求失败: ${message}`,
            reward_amount: 0,
            new_balance: alreadyCheckedIn(message) ? site.site_quota : 0,
            checkin_time: checkinTime,
            response_time: Date.now() - started,
            http_status_code: 0
          }
          break
        }
      }
    }

    if (!result) {
      const message = lastFailureMessage || '签到请求失败'
      result = {
        api_site_id: siteId,
        status: alreadyCheckedIn(message) ? 'already_checked_in' : 'failed',
        message: alreadyCheckedIn(message) ? '今日已签到' : `签到请求失败: ${message}`,
        reward_amount: 0,
        new_balance: alreadyCheckedIn(message) ? site.site_quota : 0,
        checkin_time: checkinTime,
        response_time: Date.now() - started,
        http_status_code: 0
      }
    }

    await logAndStore(site, result, checkinType)

    if (result.status === 'success') {
      // 签到成功后顺手刷新余额；失败不阻断签到日志写入。
      await balanceService(env).queryUserInfo(siteId).catch(() => undefined)
    }

    return result
  }

  return {
    checkin,

    /**
     * 批量签到
     * @param siteIds - 站点 ID 列表
     * @param checkinType - 签到类型
     * @returns Promise<BatchCheckinResult> - 批量签到结果
     */
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
        skipped_count: results.filter(r => r.status === 'skipped').length,
        failed_count: results.filter(r => r.status === 'failed' || r.status === 'error').length,
        results,
        execution_time: Date.now() - started
      }
    },

    /**
     * 签到所有自动签到站点
     * @returns Promise<BatchCheckinResult> - 批量签到结果
     */
    async checkinAllAutoSites() {
      const autoSites = await sites.findAutoCheckin()
      return this.batchCheckin(autoSites.map(site => site.id), 'scheduled')
    }
  }
}
