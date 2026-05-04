import { formatStructuredMessage, getLogMessageRaw, parseJsonMessage } from './format'

export function JsonMessagePreview({ message, error }: {
  message?: string | null
  error?: string | null
}) {
  const raw = getLogMessageRaw(message, error)
  if (!raw) return <span>-</span>
  const parsed = parseJsonMessage(raw)
  const preview = formatStructuredMessage(raw)
  if (parsed === null) {
    return <span className="block max-w-full truncate" title={raw}>{preview}</span>
  }
  return (
    <details className="group min-w-0 max-w-full">
      <summary className="flex min-w-0 cursor-pointer list-none items-center gap-1 overflow-hidden leading-5 text-slate-700">
        <span className="block min-w-0 flex-1 truncate" title={preview}>{preview}</span>
        <span className="inline-flex h-4 shrink-0 items-center rounded border border-line bg-slate-50 px-1 text-[10px] font-semibold leading-none text-slate-500 group-open:bg-brandSoft group-open:text-brand">JSON</span>
      </summary>
      <pre className="mt-2 max-h-64 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md border border-line bg-slate-950 p-3 text-xs leading-relaxed text-slate-100">{JSON.stringify(parsed, null, 2)}</pre>
    </details>
  )
}
