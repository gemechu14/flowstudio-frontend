import type { WorkflowEdge, WorkflowNode, WorkflowRecord } from '../api/workflows.api'
import { newId } from './workflowsUi'

export function hydrateWorkflowGraph(wf: WorkflowRecord): {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
} {
  if (wf.nodes && wf.nodes.length > 0) {
    return { nodes: wf.nodes, edges: wf.edges || [] }
  }

  const synth: WorkflowNode[] = (wf.steps || []).map((s, i) => ({
    node_id: s.step_id,
    node_type: 'agent',
    label: s.label || '',
    agent_id: s.agent_id,
    position_x: 40 + i * 240,
    position_y: 120,
    config: {},
  }))

  const synthEdges: WorkflowEdge[] = synth.slice(0, -1).map((n, i) => ({
    edge_id: newId('e'),
    from_node_id: n.node_id,
    to_node_id: synth[i + 1].node_id,
    label: '',
    condition_expr: '',
  }))

  return { nodes: synth, edges: synthEdges }
}
