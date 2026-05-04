import { describe, expect, it } from 'vitest'
import { __checkinServiceTestHooks } from '../../worker/src/services/checkin-service'

/**
 * 签到平台端点候选测试
 * 验证不同平台的签到端点候选列表
 */
describe('checkin platform endpoint candidates', () => {
  /**
   * 验证使用 NewApi 兼容的签到端点，然后是 sign_in 回退
   * 测试 NewApi 平台的签到端点候选列表
   */
  it('uses NewApi-compatible checkin then sign_in fallback', () => {
    expect(__checkinServiceTestHooks.checkinEndpointCandidates('NewApi')).toEqual(['/api/user/checkin', '/api/user/sign_in'])
  })

  /**
   * 验证保持 AnyRouter 传统 sign_in 在 checkin 之前的回退顺序
   * 测试 AnyRouter 平台的签到端点候选列表
   */
  it('keeps AnyRouter legacy sign_in before checkin fallback', () => {
    expect(__checkinServiceTestHooks.checkinEndpointCandidates('AnyRouter')).toEqual(['/api/user/sign_in', '/api/user/checkin'])
  })

  /**
   * 验证使用 Veloera 上游兼容的签到端点
   * 测试 Veloera 平台的签到端点候选列表
   */
  it('uses Veloera upstream-compatible checkin endpoint', () => {
    expect(__checkinServiceTestHooks.checkinEndpointCandidates('Veloera')[0]).toBe('/api/user/checkin')
    expect(__checkinServiceTestHooks.checkinEndpointCandidates('Veloera')).not.toContain('/api/user/check_in')
  })

  /**
   * 验证保持 DoneHub 不支持签到
   * 测试 DoneHub 平台的签到端点候选列表
   */
  it('keeps DoneHub unsupported', () => {
    expect(__checkinServiceTestHooks.checkinEndpointCandidates('DoneHub')).toEqual([])
  })

  /**
   * 验证保持 RixApi 和 VoApi 兼容性回退在 NewApi 兼容端点之后
   * 测试 RixApi 和 VoApi 平台的签到端点候选列表
   */
  it('keeps RixApi and VoApi compatibility fallbacks after NewApi-compatible endpoints', () => {
    expect(__checkinServiceTestHooks.checkinEndpointCandidates('RixApi')).toEqual(['/api/user/checkin', '/api/user/sign_in', '/panel'])
    expect(__checkinServiceTestHooks.checkinEndpointCandidates('VoApi')).toEqual(['/api/user/checkin', '/api/user/sign_in', '/api/user/clock_in'])
  })
})
