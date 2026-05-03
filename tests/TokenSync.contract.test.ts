import { describe, expect, it } from 'vitest'
import { appSource, tokenServiceSource } from './sources'

describe('Token sync contracts', () => {
  it('fetches full token keys when the remote token list only returns masked keys', () => {
    expect(tokenServiceSource).toContain('function tokenKeyEndpoint(site: ApiSite, remoteTokenId: string): string')
    expect(tokenServiceSource).toContain('`/api/token/${encodeURIComponent(remoteTokenId)}/key`')
    expect(tokenServiceSource).toContain('async function fetchFullTokenKey')
    expect(tokenServiceSource).toContain("requestWithSite<Record<string, unknown>>(site, 'POST', tokenKeyEndpoint(site, remoteTokenId), undefined, '', cookies)")
    expect(tokenServiceSource).toContain('const data = extractDataObject(response.data)')
    expect(tokenServiceSource).toContain("extractString(data, 'key')")
    expect(tokenServiceSource).toContain('const fullKey = input.remote_token_id ? await fetchFullTokenKey(site, input.remote_token_id, cookies) : null')
    expect(tokenServiceSource).toContain('input.token_key = normalizeTokenKey(fullKey)')
    expect(tokenServiceSource).toContain('errors.push(`令牌 ${input.remote_token_id || input.token_name || \'unknown\'} 缺少完整密钥`)')
    expect(appSource).toContain('本地不是完整密钥，不能复制。')
  })
})
