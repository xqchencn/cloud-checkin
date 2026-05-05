export function formatRuntimeStage(stage: string | null): string {
  if (stage === 'RUNNING') return '运行中'
  if (stage === 'PAUSED') return '已暂停'
  if (stage === 'BUILDING') return '构建中'
  if (stage === 'SLEEPING') return '休眠中'
  if (stage === 'STARTING') return '启动中'
  if (stage === 'STOPPED') return '已停止'
  return stage || '-'
}

export function runtimeStageTone(stage: string | null): 'success' | 'warning' | 'danger' | 'muted' {
  if (stage === 'RUNNING') return 'success'
  if (!stage) return 'muted'
  if (['PAUSED', 'BUILDING', 'SLEEPING', 'STARTING'].includes(stage)) return 'warning'
  return 'danger'
}

export function formatDomainStage(stage: string | null): string {
  if (stage === 'READY') return '可访问'
  return stage || '-'
}
