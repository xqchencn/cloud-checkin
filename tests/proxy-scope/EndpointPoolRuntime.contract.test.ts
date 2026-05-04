import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const balanceSource = readFileSync('worker/src/services/balance-service.ts', 'utf8')
const checkinSource = readFileSync('worker/src/services/checkin-service.ts', 'utf8')
const tokenSource = readFileSync('worker/src/services/token-service.ts', 'utf8')
const modelSource = readFileSync('worker/src/services/model-service.ts', 'utf8')

/**
 * 远程请求运行时范围合约测试
 * 验证远程请求运行时范围管理的一致性和正确性
 */
describe('remote request runtime scope contracts', () => {
  /**
   * 验证不为当前站点操作选择备用端点池
   * 确保端点池选择逻辑未被意外引入
   */
  it('does not select alternate endpoint pools for current site operations', () => {
    expect(existsSync('worker/src/services/site-endpoint-service.ts')).toBe(false)
    for (const source of [balanceSource, checkinSource, tokenSource, modelSource]) {
      expect(source).not.toContain('withSelectedEndpoint')
      expect(source).not.toContain('cooldownSeconds')
      expect(source).not.toContain('markFailure')
    }
  })

  /**
   * 验证使用配置的站点 URL 和平台适配器端点元数据直接访问
   * 确保远程请求使用正确的端点配置
   */
  it('uses configured site URL and platform adapter endpoint metadata directly', () => {
    expect(balanceSource).toContain("getEndpointCandidates(site.api_type, 'userInfo')")
    expect(checkinSource).toContain('buildCheckinEndpoints(site)')
    expect(tokenSource).toContain('tokenListEndpoint(site)')
    expect(modelSource).toContain('modelEndpointCandidates(site.api_type)')
    expect(modelSource).toContain("getEndpointCandidates(apiType, 'models')")
  })
})
