import type { ExecutionMode, NodeStatus } from '../api/workflows.api'

export const NODE_W = 200
export const NODE_H = 80
export const MONO = { fontFamily: 'var(--font-mono)' } as const
export const SANS = { fontFamily: 'var(--font-sans)' } as const

export const MODE_LABELS: Record<ExecutionMode, string> = {
  sequential: 'Sequential — Pipeline',
  parallel: 'Parallel — Fan-out',
  hierarchical: 'Hierarchical — Orchestrator',
  hybrid: 'Hybrid — DAG + Orchestrator',
  collaborative: 'Collaborative — Review Loop',
  event_driven: 'Event-Driven — Pub/Sub',
}


export const NODE_TYPE_COLORS: Record<string, string> = {
  agent: '#1D5FFA',
  orchestrator: '#7C3AED',
  fan_out: '#F59E0B',
  fan_in: '#10B981',
  condition: '#EF4444',
  loop: '#06B6D4',
  switch: '#F97316',
  subworkflow: '#7C3AED',
  collaborative_node: '#EC4899',
}

export const STATUS_COLORS: Record<NodeStatus, string> = {
  pending: '#6B7280',
  running: '#3B82F6',
  completed: '#10B981',
  failed: '#EF4444',
  skipped: '#9CA3AF',
}

export const STATUS_ICONS: Record<NodeStatus, string> = {
  pending: '○', running: '◌', completed: '✓', failed: '✗', skipped: '–',
}

export const TEAL = '#14b8a6'

let _idCounter = 0
export const newId = (prefix = 'n') => `${prefix}_${++_idCounter}_${Math.random().toString(36).slice(2, 6)}`

export const fmt = (iso: string | null | undefined) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return '—' }
}

export const relativeTime = (iso: string | null | undefined) => {
  if (!iso) return ''
  try {
    const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
    if (sec < 60) return `${sec}s ago`
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min}m ago`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}h ago`
    const day = Math.floor(hr / 24)
    if (day < 30) return `${day}d ago`
    return fmt(iso)
  } catch { return '' }
}

export const elapsed = (start: string | null, end: string | null): string => {
  if (!start || !end) return ''
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  const totalSec = Math.floor(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  const remM = m % 60
  return remM > 0 ? `${h}h ${remM}m` : `${h}h`
}

export const formatTokens = (n: number) => n.toLocaleString('en-US')

export const modeShort = (mode: string) => (mode || '').replace(/_/g, ' ')

export const elapsedSec = (start: string | null, end: string | null): string => {
  if (!start || !end) return '—'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 0) return '—'
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  return elapsed(start, end)
}
