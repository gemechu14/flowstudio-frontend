import { useState, useEffect, useRef, type MouseEvent } from 'react'
import type { AgentRecord } from '../../agents/api/agents.api'
import type {
  WorkflowRecord, WorkflowNode, NodeRunResult, ExecutionMode, NodeStatus,
} from '../api/workflows.api'
import { StatusBadge } from './StatusBadge'
import {
  MONO, NODE_W, NODE_H, NODE_TYPE_COLORS, STATUS_COLORS, TEAL,
} from '../lib/workflowsUi'

interface CanvasNodeProps {
  node: WorkflowNode
  agents: AgentRecord[]
  isSelected: boolean
  isConnectingSource: boolean
  nodeResult?: NodeRunResult
  connectingFrom: string | null
  execMode: ExecutionMode
  workflows?: WorkflowRecord[]
  selected?: WorkflowRecord | null
  onSelect: () => void
  onDragStart: (e: MouseEvent) => void
  onCompleteConnect: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onHeightChange: (h: number) => void
  onAgentChange: (agentId: string, label: string, type: string) => void
  onConfigChange: (config: Record<string, unknown>) => void
  onDelete: () => void
}

export function CanvasNodeCard({
  node, agents, isSelected, isConnectingSource, nodeResult, connectingFrom, execMode,
  workflows = [], selected,
  onSelect, onDragStart, onCompleteConnect, onMouseEnter, onMouseLeave, onHeightChange,
  onAgentChange, onConfigChange, onDelete,
}: CanvasNodeProps) {
  const [expandField, setExpandField] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect.height
      if (h) onHeightChange(h)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, []) // eslint-disable-line
  const [expandValue, setExpandValue] = useState('')
  const [expandLabel, setExpandLabel] = useState('')

  const openExpand = (e: MouseEvent, fieldKey: string, label: string, currentValue: string) => {
    e.stopPropagation()
    setExpandField(fieldKey)
    setExpandLabel(label)
    setExpandValue(currentValue)
  }

  const applyExpand = (e: MouseEvent) => {
    e.stopPropagation()
    if (expandField) onConfigChange({ ...node.config, [expandField]: expandValue })
    setExpandField(null)
  }

  const accentColor = NODE_TYPE_COLORS[node.node_type] || '#1D5FFA'
  const agentRecord = agents.find(a => a.agent_id === node.agent_id)
  const status = nodeResult?.status as NodeStatus | undefined
  const statusColor = status ? STATUS_COLORS[status] : undefined

  const parallelGroup = (node.config.parallel_group as string | undefined) || ''
  const hasTealGroup = execMode === 'hybrid' && parallelGroup.trim() !== ''

  const borderColor = isConnectingSource
    ? '#F59E0B'
    : hasTealGroup
    ? TEAL
    : isSelected
    ? accentColor
    : statusColor || 'var(--border)'

  const boxShadow = isSelected
    ? `0 0 0 3px ${hasTealGroup ? TEAL : accentColor}33`
    : hasTealGroup
    ? `0 0 0 2px ${TEAL}44`
    : '0 2px 8px rgba(0,0,0,0.3)'

  return (
  <>
    <div
      ref={cardRef}
      onClick={() => {
        if (connectingFrom && connectingFrom !== node.node_id) onCompleteConnect()
        else onSelect()
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'absolute',
        left: node.position_x, top: node.position_y,
        width: NODE_W, minHeight: NODE_H,
        background: 'var(--bg-card)',
        border: `2px solid ${borderColor}`,
        borderRadius: 10,
        boxShadow,
        cursor: connectingFrom && connectingFrom !== node.node_id ? 'crosshair' : 'default',
        userSelect: 'none',
        transition: 'border-color 0.15s',
        overflow: 'hidden',
      }}
    >
      {/* Header drag handle */}
      <div
        onMouseDown={onDragStart}
        style={{
          background: `${accentColor}22`,
          borderBottom: `1px solid ${accentColor}33`,
          padding: '6px 10px',
          display: 'flex', alignItems: 'center', gap: 6,
          cursor: 'grab',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, flex: 1, ...MONO }}>
          {node.node_type.toUpperCase()}
        </span>
        {status && <StatusBadge status={status} />}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{
            background: 'none', border: 'none', color: '#EF4444',
            cursor: 'pointer', fontSize: 13, padding: '0 2px', lineHeight: 1,
          }}
        >×</button>
      </div>

      {/* Body */}
      <div style={{ padding: '8px 10px' }}>
        {/* Editable label for control nodes (no agent selector) */}
        {(node.node_type === 'switch' || node.node_type === 'condition' || node.node_type === 'loop' || node.node_type === 'fan_out' || node.node_type === 'fan_in') ? (
          <input
            value={node.label || ''}
            onChange={e => onAgentChange('', e.target.value, node.node_type)}
            onClick={e => e.stopPropagation()}
            placeholder={node.node_type === 'switch' ? 'Switch name…' : node.node_type === 'condition' ? 'Condition name…' : node.node_type === 'loop' ? 'Loop name…' : 'Node name…'}
            style={{
              width: '100%', fontSize: 13, fontWeight: 600, padding: '2px 4px',
              background: 'transparent', color: 'var(--text-heading)',
              border: 'none', borderBottom: '1px solid var(--border)',
              borderRadius: 0, marginBottom: 6, boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        ) : (
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 4 }}>
            {node.label || agentRecord?.name || 'Untitled Node'}
          </div>
        )}

        {/* Agent selector — agent / orchestrator / collab / fan_in only (not subworkflow) */}
        {node.node_type !== 'switch' && node.node_type !== 'condition' && node.node_type !== 'fan_out' && node.node_type !== 'loop' && node.node_type !== 'subworkflow' && node.node_type !== 'collaborative_node' && (
        <select
          value={node.agent_id || ''}
          onChange={e => {
            const a = agents.find(ag => ag.agent_id === e.target.value)
            onAgentChange(e.target.value, a?.name || node.label, node.node_type)
          }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', fontSize: 11, padding: '3px 6px',
            background: 'var(--bg-page)', color: 'var(--text-body)',
            border: '1px solid var(--border)', borderRadius: 5,
            ...MONO,
          }}
        >
          <option value="">— select agent —</option>
          {agents.map(a => (
            <option key={a.agent_id} value={a.agent_id}>{a.name}</option>
          ))}
        </select>
        )}

        {/* Timeout + retry delay — agent / orchestrator nodes only */}
        {(node.node_type === 'agent' || node.node_type === 'orchestrator') && (
        <div style={{ marginTop: 4 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>Timeout (s)</div>
              <input type="number" min="0" placeholder="∞"
                value={(node.config.timeout_seconds as number | undefined) || ''}
                onChange={e => onConfigChange({ ...node.config, timeout_seconds: e.target.value ? Number(e.target.value) : undefined })}
                onClick={e => e.stopPropagation()}
                style={{ width: '100%', fontSize: 10, padding: '2px 5px', background: 'var(--bg-page)', color: 'var(--text-body)', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>Retry delay (s)</div>
              <input type="number" min="0" step="0.5" placeholder="1.0"
                value={(node.config.retry_delay as number | undefined) || ''}
                onChange={e => onConfigChange({ ...node.config, retry_delay: e.target.value ? Number(e.target.value) : undefined })}
                onClick={e => e.stopPropagation()}
                style={{ width: '100%', fontSize: 10, padding: '2px 5px', background: 'var(--bg-page)', color: 'var(--text-body)', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        </div>
        )}

        {/* Splitter/Aggregator toggles — parallel and hybrid modes */}
        {(execMode === 'parallel' || execMode === 'hybrid') && node.node_type === 'agent' && (
          <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, cursor: 'pointer', fontFamily: 'var(--font-mono)', color: '#F59E0B' }}>
              <input type="checkbox" checked={!!(node.config.is_splitter)} onChange={e => onConfigChange({ ...node.config, is_splitter: e.target.checked, is_aggregator: false })} onClick={ev => ev.stopPropagation()} />
              Splitter
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, cursor: 'pointer', fontFamily: 'var(--font-mono)', color: '#10B981' }}>
              <input type="checkbox" checked={!!(node.config.is_aggregator)} onChange={e => onConfigChange({ ...node.config, is_aggregator: e.target.checked, is_splitter: false })} onClick={ev => ev.stopPropagation()} />
              Aggregator
            </label>
          </div>
        )}

        {/* Event-driven / hybrid config — agent and orchestrator nodes only */}
        {(execMode === 'event_driven' || execMode === 'hybrid') && (node.node_type === 'agent' || node.node_type === 'orchestrator') && (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div>
              <div style={{ ...MONO, fontSize: 9, color: '#F59E0B', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Subscribes to (comma-sep)
              </div>
              <input
                value={((node.config.subscribes_to as string[] | undefined) || []).join(', ')}
                onChange={e => {
                  const evts = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  onConfigChange({ ...node.config, subscribes_to: evts })
                }}
                onClick={e => e.stopPropagation()}
                placeholder="event-a, event-b  (blank = trigger node)"
                style={{
                  width: '100%', fontSize: 10, padding: '3px 6px',
                  background: 'var(--bg-page)', color: 'var(--text-body)',
                  border: `1px solid ${'#F59E0B'}`,
                  borderRadius: 5, boxSizing: 'border-box', ...MONO,
                }}
              />
            </div>
            <div>
              <div style={{ ...MONO, fontSize: 9, color: '#10B981', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Emits event
              </div>
              <input
                value={(node.config.emits_event as string | undefined) || ''}
                onChange={e => onConfigChange({ ...node.config, emits_event: e.target.value })}
                onClick={e => e.stopPropagation()}
                placeholder="event-name  (blank = no emit)"
                style={{
                  width: '100%', fontSize: 10, padding: '3px 6px',
                  background: 'var(--bg-page)', color: 'var(--text-body)',
                  border: `1px solid ${'#10B981'}`,
                  borderRadius: 5, boxSizing: 'border-box', ...MONO,
                }}
              />
            </div>
            {execMode === 'event_driven' && ((node.config.subscribes_to as string[] | undefined) || []).length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>Event timeout (s)</div>
                <input type="number" min="10" placeholder="300"
                  value={(node.config.event_timeout_seconds as number | undefined) || ''}
                  onChange={e => onConfigChange({ ...node.config, event_timeout_seconds: e.target.value ? Number(e.target.value) : undefined })}
                  onClick={e => e.stopPropagation()}
                  style={{ width: '100%', fontSize: 10, padding: '2px 5px', background: 'var(--bg-page)', color: 'var(--text-body)', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'var(--font-mono)' }}
                />
                <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, marginTop: 4, fontFamily: 'var(--font-mono)' }}>Fallback if event times out</div>
                <input placeholder="fallback text or leave empty"
                  value={(node.config.event_fallback as string | undefined) || ''}
                  onChange={e => onConfigChange({ ...node.config, event_fallback: e.target.value })}
                  onClick={e => e.stopPropagation()}
                  style={{ width: '100%', fontSize: 10, padding: '2px 5px', background: 'var(--bg-page)', color: 'var(--text-body)', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'var(--font-mono)' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Sub-workflow config */}
        {node.node_type === 'subworkflow' && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 9, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>Target Workflow</div>
            <select
              value={(node.config.target_workflow_id as string | undefined) || ''}
              onChange={e => onConfigChange({ ...node.config, target_workflow_id: e.target.value })}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', fontSize: 10, padding: '3px 6px', background: 'var(--bg-page)', color: 'var(--text-body)', border: '1px solid #7C3AED', borderRadius: 5, fontFamily: 'var(--font-mono)' }}
            >
              <option value="">— select workflow —</option>
              {workflows.filter(w => w.workflow_id !== selected?.workflow_id).map(w => (
                <option key={w.workflow_id} value={w.workflow_id}>{w.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Collaborative node config */}
        {node.node_type === 'collaborative_node' && (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>
              <div style={{ fontSize: 9, color: '#EC4899', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>Rounds</div>
              <input type="number" min="1" max="10"
                value={(node.config.loop_iterations as number | undefined) || 3}
                onChange={e => onConfigChange({ ...node.config, loop_iterations: Number(e.target.value) })}
                onClick={e => e.stopPropagation()}
                style={{ width: '100%', fontSize: 10, padding: '2px 5px', background: 'var(--bg-page)', color: 'var(--text-body)', border: '1px solid #EC4899', borderRadius: 4, fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#EC4899', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>Stop when</div>
              <input placeholder="contains:APPROVED"
                value={(node.config.convergence_expr as string | undefined) || ''}
                onChange={e => onConfigChange({ ...node.config, convergence_expr: e.target.value })}
                onClick={e => e.stopPropagation()}
                style={{ width: '100%', fontSize: 10, padding: '2px 5px', background: 'var(--bg-page)', color: 'var(--text-body)', border: '1px solid #EC4899', borderRadius: 4, fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        )}

        {/* Condition expression — condition nodes only */}
        {node.node_type === 'condition' && (
          <div style={{ marginTop: 6 }}>
            <div style={{ ...MONO, fontSize: 9, color: '#EF4444', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Condition expr
            </div>
            <input
              value={(node.config.condition_expr as string | undefined) || ''}
              onChange={e => onConfigChange({ ...node.config, condition_expr: e.target.value })}
              onClick={e => e.stopPropagation()}
              placeholder="contains:APPROVE  |  regex:^yes  |  nonempty"
              style={{
                width: '100%', fontSize: 10, padding: '3px 6px',
                background: 'var(--bg-page)', color: 'var(--text-body)',
                border: '1px solid #EF4444', borderRadius: 5, boxSizing: 'border-box', ...MONO,
              }}
            />
            <div style={{ ...MONO, fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
              Label outgoing edges "true" / "false"
            </div>
          </div>
        )}

        {/* Loop node config — loop nodes only */}
        {node.node_type === 'loop' && (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div>
              <div style={{ ...MONO, fontSize: 9, color: '#06B6D4', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Convergence condition
              </div>
              <input
                value={(node.config.condition_expr as string | undefined) || ''}
                onChange={e => onConfigChange({ ...node.config, condition_expr: e.target.value })}
                onClick={e => e.stopPropagation()}
                placeholder="contains:LGTM  |  regex:score:\s*[89]\d  |  nonempty"
                style={{
                  width: '100%', fontSize: 10, padding: '3px 6px',
                  background: 'var(--bg-page)', color: 'var(--text-body)',
                  border: '1px solid #06B6D4', borderRadius: 5, boxSizing: 'border-box', ...MONO,
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ ...MONO, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                Max iterations
              </div>
              <input
                type="number"
                min={1} max={20}
                value={(node.config.max_iterations as number | undefined) ?? 10}
                onChange={e => onConfigChange({ ...node.config, max_iterations: parseInt(e.target.value) || 10 })}
                onClick={e => e.stopPropagation()}
                style={{
                  width: 52, fontSize: 10, padding: '2px 5px',
                  background: 'var(--bg-page)', color: 'var(--text-body)',
                  border: '1px solid var(--border)', borderRadius: 4, ...MONO,
                }}
              />
            </div>
            <div style={{ ...MONO, fontSize: 9, color: 'var(--text-muted)' }}>
              Edge to loop start → label "continue" · Edge forward → label "exit"
            </div>
          </div>
        )}

        {/* Switch node config — multi-way routing */}
        {node.node_type === 'switch' && (
          <div style={{ marginTop: 6 }}>
            <div style={{ ...MONO, fontSize: 9, color: '#F97316', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Branches (evaluated in order)
            </div>
            {((node.config.branches as {condition: string; label: string}[] | undefined) || []).map((branch, idx) => (
              <div key={idx} style={{
                display: 'flex', flexDirection: 'column', gap: 3,
                marginBottom: 6, padding: '5px 6px',
                background: '#F9731608', border: '1px solid #F9731630', borderRadius: 5,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ ...MONO, fontSize: 9, color: '#F97316', fontWeight: 700, flex: 1 }}>IF</span>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      const branches = ((node.config.branches as {condition: string; label: string}[]) || []).filter((_, i) => i !== idx)
                      onConfigChange({ ...node.config, branches })
                    }}
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 13, padding: '0 2px', lineHeight: 1 }}
                  >×</button>
                </div>
                <input
                  value={branch.condition}
                  onChange={e => {
                    const branches = [...((node.config.branches as {condition: string; label: string}[]) || [])]
                    branches[idx] = { ...branch, condition: e.target.value }
                    onConfigChange({ ...node.config, branches })
                  }}
                  onClick={e => e.stopPropagation()}
                  placeholder="contains:value"
                  style={{
                    width: '100%', fontSize: 10, padding: '2px 5px',
                    background: 'var(--bg-page)', color: 'var(--text-body)',
                    border: '1px solid #F97316', borderRadius: 4, ...MONO, boxSizing: 'border-box',
                  }}
                />
                <div style={{ ...MONO, fontSize: 9, color: 'var(--text-muted)' }}>→ EDGE LABEL</div>
                <input
                  value={branch.label}
                  onChange={e => {
                    const branches = [...((node.config.branches as {condition: string; label: string}[]) || [])]
                    branches[idx] = { ...branch, label: e.target.value }
                    onConfigChange({ ...node.config, branches })
                  }}
                  onClick={e => e.stopPropagation()}
                  placeholder="branch-name"
                  style={{
                    width: '100%', fontSize: 10, padding: '2px 5px',
                    background: 'var(--bg-page)', color: 'var(--text-body)',
                    border: '1px solid var(--border)', borderRadius: 4, ...MONO, boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
            <button
              onClick={e => {
                e.stopPropagation()
                const branches = [...((node.config.branches as {condition: string; label: string}[]) || []), { condition: '', label: '' }]
                onConfigChange({ ...node.config, branches })
              }}
              style={{
                ...MONO, fontSize: 9, padding: '2px 8px',
                background: '#F9731622', border: '1px solid #F9731644',
                color: '#F97316', borderRadius: 3, cursor: 'pointer', marginBottom: 4,
              }}
            >+ branch</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ ...MONO, fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Default edge label:</span>
              <input
                value={(node.config.default_label as string | undefined) || 'default'}
                onChange={e => onConfigChange({ ...node.config, default_label: e.target.value })}
                onClick={e => e.stopPropagation()}
                style={{
                  flex: 1, fontSize: 10, padding: '2px 5px',
                  background: 'var(--bg-page)', color: 'var(--text-body)',
                  border: '1px solid var(--border)', borderRadius: 4, ...MONO,
                }}
              />
            </div>
            <div style={{ ...MONO, fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>
              Draw outgoing edges with matching labels
            </div>
          </div>
        )}

        {/* Retry config — agent nodes */}
        {(node.node_type === 'agent' || node.node_type === 'orchestrator') && (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ ...MONO, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
                Retries
              </div>
              {[0, 1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={e => { e.stopPropagation(); onConfigChange({ ...node.config, max_retries: n }) }}
                  style={{
                    ...MONO, fontSize: 10, width: 22, height: 22,
                    background: (node.config.max_retries as number | undefined || 0) === n ? 'var(--accent)' : 'var(--bg-page)',
                    color: (node.config.max_retries as number | undefined || 0) === n ? 'var(--btn-upload-text)' : 'var(--text-muted)',
                    border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer',
                  }}
                >{n}</button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ ...MONO, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                On fail
              </div>
              <select
                value={(node.config.on_failure as string | undefined) || 'fail'}
                onChange={e => { e.stopPropagation(); onConfigChange({ ...node.config, on_failure: e.target.value }) }}
                onClick={e => e.stopPropagation()}
                style={{
                  flex: 1, fontSize: 10, padding: '2px 4px',
                  background: 'var(--bg-page)', color: 'var(--text-body)',
                  border: '1px solid var(--border)', borderRadius: 4, ...MONO,
                }}
              >
                <option value="fail">Fail workflow</option>
                <option value="skip">Skip node</option>
                <option value="fallback">Use fallback text</option>
              </select>
            </div>
            {(node.config.on_failure as string | undefined) === 'fallback' && (
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                <input
                  value={(node.config.fallback_text as string | undefined) || ''}
                  onChange={e => onConfigChange({ ...node.config, fallback_text: e.target.value })}
                  onClick={e => e.stopPropagation()}
                  placeholder="Fallback output text…"
                  style={{
                    flex: 1, fontSize: 10, padding: '3px 6px',
                    background: 'var(--bg-page)', color: 'var(--text-body)',
                    border: '1px solid var(--border)', borderRadius: 5, boxSizing: 'border-box', ...MONO,
                  }}
                />
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => openExpand(e, 'fallback_text', 'Fallback Text', (node.config.fallback_text as string | undefined) || '')}
                  title="Edit in full view"
                  style={{
                    ...MONO, fontSize: 10, padding: '2px 5px', flexShrink: 0,
                    background: 'var(--bg-page)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', borderRadius: 4, cursor: 'pointer', lineHeight: 1,
                  }}
                >↗</button>
              </div>
            )}
          </div>
        )}

        {/* Human-in-the-loop checkbox — agent and orchestrator nodes */}
        {(node.node_type === 'agent' || node.node_type === 'orchestrator') && (
          <div style={{ marginTop: 5 }}>
            <label
              onClick={e => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={!!(node.config.human_checkpoint)}
                onChange={e => onConfigChange({ ...node.config, human_checkpoint: e.target.checked })}
                onClick={e => e.stopPropagation()}
              />
              <span style={{ ...MONO, fontSize: 9, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Human checkpoint
              </span>
            </label>
            {!!(node.config.human_checkpoint) && (
              <div style={{ marginTop: 3, display: 'flex', gap: 3, alignItems: 'center' }}>
                <input
                  value={(node.config.checkpoint_prompt as string | undefined) || ''}
                  onChange={e => onConfigChange({ ...node.config, checkpoint_prompt: e.target.value })}
                  onClick={e => e.stopPropagation()}
                  placeholder="Instructions for reviewer…"
                  style={{
                    flex: 1, fontSize: 10, padding: '3px 6px',
                    background: 'var(--bg-page)', color: 'var(--text-body)',
                    border: '1px solid #7C3AED66', borderRadius: 5, boxSizing: 'border-box', ...MONO,
                  }}
                />
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => openExpand(e, 'checkpoint_prompt', 'Checkpoint Prompt', (node.config.checkpoint_prompt as string | undefined) || '')}
                  title="Edit in full view"
                  style={{
                    ...MONO, fontSize: 10, padding: '2px 5px', flexShrink: 0,
                    background: '#7C3AED22', border: '1px solid #7C3AED44',
                    color: '#7C3AED', borderRadius: 4, cursor: 'pointer', lineHeight: 1,
                  }}
                >↗</button>
              </div>
            )}
          </div>
        )}

        {/* Node output preview — hidden for orchestrator nodes to keep card height stable */}
        {nodeResult?.output_text && node.node_type !== 'orchestrator' && (
          <div style={{
            marginTop: 6, fontSize: 10, color: 'var(--text-muted)',
            maxHeight: 40, overflow: 'hidden',
            borderTop: '1px solid var(--border)', paddingTop: 4,
          }}>
            {nodeResult.output_text.slice(0, 120)}
            {nodeResult.output_text.length > 120 ? '…' : ''}
          </div>
        )}

        {/* Port handles are in the SVG layer above — hover the node border to connect */}
      </div>
    </div>

    {/* Full-text editor modal — fixed so it escapes overflow:hidden on the node card */}
    {expandField && (
      <div
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          width: 560, maxWidth: '90vw',
          display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {expandLabel}
            </span>
            <button
              onClick={() => setExpandField(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 2px' }}
            >×</button>
          </div>
          <textarea
            autoFocus
            value={expandValue}
            onChange={e => setExpandValue(e.target.value)}
            rows={8}
            style={{
              width: '100%', boxSizing: 'border-box',
              fontSize: 13, lineHeight: 1.6,
              padding: '10px 12px',
              background: 'var(--bg-page)', color: 'var(--text-body)',
              border: `1px solid ${accentColor}55`,
              borderRadius: 7, resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setExpandField(null)}
              style={{ ...MONO, fontSize: 11, padding: '6px 16px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-muted)' }}
            >Cancel</button>
            <button
              onClick={applyExpand}
              style={{ ...MONO, fontSize: 11, padding: '6px 16px', background: accentColor, border: 'none', borderRadius: 6, cursor: 'pointer', color: '#fff', fontWeight: 700 }}
            >Apply</button>
          </div>
        </div>
      </div>
    )}
  </>
  )
}

