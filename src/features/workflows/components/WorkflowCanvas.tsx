import { CanvasNodeCard } from './CanvasNodeCard'
import { NODE_W, NODE_TYPE_COLORS, SANS } from '../lib/workflowsUi'
import { ARROW_REACH, getNodeH, getPortPos, portOffsets, sideTangent } from '../lib/workflowEdges'
import { useWorkflowsPageModel } from '../hooks/WorkflowsPageContext'

export function WorkflowCanvas() {
  const {
    mobileTab, canvasRef, canvasW, canvasH, zoom, setZoom,
    ZOOM_MIN, ZOOM_MAX, ZOOM_STEP,
    connectingFrom, setConnectingFrom,
    edgePaths, nodes, agents, selectedNodeId, setSelectedNodeId,
    nodeResultMap, execMode, workflows, selected,
    startDrag, completeConnect, hoverCancelRef, setHoveredNodeId, setNodeHeights,
    updateNodeField, updateNodeConfig, deleteNode,
    currentRun, selectedHistoryRun, firedEvents,
    portDrag, nodeMap, showPortsFor, startPortDrag,
    editingEdgeId, setEditingEdgeId, editingEdgeLabel, setEditingEdgeLabel,
    deleteEdge, setEdges, addNode, nodeHeights,
  } = useWorkflowsPageModel()

  return (
  <>
  {/* Canvas */}
  <div
    className={`wf-canvas-wrap${mobileTab !== 'canvas' ? ' wf-mobile-hide' : ''}`}
    style={{
      flex: 1, overflow: 'auto', position: 'relative', minHeight: 0,
      backgroundColor: 'var(--canvas-bg)',
      backgroundImage: 'radial-gradient(circle, var(--canvas-dot) 1px, transparent 1.5px)',
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0',
    }}
    onWheel={e => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      setZoom(z => {
        const next = e.deltaY < 0 ? z + ZOOM_STEP : z - ZOOM_STEP
        return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +next.toFixed(2)))
      })
    }}
  >
    <div
      ref={canvasRef}
      onKeyDown={e => { if (e.key === 'Escape') setConnectingFrom(null) }}
      tabIndex={0}
      style={{
        position: 'relative',
        width: canvasW, height: canvasH,
        background: 'transparent',
        cursor: connectingFrom ? 'crosshair' : 'default',
        transform: `scale(${zoom})`,
        transformOrigin: 'top left',
      }}
    >
      {/* ── Bottom SVG: edge paths behind node cards ── */}
      <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 0, overflow: 'visible' }}
        width={canvasW} height={canvasH}>
        <defs>
          <filter id="glow-edge">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {edgePaths.map(({ edge, path }) => {
          const fired = execMode === 'event_driven' && !!(currentRun || selectedHistoryRun) && edge.label
            ? firedEvents.has(edge.label) : null
          const stroke = fired === null ? '#1D5FFA99' : fired ? '#F59E0B' : '#1D5FFA33'
          return (
            <path key={edge.edge_id} d={path} fill="none"
              stroke={stroke} strokeWidth={fired ? 2.5 : 1.5}
              filter={fired ? 'url(#glow-edge)' : undefined}
              style={{ transition: 'stroke 0.4s ease' }} />
          )
        })}
      </svg>

      {/* Nodes */}
      {nodes.map(node => (
        <CanvasNodeCard
          key={node.node_id}
          node={node}
          agents={agents}
          isSelected={selectedNodeId === node.node_id}
          isConnectingSource={connectingFrom === node.node_id}
          nodeResult={nodeResultMap[node.node_id]}
          connectingFrom={connectingFrom}
          execMode={execMode}
          workflows={workflows}
          selected={selected}
          onSelect={() => setSelectedNodeId(node.node_id)}
          onDragStart={e => startDrag(node.node_id, e)}

          onCompleteConnect={() => completeConnect(node.node_id)}
          onMouseEnter={() => {
            if (hoverCancelRef.current) { clearTimeout(hoverCancelRef.current); hoverCancelRef.current = null }
            setHoveredNodeId(node.node_id)
          }}
          onMouseLeave={() => {
            hoverCancelRef.current = window.setTimeout(() => setHoveredNodeId(null), 120)
          }}
          onHeightChange={h => setNodeHeights(prev => prev[node.node_id] === h ? prev : { ...prev, [node.node_id]: h })}
          onAgentChange={(agentId, label, type) =>
            updateNodeField(node.node_id, agentId, label, type)
          }
          onConfigChange={config => updateNodeConfig(node.node_id, config)}
          onDelete={() => deleteNode(node.node_id)}
        />
      ))}

      {/* ── Top SVG: arrowheads, port dots, ghost edge, labels ── */}
      <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 20, overflow: 'visible' }}
        width={canvasW} height={canvasH}>
        <defs>
          <marker id="ah-blue"  markerWidth="11" markerHeight="8" refX="10" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <polygon points="0 0,11 4,0 8" fill="#1D5FFA99" />
          </marker>
          <marker id="ah-fired" markerWidth="11" markerHeight="8" refX="10" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <polygon points="0 0,11 4,0 8" fill="#F59E0B" />
          </marker>
          <marker id="ah-dim"   markerWidth="11" markerHeight="8" refX="10" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <polygon points="0 0,11 4,0 8" fill="#1D5FFA33" />
          </marker>
          <marker id="ah-ghost" markerWidth="11" markerHeight="8" refX="10" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <polygon points="0 0,11 4,0 8" fill="#F59E0B" />
          </marker>
        </defs>

        {/* Arrowheads: invisible approach line with auto-orient markerEnd */}
        {edgePaths.map(({ edge, arrowX, arrowY, tx2, ty2 }) => {
          const fired = execMode === 'event_driven' && !!(currentRun || selectedHistoryRun) && edge.label
            ? firedEvents.has(edge.label) : null
          const mid = fired === null ? 'ah-blue' : fired ? 'ah-fired' : 'ah-dim'
          return (
            <line key={`ah-${edge.edge_id}`}
              x1={arrowX + tx2 * ARROW_REACH} y1={arrowY + ty2 * ARROW_REACH}
              x2={arrowX} y2={arrowY}
              stroke="none" strokeWidth={1}
              markerEnd={`url(#${mid})`}
              style={{ pointerEvents: 'none' }} />
          )
        })}

        {/* Ghost edge while dragging a new connection */}
        {portDrag && (() => {
          const fromNode = nodeMap[portDrag.fromNodeId]
          if (!fromNode) return null
          const p = getPortPos(fromNode, portDrag.fromSide, portDrag.fromOffset, nodeHeights)
          const [tx, ty] = sideTangent(portDrag.fromSide)
          const dist = Math.hypot(portDrag.canvasX - p.x, portDrag.canvasY - p.y)
          const cp = Math.max(60, dist * 0.45)
          return (
            <path
              d={`M ${p.x} ${p.y} C ${p.x + tx*cp} ${p.y + ty*cp} ${portDrag.canvasX} ${portDrag.canvasY} ${portDrag.canvasX} ${portDrag.canvasY}`}
              fill="none" stroke="#F59E0B" strokeWidth={2} strokeDasharray="6 3"
              markerEnd="url(#ah-ghost)" style={{ pointerEvents: 'none' }} />
          )
        })()}

        {/* Port dots: hover → source node only; drag → all target nodes */}
        {showPortsFor && (() => {
          const targetNodes = showPortsFor === 'all'
            ? nodes.filter(n => n.node_id !== portDrag?.fromNodeId)
            : nodes.filter(n => n.node_id === showPortsFor)
          return targetNodes.flatMap(n => {
            const accent = NODE_TYPE_COLORS[n.node_type] || '#1D5FFA'
            const h = getNodeH(n, nodeHeights)
            const isDest = showPortsFor === 'all'
            return (['top', 'bottom', 'left', 'right'] as const).flatMap(side => {
              const offs = (side === 'left' || side === 'right') ? portOffsets(h) : portOffsets(NODE_W)
              return offs.map(off => {
                const p = getPortPos(n, side, off, nodeHeights)
                return (
                  <circle key={`${n.node_id}-${side}-${off}`}
                    cx={p.x} cy={p.y} r={isDest ? 4 : 5}
                    fill={isDest ? '#10B98144' : 'white'}
                    stroke={isDest ? '#10B981' : accent}
                    strokeWidth={2}
                    style={{ pointerEvents: portDrag ? 'none' : 'all', cursor: 'crosshair' }}
                    onMouseEnter={() => { if (hoverCancelRef.current) { clearTimeout(hoverCancelRef.current); hoverCancelRef.current = null } }}
                    onMouseDown={e => startPortDrag(n.node_id, side, off, e)} />
                )
              })
            })
          })
        })()}

        {/* Edge labels + delete buttons */}
        {edgePaths.map(({ edge, midX, midY }) => {
          const hasLabel = !!edge.label
          const labelW = hasLabel ? Math.max(edge.label.length * 7 + 16, 52) : 0
          const labelH = 18
          const fired = execMode === 'event_driven' && !!(currentRun || selectedHistoryRun) && edge.label
            ? firedEvents.has(edge.label) : null
          const showLabel = hasLabel && fired !== false
          const isEditing = editingEdgeId === edge.edge_id
          const delY = midY + (hasLabel ? labelH / 2 + 10 : 10)
          return (
            <g key={`lbl-${edge.edge_id}`}>
              {!hasLabel && (
                <circle cx={midX} cy={midY} r={10} fill="transparent"
                  style={{ pointerEvents: 'all', cursor: 'text' }}
                  onClick={() => { setEditingEdgeId(edge.edge_id); setEditingEdgeLabel('') }} />
              )}
              {showLabel && !isEditing && (
                <g style={{ cursor: 'text', pointerEvents: 'all' }}
                  onClick={() => { setEditingEdgeId(edge.edge_id); setEditingEdgeLabel(edge.label || '') }}>
                  <rect x={midX - labelW/2} y={midY - labelH/2} width={labelW} height={labelH} rx={9}
                    fill="#F59E0B" stroke="#92400E" strokeWidth={0.5} />
                  <text x={midX} y={midY + 5} textAnchor="middle" fontSize={9.5}
                    fontFamily="monospace" fill="#1a1a00" fontWeight="700" letterSpacing="0.02em">
                    {edge.label}
                  </text>
                </g>
              )}
              {isEditing && (
                <foreignObject x={midX - 52} y={midY - 12} width={104} height={24} style={{ pointerEvents: 'all' }}>
                  <input autoFocus value={editingEdgeLabel}
                    onChange={e => setEditingEdgeLabel(e.target.value)}
                    onBlur={() => {
                      setEdges(prev => prev.map(ed => ed.edge_id === edge.edge_id ? { ...ed, label: editingEdgeLabel.trim() } : ed))
                      setEditingEdgeId(null)
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        if (e.key === 'Enter') setEdges(prev => prev.map(ed => ed.edge_id === edge.edge_id ? { ...ed, label: editingEdgeLabel.trim() } : ed))
                        setEditingEdgeId(null)
                      }
                    }}
                    placeholder="label…"
                    style={{ width: '100%', height: '100%', fontSize: 10, textAlign: 'center',
                      background: '#1a1200', color: '#F59E0B', border: '1px solid #F59E0B',
                      borderRadius: 6, outline: 'none', fontFamily: 'var(--font-mono)', fontWeight: 700,
                      padding: '0 4px', boxSizing: 'border-box' }} />
                </foreignObject>
              )}
              <circle cx={midX} cy={delY} r={7}
                fill="var(--bg-card)" stroke="var(--border)" strokeWidth={1}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}
                onClick={() => deleteEdge(edge.edge_id)} />
              <text x={midX} y={delY + 4} textAnchor="middle" fontSize={10} fill="#EF4444"
                style={{ pointerEvents: 'all', cursor: 'pointer' }}
                onClick={() => deleteEdge(edge.edge_id)}>×</text>
            </g>
          )
        })}
      </svg>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', color: 'var(--text-muted)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
          <div style={{ ...SANS, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            No nodes yet
          </div>
          <div style={{ ...SANS, fontSize: 12, marginBottom: 14 }}>
            Add agent nodes and connect them to build your workflow
          </div>
          <button onClick={() => addNode('agent')} style={{
            ...SANS, fontSize: 12, padding: '8px 18px', fontWeight: 600,
            background: 'var(--accent)', color: 'var(--btn-upload-text)',
            border: 'none', borderRadius: 6, cursor: 'pointer',
          }}>+ Add First Node</button>
        </div>
      )}
    </div>
  </div>
  </>
  )
}
