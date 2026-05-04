import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const tokenServiceSource = readFileSync('worker/src/services/token-service.ts', 'utf8')
const siteServiceSource = readFileSync('worker/src/services/site-service.ts', 'utf8')
const tokenListSource = readFileSync('frontend/src/components/site-detail/TokenList.tsx', 'utf8')
const apiSiteSource = readFileSync('frontend/src/api/apiSite.ts', 'utf8')

/**
 * 令牌生命周期合约测试
 * 验证令牌生命周期功能的一致性和正确性
 */
describe('token lifecycle contracts', () => {
  const defaultColumnName = ['is', 'default'].join('_')
  const forbiddenDefaultLabel = ['默认', ' Token'].join('')
  const defaultActionText = ['设', '为', '默认'].join('')

  /**
   * 验证明确标记远程和导入的令牌值状态
   * 测试令牌状态标记逻辑
   */
  it('marks remote and imported token value status explicitly', () => {
    expect(tokenServiceSource).toContain("value_status: masked && !existingFullKey ? 'masked_pending' : 'ready'")
    expect(tokenServiceSource).toContain("source: 'remote'")
    expect(tokenServiceSource).not.toContain(defaultColumnName)
    expect(siteServiceSource).toContain("value_status: 'ready'")
    expect(siteServiceSource).toContain("source: 'import'")
  })

  /**
   * 验证在前端暴露和渲染令牌生命周期元数据
   * 测试前端令牌生命周期显示
   */
  it('exposes and renders token lifecycle metadata on the frontend', () => {
    expect(apiSiteSource).toContain("value_status: 'ready' | 'masked_pending' | 'missing'")
    expect(apiSiteSource).not.toContain(defaultColumnName)
    expect(apiSiteSource).not.toContain('ApiSiteSetDefaultToken')
    expect(apiSiteSource).toContain('source: string')
    expect(tokenListSource).toContain('formatTokenValueStatus')
    expect(tokenListSource).toContain('token.value_status')
    expect(tokenListSource).toContain('token.source')
    expect(tokenListSource).not.toContain(forbiddenDefaultLabel)
    expect(tokenListSource).not.toContain(defaultActionText)
  })
})
