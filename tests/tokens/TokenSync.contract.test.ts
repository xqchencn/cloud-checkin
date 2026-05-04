import { describe, expect, it } from 'vitest'
import { __tokenServiceTestHooks } from '../../worker/src/services/token-service'
import { siteDetailTokenListSource, tokenServiceSource } from '../sources'

describe('Token sync contracts', () => {
  it('marks masked remote tokens as pending instead of guessing non-standard key endpoints', () => {
    expect(tokenServiceSource).toContain('function tokenInputFromRemote(siteId: number, apiType: string, remote: Record<string, unknown>, existingFullKey: string | null = null)')
    expect(tokenServiceSource).toContain("value_status: masked && !existingFullKey ? 'masked_pending' : 'ready'")
    expect(tokenServiceSource).toContain('const existingFullKey = existing && !isPlaceholderTokenKey(existing.token_key) ? existing.token_key : null')
    expect(tokenServiceSource).toContain('const input = tokenInputFromRemote(siteId, site.api_type, remote, existingFullKey)')
    expect(tokenServiceSource).not.toContain('function tokenKeyEndpoint(site: ApiSite, remoteTokenId: string): string')
    expect(tokenServiceSource).not.toContain('async function fetchFullTokenKey')
    expect(tokenServiceSource).not.toContain('${encodeURIComponent(remoteTokenId)}/key')
    expect(siteDetailTokenListSource).toContain('本地不是完整密钥，不能复制。')
  })

  it('uses remote token management endpoints without update mutation guessing', () => {
    expect(tokenServiceSource).toContain('function tokenCollectionEndpoint(site: ApiSite): string')
    expect(tokenServiceSource).toContain('function tokenDeleteEndpointCandidates(site: ApiSite, remoteTokenId: string): string[]')
    expect(tokenServiceSource).toContain("requestWithSite(site, 'POST', tokenCollectionEndpoint(site), remoteTokenPayload(tokenName, group), '', cookies)")
    expect(tokenServiceSource).not.toContain("requestWithSite(site, 'PUT'")
    expect(tokenServiceSource).toContain("requestWithSite(site, 'DELETE', endpoint, undefined, '', cookies)")
  })

  it('requests real remote token group endpoints and parses platform group shapes', () => {
    expect(tokenServiceSource).toContain('export function tokenGroupEndpointCandidates(apiType: string): string[]')
    expect(tokenServiceSource).toContain("'/api/user/self/groups'")
    expect(tokenServiceSource).toContain("'/api/user_group_map'")
    expect(tokenServiceSource).toContain('function extractRemoteTokenGroupNames(payload: Record<string, unknown>): string[]')
    expect(tokenServiceSource).toContain('const GROUP_CONTAINER_KEYS')
    expect(tokenServiceSource).toContain('const GROUP_ITEM_NAME_KEYS')
    expect(tokenServiceSource).toContain("requestWithSite<Record<string, unknown>>(site, 'GET', buildApiEndpoint(site.url, endpoint), undefined, '', cookies)")
    expect(tokenServiceSource).toContain("return { groups: groups.length ? groups : ['default'] }")
    expect(tokenServiceSource).not.toContain("requestWithSite<Record<string, unknown>>(site, 'GET', buildApiEndpoint(site.url, getEndpointTokenGroups(site.api_type)), undefined, '', cookies).catch(() => null)")
  })

  it('extracts remote token groups from arrays, map endpoints, and nested platform payloads', () => {
    const { extractRemoteTokenGroupNames } = __tokenServiceTestHooks

    expect(extractRemoteTokenGroupNames({ success: true, data: ['default', 'vip'] })).toEqual(['default', 'vip'])
    expect(extractRemoteTokenGroupNames({ success: true, data: [{ name: 'default' }, { group: 'pro' }, { key: 'vip' }] })).toEqual(['default', 'pro', 'vip'])
    expect(extractRemoteTokenGroupNames({ success: true, data: { groups: { default: '默认', vip: 'VIP' } } })).toEqual(['default', 'vip'])
    expect(extractRemoteTokenGroupNames({
      success: true,
      data: {
        group_ratio: { default: 1, 'Claude Code专用-Kiro': 2 },
        usable_group: { vip: true }
      }
    })).toEqual(['default', 'Claude Code专用-Kiro', 'vip'])
  })
})
