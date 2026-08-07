import type { WorkflowEdge, WorkflowNode } from '../api/workflows.api'
import { NODE_H, NODE_W } from './workflowsUi'

export type EdgePath = {
  edge: WorkflowEdge
  path: string
  midX: number
  midY: number
  arrowX: number
  arrowY: number
  tx2: number
  ty2: number
  maxCtrlY: number
}

export const getNodeH = (node: WorkflowNode, nodeHeights: Record<string, number>) =>
  nodeHeights[node.node_id] || NODE_H

export const getPortPos = (
  node: WorkflowNode,
  side: string,
  offset = 0.5,
  nodeHeights: Record<string, number>,
): { x: number; y: number } => {
  const h = getNodeH(node, nodeHeights)
  switch (side) {
    case 'top':    return { x: node.position_x + NODE_W * offset, y: node.position_y }
    case 'bottom': return { x: node.position_x + NODE_W * offset, y: node.position_y + h }
    case 'left':   return { x: node.position_x,        y: node.position_y + h * offset }
    case 'right': default: return { x: node.position_x + NODE_W, y: node.position_y + h * offset }
  }
}

/** Generate evenly-spaced offsets for a given side length */
export const portOffsets = (len: number) => {
  const n = Math.max(2, Math.min(8, Math.floor(len / 60)))
  return Array.from({ length: n }, (_, i) => (i + 1) / (n + 1))
}

/** Outward unit tangent for each port side */
export const sideTangent = (side: string): [number, number] => {
  switch (side) {
    case 'top':    return [0, -1]
    case 'bottom': return [0,  1]
    case 'left':   return [-1, 0]
    case 'right':  default: return [1, 0]
  }
}

/** Choose best exit/entry sides by measuring the angle between node centers */
export const autoSides = (
  from: WorkflowNode,
  to: WorkflowNode,
  nodeHeights: Record<string, number>,
) => {
  const angle = Math.atan2(
    (to.position_y + getNodeH(to, nodeHeights) / 2) - (from.position_y + getNodeH(from, nodeHeights) / 2),
    (to.position_x + NODE_W / 2) - (from.position_x + NODE_W / 2),
  ) * 180 / Math.PI
  if (angle > -45 && angle <= 45)   return { fromSide: 'right',  toSide: 'left'   }
  if (angle > 45  && angle <= 135)  return { fromSide: 'bottom', toSide: 'top'    }
  if (angle < -45 && angle >= -135) return { fromSide: 'top',    toSide: 'bottom' }
  return                                   { fromSide: 'left',   toSide: 'right'  }
}

const EDGE_PULL = 10   // path stops this many px before dest border
export const ARROW_REACH = 18 // invisible arrowhead line extends this far outside border

export function computeEdgePaths(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  nodeHeights: Record<string, number>,
): EdgePath[] {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.node_id, n]))

  const _sideCache: Record<string, { fromSide: string; toSide: string }> = {}
  const _srcGroup: Record<string, string[]> = {}
  const _dstGroup: Record<string, string[]> = {}
  edges.forEach(edge => {
    if (edge.from_side) return
    const from = nodeMap[edge.from_node_id], to = nodeMap[edge.to_node_id]
    if (!from || !to) return
    const sides = autoSides(from, to, nodeHeights)
    _sideCache[edge.edge_id] = sides
    const sk = `${edge.from_node_id}|${sides.fromSide}`
    const dk = `${edge.to_node_id}|${sides.toSide}`;
    (_srcGroup[sk] = _srcGroup[sk] || []).push(edge.edge_id);
    (_dstGroup[dk] = _dstGroup[dk] || []).push(edge.edge_id)
  })
  const _autoFromOff: Record<string, number> = {}
  const _autoToOff:   Record<string, number> = {}
  Object.values(_srcGroup).forEach(ids => ids.forEach((id, i) => { _autoFromOff[id] = (i + 1) / (ids.length + 1) }))
  Object.values(_dstGroup).forEach(ids => ids.forEach((id, i) => { _autoToOff[id]   = (i + 1) / (ids.length + 1) }))

  return edges.map(edge => {
    const from = nodeMap[edge.from_node_id], to = nodeMap[edge.to_node_id]
    if (!from || !to) return null

    let fromSide: string, toSide: string, x1: number, y1: number, x2: number, y2: number

    if (edge.from_side && edge.to_side) {
      fromSide = edge.from_side; toSide = edge.to_side
      const p1 = getPortPos(from, fromSide, edge.from_offset ?? 0.5, nodeHeights)
      const p2 = getPortPos(to,   toSide,   edge.to_offset   ?? 0.5, nodeHeights)
      x1 = p1.x; y1 = p1.y; x2 = p2.x; y2 = p2.y
    } else {
      const s = _sideCache[edge.edge_id] || autoSides(from, to, nodeHeights)
      fromSide = s.fromSide; toSide = s.toSide
      const p1 = getPortPos(from, fromSide, _autoFromOff[edge.edge_id] ?? 0.5, nodeHeights)
      const p2 = getPortPos(to,   toSide,   _autoToOff[edge.edge_id]   ?? 0.5, nodeHeights)
      x1 = p1.x; y1 = p1.y; x2 = p2.x; y2 = p2.y
    }

    const [tx1, ty1] = sideTangent(fromSide)
    const [tx2, ty2] = sideTangent(toSide)
    const dist = Math.hypot(x2 - x1, y2 - y1)

    const dot = tx1 * (x2 - x1) + ty1 * (y2 - y1)
    const cp = dot < 0
      ? Math.max(80, dist * 0.6 + 50)
      : Math.max(60, dist * 0.45)

    const MIN_Y = 20
    const cx1 = x1 + tx1 * cp
    const cy1 = Math.max(MIN_Y, y1 + ty1 * cp)
    const cx2 = x2 + tx2 * cp
    const cy2 = Math.max(MIN_Y, y2 + ty2 * cp)

    const px2 = x2 + tx2 * EDGE_PULL, py2 = y2 + ty2 * EDGE_PULL

    const path = `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${px2} ${py2}`

    const midX = (x1 + 3*cx1 + 3*cx2 + px2) / 8
    const midY = (y1 + 3*cy1 + 3*cy2 + py2) / 8

    const maxCtrlY = Math.max(y1, cy1, cy2, py2)
    return { edge, path, midX, midY, arrowX: x2, arrowY: y2, tx2, ty2, maxCtrlY }
  }).filter(Boolean) as EdgePath[]
}

export function computeCanvasSize(
  nodes: WorkflowNode[],
  edgePaths: EdgePath[],
  nodeHeights: Record<string, number>,
) {
  const canvasW = Math.max(900, ...nodes.map(n => n.position_x + NODE_W + 80), 900)
  const edgeMaxY = edgePaths.length > 0 ? Math.max(...edgePaths.map(ep => ep.maxCtrlY)) : 0
  const canvasH = Math.max(
    600,
    ...nodes.map(n => n.position_y + getNodeH(n, nodeHeights) + 100),
    edgeMaxY + 80,
    600,
  )
  return { canvasW, canvasH }
}
