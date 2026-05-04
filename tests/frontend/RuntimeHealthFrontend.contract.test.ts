import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync('frontend/src/App.tsx', 'utf8')

describe('runtime health frontend correction contract', () => {
  it('does not render a separate runtime health card or actions', () => {
    expect(appSource).not.toContain('formatRuntimeHealthState')
    expect(appSource).not.toContain('runtimeHealthTone')
    expect(appSource).not.toContain('site.runtime_health_state')
    expect(appSource).not.toContain('刷新健康')
    expect(appSource).not.toContain('验证鉴权')
  })
})
