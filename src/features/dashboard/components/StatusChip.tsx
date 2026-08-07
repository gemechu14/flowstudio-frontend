import { STATUS_COLORS } from '../lib/dashboardUi'

export function StatusChip({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#888'
  const isCompleted = status === 'completed'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0,
        boxShadow: isCompleted ? `0 0 0 3px ${color}22` : 'none',
      }} />
      <span style={{
        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
        color: isCompleted ? 'var(--text-heading)' : color,
        textTransform: 'capitalize',
      }}>
        {status}
      </span>
    </span>
  )
}
