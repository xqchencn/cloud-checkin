import type { ReactNode } from 'react'
import { Cloud, X } from 'lucide-react'
import type { ApiSite } from '../api/apiSite'

/**
 * 徽章颜色主题类型
 */
export type BadgeTone = 'success' | 'warning' | 'danger' | 'muted' | 'info'

/**
 * 状态徽章组件
 * @param enabled - 是否启用
 * @param children - 子元素
 */
export function StatusBadge({ enabled, children }: { enabled: boolean; children: string }) {
  return <span className={`badge ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{children}</span>
}

/**
 * 颜色主题徽章组件
 * @param tone - 颜色主题
 * @param children - 子元素
 */
export function ToneBadge({ tone, children }: { tone: BadgeTone; children: string }) {
  const classes: Record<BadgeTone, string> = {
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    muted: 'bg-slate-100 text-slate-500',
    info: 'bg-sky-50 text-sky-700'
  }
  return <span className={`badge ${classes[tone]}`}>{children}</span>
}

/**
 * 按钮图标组件
 * @param children - 子元素
 */
export function ButtonIcon({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">{children}</span>
}

const AVATAR_TONE_CLASSES = [
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-fuchsia-500 to-pink-600',
  'from-violet-500 to-indigo-600',
  'from-rose-500 to-red-600',
  'from-sky-500 to-blue-700',
  'from-lime-500 to-green-600'
]

export function getAvatarToneClasses(seed: string) {
  const source = seed.trim().toUpperCase() || '?'
  const code = source.charCodeAt(0) || 0
  return AVATAR_TONE_CLASSES[code % AVATAR_TONE_CLASSES.length]
}

export function buildAvatarLabel(seed: string): string {
  const source = seed.trim()
  if (!source) return '?'
  const normalized = source.replace(/^https?:\/\//i, '').replace(/^www\./i, '').trim()
  const first = normalized[0] || source[0] || '?'
  if (/[\u3400-\u9fff]/.test(first)) return first
  return normalized.replace(/\s+/g, '').slice(0, 2).toUpperCase() || '?'
}

export function LetterAvatar({ seed, label, className = 'h-11 w-11 text-sm font-semibold' }: {
  seed: string
  label: string
  className?: string
}) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-soft ${getAvatarToneClasses(seed)} ${className}`}>
      {label}
    </span>
  )
}

/**
 * 品牌标识组件
 * @param compact - 是否紧凑模式
 */
export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-soft ${compact ? 'h-10 w-10' : 'h-12 w-12'}`}>
      <Cloud size={compact ? 22 : 26} />
    </span>
  )
}

/**
 * 模态框外壳组件
 * @param children - 子元素
 */
export function ModalShell({ children }: { children: ReactNode }) {
  return <div className="modal-shell">{children}</div>
}

/**
 * 对话框卡片组件
 * @param title - 标题
 * @param description - 描述
 * @param icon - 图标
 * @param onClose - 关闭回调
 * @param children - 子元素
 * @param footer - 页脚
 * @param size - 大小
 */
export function DialogCard({
  title,
  description,
  icon,
  onClose,
  children,
  footer,
  size = 'md'
}: {
  title: string
  description: string
  icon?: ReactNode
  onClose: () => void
  children: ReactNode
  footer: ReactNode
  size?: 'md' | 'lg' | 'xl' | 'wide'
}) {
  const maxWidth = {
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    wide: 'max-w-6xl'
  }[size]

  return (
    <section className={`modal-panel ${maxWidth}`}>
      <div className="modal-header">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">{icon}</span> : null}
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <button type="button" className="btn-icon" onClick={onClose} aria-label="关闭"><X size={16} /></button>
      </div>
      <div className="modal-body">{children}</div>
      <div className="modal-footer">{footer}</div>
    </section>
  )
}

/**
 * 站点头像组件
 * @param site - 站点对象
 */
export function SiteAvatar({ site }: { site: ApiSite }) {
  return (
    <LetterAvatar seed={site.name || site.url || '?'} label={buildAvatarLabel(site.name || site.url || '?')} />
  )
}

/**
 * 详情网格组件
 * @param items - 详情项数组
 */
export function DetailGrid({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-3">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-lg border border-line bg-slate-50/80 px-3 py-2">
          <dt className="text-xs font-medium text-slate-500">{label}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-slate-800">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
