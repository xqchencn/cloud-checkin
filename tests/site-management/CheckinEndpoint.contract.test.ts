import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { appSource } from '../sources'
const siteServiceSource = readFileSync('worker/src/services/site-service.ts', 'utf8')
const checkinServiceSource = readFileSync('worker/src/services/checkin-service.ts', 'utf8')
const dbSource = readFileSync('worker/src/db.ts', 'utf8')

/**
 * 签到端点合约测试
 * 验证签到端点配置和验证功能
 */
describe('checkin endpoint contract', () => {
  /**
   * 验证验证和存储一个签到端点字段，使用路径或完整 URL 规则
   * 测试签到端点的验证和存储逻辑
   */
  it('validates and stores one checkin endpoint field with path or full URL rules', () => {
    expect(siteServiceSource).toContain('function normalizeCheckinEndpoint(input: unknown): string')
    expect(siteServiceSource).toContain("parsed.protocol !== 'http:' && parsed.protocol !== 'https:'")
    expect(siteServiceSource).toContain('throw new ApiHttpError(\'VALIDATION_ERROR\', \'签到端点必须为空、HTTP(S) 完整 URL 或以 / 开头的相对路径\')')
    expect(dbSource).toContain('nullable(input.checkin_endpoint)')
    expect(checkinServiceSource).toContain('export function buildCheckinEndpoint(site: ApiSite): string')
    expect(checkinServiceSource).toContain('isFullUrl(custom) ? custom : buildApiEndpoint(site.url, custom)')
    expect(appSource).toContain('签到端点（路径或完整 URL）')
    expect(appSource).toContain('placeholder="留空使用平台默认端点，可填 /api/user/checkin 或 https://example.com/checkin"')
    expect(appSource).not.toContain('external_checkin_url')
  })
})
