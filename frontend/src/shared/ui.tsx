import type { ReactNode } from 'react'
import { Cloud, X } from 'lucide-react'
import type { ApiSite } from '../api/apiSite'

export type BadgeTone = 'success' | 'warning' | 'danger' | 'muted' | 'info'

export function StatusBadge({ enabled, children }: { enabled: boolean; children: string }) {
  return <span className={`badge ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{children}</span>
}

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

export function ButtonIcon({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">{children}</span>
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-soft ${compact ? 'h-10 w-10' : 'h-12 w-12'}`}>
      <Cloud size={compact ? 22 : 26} />
    </span>
  )
}

export function ModalShell({ children }: { children: ReactNode }) {
  return <div className="modal-shell">{children}</div>
}

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
  size?: 'md' | 'lg' | 'xl'
}) {
  const maxWidth = {
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
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

export function SiteAvatar({ site }: { site: ApiSite }) {
  return (
    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
      {(site.name || site.url || '?').slice(0, 1).toUpperCase()}
    </div>
  )
}

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
