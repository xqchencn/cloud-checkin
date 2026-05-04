import { describe, expect, it } from 'vitest'
import { buildAuthHeaders } from '../../worker/src/services/api-client'
import { getUserIdHeaders } from '../../worker/src/services/site-types'
import type { ApiSite } from '../../worker/src/types'

/**
 * 创建站点测试数据
 * @param api_type - API 类型
 * @param user_id - 用户 ID
 * @returns 站点对象
 */
function site(api_type: string, user_id = '42'): ApiSite {
  return {
    id: 1,
    name: api_type,
    url: 'https://example.com',
    api_type,
    account_label: '',
    sort_order: 0,
    auth_method: 'sessions',
    auth_value: 'session=abc',
    user_id,
    login_username: null,
    login_password: null,
    enabled: true,
    auto_checkin: true,
    site_username: null,
    site_user_group: null,
    site_aff_code: null,
    site_quota: 0,
    site_used_quota: 0,
    site_request_count: 0,
    site_aff_count: 0,
    site_aff_quota: 0,
    site_aff_history_quota: 0,
    last_checkin: null,
    last_checkin_status: null,
    last_check_time: null,
    last_check_status: 'pending',
    last_check_message: null,
    remarks: null,
    checkin_endpoint: null,
    created_at: '',
    updated_at: ''
  }
}

/**
 * 平台认证头测试
 * 验证不同平台的认证头构建和发送
 */
describe('platform auth headers', () => {
  /**
   * 验证发送每个 NewApi 兼容的用户 ID 头
   * 测试 NewApi 平台的认证头构建
   */
  it('sends every NewApi-compatible user id header', () => {
    const headers = buildAuthHeaders(site('NewApi'))
    expect(headers.get('New-API-User')).toBe('42')
    expect(headers.get('new-api-user')).toBe('42')
    expect(headers.get('User-id')).toBe('42')
    expect(headers.get('Rix-Api-User')).toBe('42')
    expect(headers.get('voapi-user')).toBe('42')
  })

  /**
   * 验证使用 Veloera 上游兼容的头大小写
   * 测试 Veloera 平台的认证头构建
   */
  it('uses Veloera upstream-compatible header casing', () => {
    const headers = buildAuthHeaders(site('Veloera'))
    expect(headers.get('Veloera-User')).toBe('42')
    expect(getUserIdHeaders('Veloera')).toContain('Veloera-User')
    expect(getUserIdHeaders('Veloera')).not.toContain('veloera-user')
  })

  /**
   * 验证不为 OneApi 发送用户 ID 头
   * 测试 OneApi 平台的认证头构建
   */
  it('does not send user id headers for OneApi', () => {
    const headers = buildAuthHeaders(site('OneApi'))
    expect(headers.get('New-API-User')).toBeNull()
    expect(headers.get('new-api-user')).toBeNull()
  })

  /**
   * 验证在密码认证模式下不将登录密码视为 cookie
   * 测试密码认证模式的认证头构建
   */
  it('does not treat login password as a cookie in password auth mode', () => {
    const headers = buildAuthHeaders({ ...site('NewApi'), auth_method: 'password', auth_value: 'plain-password' })
    expect(headers.get('cookie')).toBeNull()
  })

  /**
   * 验证保持 AnyRouter 密码模式与 cookie auth_value 兼容
   * 测试 AnyRouter 密码模式的 cookie 认证
   */
  it('keeps AnyRouter password mode compatible with cookie auth_value', () => {
    const headers = buildAuthHeaders({ ...site('AnyRouter'), auth_method: 'password', auth_value: 'session=legacy; token=abc' })
    expect(headers.get('cookie')).toBe('session=legacy; token=abc')
  })

  /**
   * 验证保持 AnyRouter 密码模式与令牌 auth_value 兼容
   * 测试 AnyRouter 密码模式的令牌认证
   */
  it('keeps AnyRouter password mode compatible with token auth_value', () => {
    const headers = buildAuthHeaders({ ...site('AnyRouter'), auth_method: 'password', auth_value: 'old-token' })
    expect(headers.get('authorization')).toBe('Bearer old-token')
    expect(headers.get('cookie')).toBeNull()
  })
})
