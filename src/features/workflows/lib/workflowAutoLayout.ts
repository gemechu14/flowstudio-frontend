import type { ExecutionMode, WorkflowEdge, WorkflowNode } from '../api/workflows.api'
import { NODE_W, newId } from './workflowsUi'

export function computeAutoLayout(
  execMode: ExecutionMode,
  nodes: WorkflowNode[],
  nodeHeights: Record<string, number>,
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  if (execMode === 'sequential' || execMode === 'collaborative') {
    const layouted = nodes.map((n, i) => ({ ...n, position_x: 40 + i * 240, position_y: 120 }))
    const newEdges: WorkflowEdge[] = layouted.slice(0, -1).map((n, i) => ({
      edge_id: newId('e'),
      from_node_id: n.node_id,
      to_node_id: layouted[i + 1].node_id,
      label: '', condition_expr: '',
    }))
    return { nodes: layouted, edges: newEdges }
  }

  if (execMode === 'parallel' || execMode === 'hybrid') {
    return {
      nodes: nodes.map((n, i) => ({ ...n, position_x: 40 + i * 240, position_y: 120 })),
      edges: [],
    }
  }

  if (execMode === 'hierarchical') {
    const [orch, ...specs] = nodes
    if (!orch) return { nodes, edges: [] }
    const COL_W = NODE_W + 80
    const orchH = nodeHeights[orch.node_id] || 340
    const totalAgentsW = specs.length > 0 ? (specs.length - 1) * COL_W + NODE_W : NODE_W
    const orchX = 40 + Math.max(0, (totalAgentsW - NODE_W) / 2)
    const agentY = 40 + orchH + 80
    const layouted = [
      { ...orch, node_type: 'orchestrator' as WorkflowNode['node_type'], position_x: orchX, position_y: 40 },
      ...specs.map((s, i) => ({ ...s, position_x: 40 + i * COL_W, position_y: agentY })),
    ]
    return { nodes: layouted, edges: [] }
  }

  if (execMode === 'event_driven') {
    const getSubs = (n: WorkflowNode) => {
      const raw = (n.config.subscribes_to as string) || ''
      return raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : []
    }

    const emitterOf: Record<string, string> = {}
    nodes.forEach(n => {
      const evt = ((n.config.emits_event as string) || '').trim()
      if (evt) emitterOf[evt] = n.node_id
    })

    const depth: Record<string, number> = {}
    nodes.forEach(n => { if (getSubs(n).length === 0) depth[n.node_id] = 0 })
    let changed = true
    while (changed) {
      changed = false
      nodes.forEach(n => {
        const subs = getSubs(n)
        if (!subs.length) return
        const parentDepths = subs.map(e => {
          const pid = emitterOf[e]
          return pid ? (depth[pid] ?? -1) : 0
        })
        if (parentDepths.some(d => d === -1)) return
        const d = Math.max(...parentDepths) + 1
        if (depth[n.node_id] !== d) { depth[n.node_id] = d; changed = true }
      })
    }
    nodes.forEach(n => { if (depth[n.node_id] === undefined) depth[n.node_id] = 0 })

    const cols: Record<number, string[]> = {}
    nodes.forEach(n => {
      const col = depth[n.node_id]
      ;(cols[col] = cols[col] || []).push(n.node_id)
    })

    const COL_W = 320
    const ROW_H = 240
    const START_X = 40, START_Y = 60

    const nMap: Record<string, WorkflowNode> = {}
    nodes.forEach(n => { nMap[n.node_id] = n })

    const colKeys = Object.keys(cols).map(Number).sort((a, b) => a - b)
    const maxRows = Math.max(...colKeys.map(c => cols[c].length), 0)

    const positioned: WorkflowNode[] = []
    colKeys.forEach((col, ci) => {
      const ids = cols[col]
      const topPad = ((maxRows - ids.length) * ROW_H) / 2
      ids.forEach((nid, ri) => {
        positioned.push({
          ...nMap[nid],
          position_x: START_X + ci * COL_W,
          position_y: START_Y + topPad + ri * ROW_H,
        })
      })
    })

    const newEdges: WorkflowEdge[] = []
    nodes.forEach(n => {
      getSubs(n).forEach(evt => {
        const srcId = emitterOf[evt]
        if (srcId && srcId !== n.node_id) {
          newEdges.push({
            edge_id: newId('e'),
            from_node_id: srcId,
            to_node_id: n.node_id,
            label: evt,
            condition_expr: '',
          })
        }
      })
    })
    return { nodes: positioned, edges: newEdges }
  }

  return { nodes, edges: [] }
}
