import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { appSource } from '../sources'
const apiSource = readFileSync('frontend/src/api/apiSite.ts', 'utf8')
const typesSource = readFileSync('worker/src/types.ts', 'utf8')
const dbSource = readFileSync('worker/src/db.ts', 'utf8')
const siteRepositorySource = readFileSync('worker/src/repositories/site-repository.ts', 'utf8')
const siteServiceSource = readFileSync('worker/src/services/site-service.ts', 'utf8')

describe('site sort and credential UI contracts', () => {
  it('uses sort_order as a site field and default display sort before balance with disabled sites last', () => {
    expect(typesSource).toContain('sort_order: number')
    expect(apiSource).toContain('sort_order: number')
    expect(dbSource).toContain('sort_order: Number(row.sort_order ?? 0)')
    expect(siteRepositorySource).toContain('ORDER BY enabled DESC, sort_order ASC, site_quota DESC, id ASC')
    expect(appSource).toContain('function compareSitesForDefaultDisplay')
    expect(appSource).toContain('if (left.enabled !== right.enabled) return left.enabled ? -1 : 1')
    expect(appSource).toContain('const sortOrderDiff = left.sort_order - right.sort_order')
    expect(appSource).toContain('const balanceDiff = Number(right.site_quota || 0) - Number(left.site_quota || 0)')
    expect(appSource).toContain('排序')
    expect(appSource).toContain("type SiteFormState = Omit<SiteFormPayload, 'sort_order'> & { sort_order: string }")
    expect(appSource).toContain('function normalizeFormSortOrder(input: string): number')
    expect(appSource).toContain("sort_order: String(site.sort_order ?? 0)")
    expect(appSource).toContain('value={form.sort_order}')
    expect(appSource).toContain('sort_order: normalizeFormSortOrder(form.sort_order)')
    expect(appSource).toContain('onChange={event => setForm({ ...form, sort_order: event.target.value })}')
  })

  it('does not expose or persist an explicit same-site group key', () => {
    for (const source of [appSource, apiSource, typesSource, dbSource, siteRepositorySource, siteServiceSource]) {
      expect(source).not.toContain('site_group_key')
    }
    expect(appSource).toContain('const key = site.url')
    expect(siteServiceSource).toContain('const groupKey = site.url')
  })

  it('lets the site login password field toggle visibility', () => {
    expect(appSource).toContain('showLoginPassword')
    expect(appSource).toContain('setShowLoginPassword')
    expect(appSource).toContain("type={showLoginPassword ? 'text' : 'password'}")
    expect(appSource).toContain('aria-label={showLoginPassword ? \'隐藏登录密码\' : \'显示登录密码\'}')
  })
})
