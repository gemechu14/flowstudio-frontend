import type { ExecutionMode, NodeRunResult, WorkflowNode, WorkflowRun } from '../api/workflows.api'

export function computeFiredEvents(
  active: WorkflowRun | null | undefined,
  execMode: ExecutionMode,
  nodes: WorkflowNode[],
): Set<string> {
  if (!active || execMode !== 'event_driven') return new Set()
  const fired = new Set<string>()
  active.node_results.forEach(nr => {
    if (nr.status === 'completed') {
      const node = nodes.find(n => n.node_id === nr.node_id)
      const evt = (node?.config?.emits_event as string | undefined) || ''
      if (evt) fired.add(evt)
    }
  })
  return fired
}

export function buildNodeResultMap(activeRun: WorkflowRun | null | undefined): Record<string, NodeRunResult> {
  const nodeResultMap: Record<string, NodeRunResult> = {}
  if (!activeRun) return nodeResultMap
  activeRun.node_results.forEach(nr => {
    const existing = nodeResultMap[nr.node_id]
    if (!existing || (nr.started_at ?? '') > (existing.started_at ?? '')) {
      nodeResultMap[nr.node_id] = nr
    }
  })
  return nodeResultMap
}

export const ALL_MODES: ExecutionMode[] = [
  'sequential', 'parallel', 'hierarchical', 'hybrid', 'collaborative', 'event_driven',
]

export const MODE_ICONS: Record<ExecutionMode, string> = {
  sequential: '→',
  parallel: '⇉',
  hierarchical: '⟐',
  hybrid: '⊕',
  collaborative: '↻',
  event_driven: '⚡',
}
