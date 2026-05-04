import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestWithSite } from '../../worker/src/services/api-client'
import type { ApiSite } from '../../worker/src/types'

function anyRouterSite(overrides: Partial<ApiSite> = {}): ApiSite {
  return {
    id: 1,
    name: 'AnyRouter',
    url: 'https://any.example',
    api_type: 'AnyRouter',
    account_label: '',
    sort_order: 0,
    auth_method: 'password',
    auth_value: '',
    user_id: '42',
    login_username: 'alice',
    login_password: 'secret',
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
    updated_at: '',
    ...overrides
  }
}

describe('AnyRouter password relogin flow', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('retries with a login session cookie when the stored cookie is expired', async () => {
    const requests: Array<{ url: string; headers: Headers; body: string }> = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const headers = new Headers(init?.headers)
      const body = typeof init?.body === 'string' ? init.body : ''
      requests.push({ url, headers, body })

      if (url.endsWith('/api/user/self')) {
        const cookie = headers.get('cookie') || ''
        if (cookie.includes('session=old')) {
          return new Response(JSON.stringify({ success: false, message: 'invalid token' }), {
            status: 401,
            headers: { 'content-type': 'application/json' }
          })
        }
        return new Response(JSON.stringify({ success: true, data: { username: 'alice' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      }

      if (url.endsWith('/api/user/login')) {
        expect(JSON.parse(body)).toEqual({ username: 'alice', password: 'secret' })
        return new Response(JSON.stringify({ success: true, data: {} }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'session=new; Path=/; HttpOnly'
          }
        })
      }

      throw new Error(`unexpected url: ${url}`)
    }))

    const response = await requestWithSite<Record<string, unknown>>(
      anyRouterSite({ auth_value: 'session=old' }),
      'GET',
      'https://any.example/api/user/self'
    )

    expect(response.data).toMatchObject({ success: true })
    expect(requests.map(request => request.url)).toEqual([
      'https://any.example/api/user/self',
      'https://any.example/api/user/login',
      'https://any.example/api/user/self'
    ])
    expect(requests[2].headers.get('cookie')).toBe('session=new')
  })

  it('retries with a login access token when the stored token is expired', async () => {
    const requests: Array<{ url: string; headers: Headers; body: string }> = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const headers = new Headers(init?.headers)
      const body = typeof init?.body === 'string' ? init.body : ''
      requests.push({ url, headers, body })

      if (url.endsWith('/api/user/self')) {
        if (headers.get('authorization') === 'Bearer fresh-token') {
          return new Response(JSON.stringify({ success: true, data: { username: 'alice' } }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        }
        if (headers.get('authorization') === 'Bearer old-token') {
          return new Response(JSON.stringify({ success: false, message: 'token expired' }), {
            status: 401,
            headers: { 'content-type': 'application/json' }
          })
        }
        return new Response(JSON.stringify({ success: false, message: 'missing token' }), {
          status: 401,
          headers: { 'content-type': 'application/json' }
        })
      }

      if (url.endsWith('/api/user/login')) {
        expect(JSON.parse(body)).toEqual({ username: 'alice', password: 'secret' })
        return new Response(JSON.stringify({ success: true, data: { token: 'fresh-token' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      }

      throw new Error(`unexpected url: ${url}`)
    }))

    const response = await requestWithSite<Record<string, unknown>>(
      anyRouterSite({ auth_value: 'old-token' }),
      'GET',
      'https://any.example/api/user/self'
    )

    expect(response.data).toMatchObject({ success: true })
    expect(requests.map(request => request.url)).toEqual([
      'https://any.example/api/user/self',
      'https://any.example/api/user/login',
      'https://any.example/api/user/self'
    ])
    expect(requests[0].headers.get('authorization')).toBe('Bearer old-token')
    expect(requests[2].headers.get('authorization')).toBe('Bearer fresh-token')
  })

  it('retries when the remote response is HTTP 200 but reports an expired token', async () => {
    const requests: Array<{ url: string; headers: Headers; body: string }> = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const headers = new Headers(init?.headers)
      const body = typeof init?.body === 'string' ? init.body : ''
      requests.push({ url, headers, body })

      if (url.endsWith('/api/user/self')) {
        if (headers.get('authorization') === 'Bearer fresh-token') {
          return new Response(JSON.stringify({ success: true, data: { username: 'alice' } }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        }
        return new Response(JSON.stringify({ success: false, message: 'invalid token' }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      }

      if (url.endsWith('/api/user/login')) {
        expect(JSON.parse(body)).toEqual({ username: 'alice', password: 'secret' })
        return new Response(JSON.stringify({ success: true, data: { token: 'fresh-token' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      }

      throw new Error(`unexpected url: ${url}`)
    }))

    const response = await requestWithSite<Record<string, unknown>>(
      anyRouterSite({ auth_value: 'old-token' }),
      'GET',
      'https://any.example/api/user/self'
    )

    expect(response.data).toMatchObject({ success: true })
    expect(requests.map(request => request.url)).toEqual([
      'https://any.example/api/user/self',
      'https://any.example/api/user/login',
      'https://any.example/api/user/self'
    ])
    expect(requests[2].headers.get('authorization')).toBe('Bearer fresh-token')
  })
})
