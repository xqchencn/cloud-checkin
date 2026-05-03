import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react'

type ToastTone = 'success' | 'error' | 'info'

type ToastItem = {
  id: number
  tone: ToastTone
  text: string
}

type ToastOptions = {
  durationMs?: number
}

type ToastApi = {
  success: (text: string, options?: ToastOptions) => void
  error: (text: string, options?: ToastOptions) => void
  info: (text: string, options?: ToastOptions) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const toneClasses: Record<ToastTone, string> = {
  success: 'border-emerald-100 bg-emerald-50 text-emerald-800',
  error: 'border-red-100 bg-red-50 text-red-800',
  info: 'border-blue-100 bg-blue-50 text-blue-800'
}

const iconClasses: Record<ToastTone, string> = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  info: 'text-blue-600'
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'success') return <CheckCircle2 className={iconClasses[tone]} size={18} />
  if (tone === 'error') return <AlertTriangle className={iconClasses[tone]} size={18} />
  return <Info className={iconClasses[tone]} size={18} />
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const remove = useCallback((id: number) => {
    setItems(current => current.filter(item => item.id !== id))
  }, [])

  const push = useCallback((tone: ToastTone, text: string, options: ToastOptions = {}) => {
    const id = nextId.current++
    const item = { id, tone, text }
    setItems(current => [item, ...current].slice(0, 4))
    window.setTimeout(() => remove(id), options.durationMs ?? (tone === 'error' ? 6000 : 3500))
  }, [remove])

  const api = useMemo<ToastApi>(() => ({
    success: (text, options) => push('success', text, options),
    error: (text, options) => push('error', text, options),
    info: (text, options) => push('info', text, options)
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed right-4 top-4 z-[80] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {items.map(item => (
          <div
            key={item.id}
            className={`flex min-w-0 items-start gap-3 rounded-lg border px-3 py-3 text-sm shadow-panel ${toneClasses[item.tone]}`}
            role="status"
          >
            <span className="mt-0.5 shrink-0"><ToastIcon tone={item.tone} /></span>
            <p className="min-w-0 flex-1 whitespace-pre-wrap break-words leading-5">{item.text}</p>
            <button
              type="button"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-current opacity-70 transition hover:bg-white/70 hover:opacity-100"
              onClick={() => remove(item.id)}
              aria-label="关闭提示"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
