import { SANS } from '../lib/workflowsUi'

export function StatusPill({ status }: { status: string }) {
  const meta =
    status === 'completed' ? { color: 'var(--accent-text)', bg: 'transparent', icon: '✓', label: 'COMPLETED', bare: true }
    : status === 'running' ? { color: 'var(--accent-text)', bg: 'var(--accent-soft)', icon: '◌', label: 'RUNNING', bare: false }
    : status === 'awaiting_checkpoint' || status === 'pending' ? {
        color: status === 'pending' ? 'var(--text-tertiary)' : '#7C3AED',
        bg: status === 'pending' ? 'var(--bg-hover)' : 'rgba(124, 58, 237, 0.12)',
        icon: status === 'pending' ? '○' : '⏸',
        label: status === 'pending' ? 'PENDING' : 'CHECKPOINT',
        bare: false,
      }
    : status === 'skipped' ? { color: 'var(--text-tertiary)', bg: 'var(--bg-hover)', icon: '–', label: 'SKIPPED', bare: false }
    : { color: 'var(--invalid)', bg: 'var(--invalid-dim)', icon: '✗', label: 'FAILED', bare: false }

  return (
    <span style={{
      ...SANS, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
      padding: meta.bare ? 0 : '3px 8px', borderRadius: meta.bare ? 0 : 999,
      background: meta.bg, color: meta.color,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      animation: status === 'running' ? 'pulse 1s infinite' : undefined,
      whiteSpace: 'nowrap',
    }}>
      <span aria-hidden>{meta.icon}</span>
      {meta.label}
    </span>
  )
}
