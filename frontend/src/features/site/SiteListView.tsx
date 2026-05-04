import { CalendarCheck, CircleCheck, CircleX, Edit3, Eye, Globe2, Trash2, Wallet } from 'lucide-react'
import type { ApiSite, TodayCheckinStats } from '../../api/apiSite'
import type { VisibleUrlRow } from '../../shared/types'
import { getCheckinDisplay } from '../../shared/checkin'
import { formatDate, formatMoney } from '../../shared/format'
import { SiteAvatar, StatusBadge, ToneBadge } from '../../shared/ui'
import { SiteMobileCard, StatCard } from './SiteCards'

/**
 * 站点列表视图组件
 * @param sites - 站点列表
 * @param stats - 今日签到统计
 * @param enabledCount - 启用站点数量
 * @param totalBalance - 总余额
 * @param usedBalance - 已用余额
 * @param visibleSites - 可见站点列表
 * @param visibleUrlRows - 可见 URL 行数据
 * @param emptyText - 空状态文本
 * @param onDetail - 查看详情回调
 * @param onEdit - 编辑站点回调
 * @param onDelete - 删除站点回调
 */
export function SiteListView({
  sites,
  stats,
  enabledCount,
  totalBalance,
  usedBalance,
  visibleSites,
  visibleUrlRows,
  emptyText,
  onDetail,
  onEdit,
  onDelete
}: {
  sites: ApiSite[]
  stats: TodayCheckinStats | null
  enabledCount: number
  totalBalance: number
  usedBalance: number
  visibleSites: ApiSite[]
  visibleUrlRows: VisibleUrlRow[]
  emptyText: string
  onDetail: (site: ApiSite) => void
  onEdit: (site: ApiSite) => void
  onDelete: (site: ApiSite) => void
}) {
  return (
    <>
      <section className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="总站点" value={sites.length} hint="个站点" tone="blue" icon={<Globe2 size={30} />} />
        <StatCard label="已启用" value={enabledCount} hint={`${sites.length ? Math.round((enabledCount / sites.length) * 100) : 0}% 启用率`} tone="green" hintTone="success" icon={<CircleCheck size={30} />} />
        <StatCard label="今日已签到" value={stats?.success_count || 0} hint={`${stats?.checkin_enabled_count || 0} 个可签到`} tone="purple" hintTone="accent" icon={<CalendarCheck size={30} />} />
        <StatCard label="总余额" value={formatMoney(totalBalance)} hint={`已用 ${formatMoney(usedBalance)}`} tone="orange" icon={<Wallet size={30} />} />
        <StatCard label="失败" value={stats?.failed_count || 0} hint="失败记录" tone="red" icon={<CircleX size={30} />} />
      </section>

      <section className="mt-5 grid gap-3 md:hidden">
        {visibleUrlRows.map(row => {
          if (row.type === 'url-group') {
            return (
              <div key={row.key} className="rounded-lg border border-line bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">{row.url}</div>
                <div className="mt-1 text-xs text-slate-500">账号 {row.totalSites} 个，启用 {row.enabledSites} 个</div>
              </div>
            )
          }
          return (
            <SiteMobileCard
              key={row.key}
              site={row.site}
              onDetail={() => onDetail(row.site)}
              onEdit={() => onEdit(row.site)}
              onDelete={() => onDelete(row.site)}
            />
          )
        })}
        {!visibleSites.length ? (
          <div className="soft-card px-4 py-10 text-center text-sm text-slate-500">{emptyText}</div>
        ) : null}
      </section>

      <section className="mt-6 hidden rounded-lg border border-line bg-white shadow-panel md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed text-sm">
            <thead className="border-b border-line bg-white text-left text-xs text-slate-500">
              <tr>
                <th className="w-[260px] px-5 py-4 font-medium">站点信息</th>
                <th className="w-[90px] px-3 py-4 font-medium">类型</th>
                <th className="w-[82px] px-3 py-4 font-medium">状态</th>
                <th className="w-[150px] px-3 py-4 font-medium">签到状态</th>
                <th className="w-[130px] px-3 py-4 font-medium">余额</th>
                <th className="w-[150px] px-3 py-4 font-medium">最后签到时间</th>
                <th className="w-[116px] px-3 py-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visibleUrlRows.map(row => row.type === 'url-group'
                ? <SiteUrlGroupRow key={row.key} row={row} />
                : <SiteTableRow key={row.key} site={row.site} onDetail={onDetail} onEdit={onEdit} onDelete={onDelete} />
              )}
              {!visibleSites.length ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-500" colSpan={7}>{emptyText}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

/**
 * URL 分组行组件
 * @param row - URL 分组行数据
 */
function SiteUrlGroupRow({ row }: { row: Extract<VisibleUrlRow, { type: 'url-group' }> }) {
  return (
    <tr className="bg-slate-50/80">
      <td className="px-5 py-3 text-sm font-semibold text-slate-700" colSpan={7}>
        {row.url} <span className="ml-2 text-xs font-normal text-slate-500">账号 {row.totalSites} 个，启用 {row.enabledSites} 个</span>
      </td>
    </tr>
  )
}

/**
 * 站点表格行组件
 * @param site - 站点对象
 * @param onDetail - 查看详情回调
 * @param onEdit - 编辑站点回调
 * @param onDelete - 删除站点回调
 */
function SiteTableRow({ site, onDetail, onEdit, onDelete }: {
  site: ApiSite
  onDetail: (site: ApiSite) => void
  onEdit: (site: ApiSite) => void
  onDelete: (site: ApiSite) => void
}) {
  const checkin = getCheckinDisplay(site)
  return (
    <tr className="align-middle transition hover:bg-slate-50/70">
      <td className="px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <SiteAvatar site={site} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950">{site.name}</p>
            <p className="mt-1 truncate text-sm text-slate-500">{site.url}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-4 text-slate-600">{site.api_type}</td>
      <td className="px-3 py-4"><StatusBadge enabled={site.enabled}>{site.enabled ? '启用' : '未启用'}</StatusBadge></td>
      <td className="px-3 py-4">
        <div className="space-y-1">
          <ToneBadge tone={checkin.tone}>{checkin.text}</ToneBadge>
          <p className="line-clamp-2 text-xs text-slate-500">{checkin.hint}</p>
        </div>
      </td>
      <td className="px-3 py-4">
        <div className="font-semibold text-slate-950">{formatMoney(site.site_quota)}</div>
        <div className="mt-1 text-xs text-slate-500">已用 {formatMoney(site.site_used_quota)}</div>
      </td>
      <td className="px-3 py-4 text-slate-500">{formatDate(site.last_checkin)}</td>
      <td className="px-3 py-4">
        <div className="flex justify-end gap-1">
          <button className="btn-icon" onClick={() => onDetail(site)} aria-label="详情" title="详情"><Eye size={16} /></button>
          <button className="btn-icon" onClick={() => onEdit(site)} aria-label="编辑" title="编辑"><Edit3 size={16} /></button>
          <button className="btn-icon btn-danger" onClick={() => onDelete(site)} aria-label="删除" title="删除"><Trash2 size={16} /></button>
        </div>
      </td>
    </tr>
  )
}
