import { useMemo } from 'react'
import type { ApiSite } from '../../api/apiSite'
import { getCheckinDisplay } from '../../shared/checkin'
import { compareSitesForDefaultDisplay } from '../../shared/format'
import type { SiteFilter, VisibleUrlRow } from '../../shared/types'

export function useVisibleSiteRows({
  sites,
  query,
  filter,
  urlAggregatedView
}: {
  sites: ApiSite[]
  query: string
  filter: SiteFilter
  urlAggregatedView: boolean
}) {
  const visibleSites = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return sites.filter(site => {
      const checkin = getCheckinDisplay(site)
      const matchedKeyword = !keyword || [site.name, site.url, site.api_type].some(value => (value || '').toLowerCase().includes(keyword))
      if (!matchedKeyword) return false
      if (filter === 'enabled') return site.enabled
      if (filter === 'disabled') return !site.enabled
      if (filter === 'signed') return checkin.text === '已签到'
      if (filter === 'unsigned') return checkin.text === '未签到' || checkin.text === '未启用'
      if (filter === 'failed') return checkin.tone === 'danger'
      return true
    }).sort(compareSitesForDefaultDisplay)
  }, [filter, query, sites])

  const visibleUrlGroups = useMemo(() => {
    const groups = new Map<string, ApiSite[]>()
    for (const site of visibleSites) {
      const key = site.url
      groups.set(key, [...(groups.get(key) || []), site])
    }
    return Array.from(groups.entries()).map(([url, groupSites]) => ({
      url,
      totalSites: groupSites.length,
      enabledSites: groupSites.filter(site => site.enabled).length,
      sites: groupSites
    }))
  }, [visibleSites])

  const visibleUrlRows = useMemo<VisibleUrlRow[]>(() => {
    if (!urlAggregatedView) return visibleSites.map(site => ({ type: 'site', key: `site-${site.id}`, site }))
    return visibleUrlGroups.flatMap(group => [
      { type: 'url-group' as const, key: `url-${group.url}`, url: group.url, totalSites: group.totalSites, enabledSites: group.enabledSites },
      ...group.sites.map(site => ({ type: 'site' as const, key: `site-${site.id}`, site }))
    ])
  }, [urlAggregatedView, visibleSites, visibleUrlGroups])

  return { visibleSites, visibleUrlGroups, visibleUrlRows }
}
