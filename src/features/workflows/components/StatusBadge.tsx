import type { NodeStatus } from '../api/workflows.api'
import { MONO, STATUS_COLORS, STATUS_ICONS } from '../lib/workflowsUi'

export function StatusBadge({ status }: { status: NodeStatus }) {
  const color = STATUS_COLORS[status]
  return (
    <span style={{
      ...MONO, fontSize: 10, padding: '1px 6px', borderRadius: 3,
      background: `${color}20`, color,
      border: `1px solid ${color}40`, fontWeight: 700,
      animation: status === 'running' ? 'pulse 1s infinite' : undefined,
    }}>
      {STATUS_ICONS[status]} {status}
    </span>
  )
}
