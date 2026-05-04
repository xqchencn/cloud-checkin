import { describe, expect, it } from 'vitest'
import { buildAuthHeaders } from '../../worker/src/services/api-client'
import { getUserIdHeaders } from '../../worker/src/services/site-types'
import type { ApiSite } from '../../worker/src/types'

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

describe('platform auth headers', () => {
  it('sends every NewApi-compatible user id header', () => {
    const headers = buildAuthHeaders(site('NewApi'))
    expect(headers.get('New-API-User')).toBe('42')
    expect(headers.get('new-api-user')).toBe('42')
    expect(headers.get('User-id')).toBe('42')
    expect(headers.get('Rix-Api-User')).toBe('42')
    expect(headers.get('voapi-user')).toBe('42')
  })

  it('uses Veloera upstream-compatible header casing', () => {
    const headers = buildAuthHeaders(site('Veloera'))
    expect(headers.get('Veloera-User')).toBe('42')
    expect(getUserIdHeaders('Veloera')).toContain('Veloera-User')
    expect(getUserIdHeaders('Veloera')).not.toContain('veloera-user')
  })

  it('does not send user id headers for OneApi', () => {
    const headers = buildAuthHeaders(site('OneApi'))
    expect(headers.get('New-API-User')).toBeNull()
    expect(headers.get('new-api-user')).toBeNull()
  })

  it('does not treat login password as a cookie in password auth mode', () => {
    const headers = buildAuthHeaders({ ...site('NewApi'), auth_method: 'password', auth_value: 'plain-password' })
    expect(headers.get('cookie')).toBeNull()
  })

  it('keeps AnyRouter password mode compatible with cookie auth_value', () => {
    const headers = buildAuthHeaders({ ...site('AnyRouter'), auth_method: 'password', auth_value: 'session=legacy; token=abc' })
    expect(headers.get('cookie')).toBe('session=legacy; token=abc')
  })

  it('keeps AnyRouter password mode compatible with token auth_value', () => {
    const headers = buildAuthHeaders({ ...site('AnyRouter'), auth_method: 'password', auth_value: 'old-token' })
    expect(headers.get('authorization')).toBe('Bearer old-token')
    expect(headers.get('cookie')).toBeNull()
  })
})
