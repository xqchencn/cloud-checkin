import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const cryptoPath = 'worker/src/services/credential-crypto.ts'
const siteServiceSource = readFileSync('worker/src/services/site-service.ts', 'utf8')
const tokenServiceSource = readFileSync('worker/src/services/token-service.ts', 'utf8')
import { appSource as frontendSource, siteDetailTokenListSource as tokenListSource } from '../sources'
const apiSource = readFileSync('frontend/src/api/apiSite.ts', 'utf8')
const typesSource = readFileSync('worker/src/types.ts', 'utf8')

describe('credential handling contracts', () => {
  it('does not introduce implicit encryption, masks, or saved-secret placeholders', () => {
    expect(existsSync(cryptoPath)).toBe(false)
    for (const source of [siteServiceSource, tokenServiceSource, frontendSource, tokenListSource, apiSource, typesSource]) {
      expect(source).not.toContain('CREDENTIAL_SECRET')
      expect(source).not.toContain('MASKED_SECRET_VALUE')
      expect(source).not.toContain('__CLOUD_CHECKIN_SECRET_MASKED__')
      expect(source).not.toContain('encryptSiteInputForStorage')
      expect(source).not.toContain('decryptSiteForRuntime')
      expect(source).not.toContain('maskSiteForClient')
      expect(source).not.toContain('maskTokenForClient')
    }
  })

  it('keeps token value retrieval explicit and keeps list values usable', () => {
    expect(tokenServiceSource).toContain('async getTokenValue')
    expect(tokenServiceSource).toContain('return { id: tokenId, token_key: token.token_key }')
    expect(apiSource).toContain('export const ApiTokenValue')
    expect(tokenListSource).toContain('ApiTokenValue')
    expect(tokenListSource).toContain('复制完整密钥')
  })

  it('renders only the credential inputs required by the selected auth method', () => {
    expect(frontendSource).toContain("form.auth_method === 'token'")
    expect(frontendSource).toContain('访问 Token')
    expect(frontendSource).toContain("form.auth_method === 'sessions'")
    expect(frontendSource).toContain('Sessions / Cookie')
    expect(frontendSource).toContain("form.auth_method === 'password'")
    expect(frontendSource).toContain('登录用户名')
    expect(frontendSource).toContain('登录密码')
    expect(frontendSource).toContain("auth_value: form.auth_method === 'token' || form.auth_method === 'sessions'")
    expect(frontendSource).toContain("form.api_type === 'AnyRouter' && form.auth_method === 'password'")
  })
})
