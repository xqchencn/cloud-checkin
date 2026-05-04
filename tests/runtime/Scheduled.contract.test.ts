import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { localScheduledDevSource, packageSource, readmeSource, viteConfigSource } from '../sources'

describe('Local scheduled task contracts', () => {
  it('runs local scheduled triggers automatically from npm run dev', () => {
    expect(existsSync('scripts/local-scheduled-dev.mjs')).toBe(true)
    expect(packageSource).toContain('"dev": "node scripts/local-scheduled-dev.mjs"')
    expect(localScheduledDevSource).toContain('runDueScheduledTriggers(baseUrl, crons, lastTriggered)')
    expect(localScheduledDevSource).toContain('scheduled trigger sent')
    expect(localScheduledDevSource).toContain('local scheduled simulator ready')
    expect(localScheduledDevSource).toContain('FETCH_TIMEOUT_MS')
    expect(localScheduledDevSource).toContain('SERVER_READY_TIMEOUT_MS')
    expect(readmeSource).toContain('本地 dev 会按 `wrangler.toml` 自动模拟 scheduled 事件')
    expect(readmeSource).not.toContain('本地不会按 `wrangler.toml` 的时间自动触发 Cron')
  })

  it('keeps local frontend and worker ports reachable on Windows loopback', () => {
    expect(viteConfigSource).toContain("host: '127.0.0.1'")
    expect(viteConfigSource).toContain("'http://127.0.0.1:8787'")
  })
})
