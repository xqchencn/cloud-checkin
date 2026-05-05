import type { ReactNode } from 'react'
import { Activity, CheckCircle2, Clock3, Pause, Server } from 'lucide-react'
import type { HfSpaceTarget } from '../../api/apiHfSpaces'

export function HfSpacesSummaryCards({ targets }: { targets: HfSpaceTarget[] }) {
  const logs = targets.flatMap(target => target.logs || [])
  const today = new Date().toDateString()
  const todayRequests = logs.filter(log => new Date(log.created_at).toDateString() === today).length
  const successLogs = logs.filter(log => log.status === 'success').length
  const latencyLogs = logs.filter(log => log.latency_ms != null)
  const averageLatency = latencyLogs.length
    ? latencyLogs.reduce((sum, log) => sum + Number(log.latency_ms || 0), 0) / latencyLogs.length / 1000
    : 0
  const successRate = logs.length ? (successLogs / logs.length) * 100 : 0

  const cards = [
    { label: '总 Spaces', value: String(targets.length), caption: `运行中 ${targets.filter(target => target.enabled).length}`, icon: <Server size={20} />, tone: 'blue' },
    { label: '运行中', value: String(targets.filter(target => target.enabled).length), caption: `健康率 ${successRate.toFixed(1)}%`, icon: <CheckCircle2 size={20} />, tone: 'green' },
    { label: '已暂停', value: String(targets.filter(target => !target.enabled).length), caption: '手动停用', icon: <Pause size={20} />, tone: 'red' },
    { label: '今日请求', value: todayRequests.toLocaleString('zh-CN'), caption: `成功率 ${successRate.toFixed(1)}%`, icon: <Clock3 size={20} />, tone: 'purple' },
    { label: '平均响应时间', value: `${averageLatency.toFixed(1)}s`, caption: latencyLogs.length ? `${latencyLogs.length} 次采样` : '暂无采样', icon: <Activity size={20} />, tone: 'sky' }
  ] as const

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map(card => <SummaryCard key={card.label} {...card} />)}
    </div>
  )
}

function SummaryCard({ label, value, caption, icon, tone }: {
  label: string
  value: string
  caption: string
  icon: ReactNode
  tone: 'blue' | 'green' | 'red' | 'purple' | 'sky'
}) {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-violet-50 text-violet-600',
    sky: 'bg-sky-50 text-sky-600'
  }[tone]

  return (
    <article className="rounded-lg border border-line bg-white p-3 shadow-panel sm:p-4">
      <div className="flex items-start gap-3">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${toneClass}`}>{icon}</span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-bold leading-tight text-slate-950 sm:text-2xl">{value}</p>
        </div>
      </div>
      <p className="mt-3 truncate text-xs font-medium text-slate-500 sm:mt-4">{caption}</p>
    </article>
  )
}
