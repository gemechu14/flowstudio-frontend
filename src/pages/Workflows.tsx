import { useState, useEffect, useRef, useCallback } from 'react'
import { AgentRecord, listAgents } from '../api/agents'
import {
  WorkflowRecord, WorkflowNode, WorkflowEdge, WorkflowRun, NodeRunResult, ExecutionMode,
  NodeStatus, ScheduleTrigger, WebhookTrigger, CheckpointInfo,
  listWorkflows, createWorkflow, updateWorkflow, deleteWorkflow, runWorkflow, listRuns, getRun,
  deleteRun, clearAllRuns,
  listSchedules, createSchedule, deleteSchedule,
  listWebhooks, createWebhook, deleteWebhook,
  getCheckpoint, resumeRun,
} from '../api/workflows'

// ─── constants ───────────────────────────────────────────────────────────────

const NODE_W = 200
const NODE_H = 80
const MONO = { fontFamily: 'var(--font-mono)' }

const MODE_LABELS: Record<ExecutionMode, string> = {
  sequential: 'Sequential — Pipeline',
  parallel: 'Parallel — Fan-out',
  hierarchical: 'Hierarchical — Orchestrator',
  hybrid: 'Hybrid — DAG + Orchestrator',
  collaborative: 'Collaborative — Review Loop',
  event_driven: 'Event-Driven — Pub/Sub',
}


const NODE_TYPE_COLORS: Record<string, string> = {
  agent: '#1D5FFA',
  orchestrator: '#7C3AED',
  fan_out: '#F59E0B',
  fan_in: '#10B981',
  condition: '#EF4444',
  loop: '#06B6D4',
  switch: '#F97316',
}

const STATUS_COLORS: Record<NodeStatus, string> = {
  pending: '#6B7280',
  running: '#3B82F6',
  completed: '#10B981',
  failed: '#EF4444',
  skipped: '#9CA3AF',
}

const STATUS_ICONS: Record<NodeStatus, string> = {
  pending: '○', running: '◌', completed: '✓', failed: '✗', skipped: '–',
}

const TEAL = '#14b8a6'

let _idCounter = 0
const newId = (prefix = 'n') => `${prefix}_${++_idCounter}_${Math.random().toString(36).slice(2, 6)}`

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (iso: string | null | undefined) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return '—' }
}

const elapsed = (start: string | null, end: string | null): string => {
  if (!start || !end) return ''
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ─── sub-components ──────────────────────────────────────────────────────────

function Chip({ label, color = '#1D5FFA' }: { label: string; color?: string }) {
  return (
    <span style={{
      ...MONO, fontSize: 10, padding: '2px 7px', borderRadius: 4,
      background: `${color}22`, color, border: `1px solid ${color}44`,
      fontWeight: 600, letterSpacing: '0.05em',
    }}>{label}</span>
  )
}

function StatusBadge({ status }: { status: NodeStatus }) {
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

// ─── canvas node component ────────────────────────────────────────────────────

interface CanvasNodeProps {
  node: WorkflowNode
  agents: AgentRecord[]
  isSelected: boolean
  isConnectingSource: boolean
  nodeResult?: NodeRunResult
  connectingFrom: string | null
  execMode: ExecutionMode
  onSelect: () => void
  onDragStart: (e: React.MouseEvent) => void
  onStartConnect: () => void
  onCompleteConnect: () => void
  onAgentChange: (agentId: string, label: string, type: string) => void
  onConfigChange: (config: Record<string, unknown>) => void
  onDelete: () => void
}

function CanvasNodeCard({
  node, agents, isSelected, isConnectingSource, nodeResult, connectingFrom, execMode,
  onSelect, onDragStart, onStartConnect, onCompleteConnect, onAgentChange, onConfigChange, onDelete,
}: CanvasNodeProps) {
  const [expandField, setExpandField] = useState<string | null>(null)
  const [expandValue, setExpandValue] = useState('')
  const [expandLabel, setExpandLabel] = useState('')

  const openExpand = (e: React.MouseEvent, fieldKey: string, label: string, currentValue: string) => {
    e.stopPropagation()
    setExpandField(fieldKey)
    setExpandLabel(label)
    setExpandValue(currentValue)
  }

  const applyExpand = (e: React.MouseEvent) => {
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
      onClick={() => {
        if (connectingFrom && connectingFrom !== node.node_id) onCompleteConnect()
        else onSelect()
      }}
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
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 4 }}>
          {node.label || agentRecord?.name || 'Untitled Node'}
        </div>

        {/* Agent selector */}
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

        {/* Parallel group input — hybrid mode only */}
        {execMode === 'hybrid' && (
          <div style={{ marginTop: 6 }}>
            <div style={{ ...MONO, fontSize: 9, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Parallel group
            </div>
            <input
              value={parallelGroup}
              onChange={e => {
                onConfigChange({ ...node.config, parallel_group: e.target.value })
              }}
              onClick={e => e.stopPropagation()}
              placeholder="group-name (leave blank for sequential)"
              style={{
                width: '100%', fontSize: 10, padding: '3px 6px',
                background: 'var(--bg-page)', color: 'var(--text-body)',
                border: `1px solid ${parallelGroup.trim() ? TEAL : 'var(--border)'}`,
                borderRadius: 5, boxSizing: 'border-box',
                ...MONO,
              }}
            />
          </div>
        )}

        {/* Event-driven config — event_driven mode only */}
        {execMode === 'event_driven' && (
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
              <div key={idx} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
                <input
                  value={branch.condition}
                  onChange={e => {
                    const branches = [...((node.config.branches as {condition: string; label: string}[]) || [])]
                    branches[idx] = { ...branch, condition: e.target.value }
                    onConfigChange({ ...node.config, branches })
                  }}
                  onClick={e => e.stopPropagation()}
                  placeholder="contains:low"
                  style={{
                    flex: 2, fontSize: 10, padding: '2px 5px',
                    background: 'var(--bg-page)', color: 'var(--text-body)',
                    border: '1px solid #F97316', borderRadius: 4, ...MONO,
                  }}
                />
                <span style={{ ...MONO, fontSize: 9, color: 'var(--text-muted)' }}>→</span>
                <input
                  value={branch.label}
                  onChange={e => {
                    const branches = [...((node.config.branches as {condition: string; label: string}[]) || [])]
                    branches[idx] = { ...branch, label: e.target.value }
                    onConfigChange({ ...node.config, branches })
                  }}
                  onClick={e => e.stopPropagation()}
                  placeholder="low"
                  style={{
                    flex: 1, fontSize: 10, padding: '2px 5px',
                    background: 'var(--bg-page)', color: 'var(--text-body)',
                    border: '1px solid var(--border)', borderRadius: 4, ...MONO,
                  }}
                />
                <button
                  onClick={e => {
                    e.stopPropagation()
                    const branches = ((node.config.branches as {condition: string; label: string}[]) || []).filter((_, i) => i !== idx)
                    onConfigChange({ ...node.config, branches })
                  }}
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 13, padding: '0 2px', lineHeight: 1 }}
                >×</button>
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
                    background: (node.config.max_retries as number | undefined || 0) === n ? '#1D5FFA' : 'var(--bg-page)',
                    color: (node.config.max_retries as number | undefined || 0) === n ? '#fff' : 'var(--text-muted)',
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

        {/* Connect button — hidden in parallel mode */}
        <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
          {execMode !== 'parallel' && execMode !== 'hierarchical' && (
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onStartConnect() }}
            style={{
              ...MONO, fontSize: 10, padding: '2px 7px',
              background: isConnectingSource ? '#F59E0B22' : 'var(--bg-page)',
              border: `1px solid ${isConnectingSource ? '#F59E0B' : 'var(--border)'}`,
              color: isConnectingSource ? '#F59E0B' : 'var(--text-muted)',
              borderRadius: 4, cursor: 'pointer',
            }}
          >
            {isConnectingSource ? '● connecting…' : '→ connect'}
          </button>
          )}
        </div>
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

// ─── run result panel ─────────────────────────────────────────────────────────

function RunResultPanel({
  run, workflowId, onClose, onResumed,
}: {
  run: WorkflowRun
  workflowId: string
  onClose: () => void
  onResumed: (updated: WorkflowRun) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [checkpoint, setCheckpoint] = useState<CheckpointInfo | null>(null)
  const [humanInput, setHumanInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [runnerExpand, setRunnerExpand] = useState<{ label: string; value: string } | null>(null)

  // Fetch checkpoint detail when status changes to awaiting
  useEffect(() => {
    if (run.status === 'awaiting_checkpoint') {
      getCheckpoint(workflowId, run.run_id)
        .then(cp => { if (cp.status === 'awaiting') setCheckpoint(cp) })
        .catch(() => {})
    } else {
      setCheckpoint(null)
    }
  }, [run.status, run.run_id, workflowId])

  const handleResume = async () => {
    if (!humanInput.trim() && !confirm('Submit empty input?')) return
    setSubmitting(true)
    try {
      const updated = await resumeRun(workflowId, run.run_id, humanInput || 'APPROVE')
      setHumanInput('')
      setCheckpoint(null)
      onResumed(updated)
    } catch (e: any) {
      alert(e.message || String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const statusColor =
    run.status === 'completed' ? '#10B981'
    : run.status === 'awaiting_checkpoint' ? '#7C3AED'
    : run.status === 'running' ? '#3B82F6'
    : '#EF4444'

  const statusIcon =
    run.status === 'completed' ? '✓'
    : run.status === 'awaiting_checkpoint' ? '⏸'
    : run.status === 'running' ? '◌'
    : '✗'

  const expandModal = runnerExpand ? (
    <div
      onClick={() => setRunnerExpand(null)}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 20, width: 700, maxWidth: '90vw',
          maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color: 'var(--text-heading)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {runnerExpand.label}
          </span>
          <button onClick={() => setRunnerExpand(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <textarea
          readOnly
          value={runnerExpand.value}
          style={{
            ...MONO, fontSize: 12, color: 'var(--text-body)',
            background: 'var(--bg-page)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '10px 12px',
            resize: 'vertical', minHeight: 300, flex: 1,
            outline: 'none',
          }}
        />
      </div>
    </div>
  ) : null

  return (
    <>
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-card)',
      maxHeight: 420,
      overflow: 'auto',
    }}>
      <div style={{
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: 10,
        position: 'sticky', top: 0, background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)', zIndex: 1,
      }}>
        <span style={{
          fontSize: 12, fontWeight: 700, color: 'var(--text-heading)', flex: 1,
        }}>
          Run result — {run.execution_mode}
          <span style={{ ...MONO, fontSize: 10, marginLeft: 8, color: statusColor }}>
            {statusIcon} {run.status}
          </span>
        </span>
        <span style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)' }}>
          {run.total_input_tokens + run.total_output_tokens} tokens
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 14,
          }}
        >×</button>
      </div>

      {/* HITL checkpoint panel */}
      {run.status === 'awaiting_checkpoint' && (
        <div style={{
          margin: '12px 20px',
          padding: '12px 14px',
          background: '#7C3AED12',
          border: '1px solid #7C3AED44',
          borderRadius: 8,
        }}>
          <div style={{ fontWeight: 700, color: '#7C3AED', fontSize: 12, marginBottom: 6 }}>
            ⏸ Human checkpoint — {checkpoint?.node_label || 'waiting…'}
          </div>
          {checkpoint?.checkpoint_prompt && (
            <div style={{ ...MONO, fontSize: 11, color: 'var(--text-body)', marginBottom: 8, lineHeight: 1.5 }}>
              {checkpoint.checkpoint_prompt}
            </div>
          )}
          {checkpoint?.prior_output && (
            <div style={{
              ...MONO, fontSize: 11, color: 'var(--text-muted)',
              background: 'var(--bg-page)', padding: '8px 10px',
              borderRadius: 6, border: '1px solid var(--border)',
              whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto', marginBottom: 8,
            }}>
              {checkpoint.prior_output}
            </div>
          )}
          <textarea
            value={humanInput}
            onChange={e => setHumanInput(e.target.value)}
            placeholder="Type APPROVE to accept the output above, or enter your own text to override it…"
            rows={3}
            style={{
              width: '100%', ...MONO, fontSize: 11,
              padding: '8px 10px', borderRadius: 6,
              background: 'var(--bg-page)', color: 'var(--text-body)',
              border: '1px solid #7C3AED66',
              resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleResume}
            disabled={submitting}
            style={{
              marginTop: 6, ...MONO, fontSize: 11, padding: '6px 16px',
              background: submitting ? '#7C3AED44' : '#7C3AED',
              color: '#fff', border: 'none', borderRadius: 6,
              cursor: submitting ? 'wait' : 'pointer',
            }}
          >
            {submitting ? 'Submitting…' : '▶ Resume workflow'}
          </button>
        </div>
      )}

      {/* Node results */}
      {run.node_results.map(nr => (
        <div key={nr.result_id || nr.node_id} style={{
          borderBottom: '1px solid var(--border)',
        }}>
          <div
            onClick={() => setExpanded(expanded === nr.node_id ? null : nr.node_id)}
            style={{
              padding: '10px 20px', display: 'flex', alignItems: 'center',
              gap: 8, cursor: 'pointer',
              background: expanded === nr.node_id ? 'var(--bg-page)' : 'transparent',
            }}
          >
            <StatusBadge status={nr.status as NodeStatus} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', flex: 1 }}>
              {nr.node_label || nr.node_id}
            </span>
            {nr.started_at && nr.completed_at && (
              <span style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)' }}>
                {elapsed(nr.started_at, nr.completed_at)}
              </span>
            )}
            <span style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)' }}>
              {nr.input_tokens + nr.output_tokens} tok
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              {expanded === nr.node_id ? '▲' : '▼'}
            </span>
          </div>

          {expanded === nr.node_id && (
            <div style={{ padding: '0 20px 14px', background: 'var(--bg-page)' }}>
              {nr.error_message && (
                <div style={{
                  marginBottom: 8, padding: '8px 10px',
                  background: '#EF444420', border: '1px solid #EF444440',
                  borderRadius: 6, color: '#EF4444', fontSize: 12,
                }}>
                  {nr.error_message}
                </div>
              )}
              {nr.system_prompt_used && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ ...MONO, fontSize: 10, color: '#7C3AED', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    SYSTEM
                    <button onClick={() => setRunnerExpand({ label: `${nr.node_label || nr.node_id} — System Prompt`, value: nr.system_prompt_used! })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', fontSize: 11, padding: 0, lineHeight: 1 }}>↗</button>
                  </div>
                  <div style={{
                    ...MONO, fontSize: 11, color: 'var(--text-body)',
                    background: '#7C3AED08', padding: '8px 10px',
                    borderRadius: 6, border: '1px solid #7C3AED30',
                    whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'auto',
                  }}>
                    {nr.system_prompt_used}
                  </div>
                </div>
              )}
              {nr.input_text && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    INPUT
                    <button onClick={() => setRunnerExpand({ label: `${nr.node_label || nr.node_id} — Input`, value: nr.input_text })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, padding: 0, lineHeight: 1 }}>↗</button>
                  </div>
                  <div style={{
                    ...MONO, fontSize: 11, color: 'var(--text-body)',
                    background: 'var(--bg-card)', padding: '8px 10px',
                    borderRadius: 6, border: '1px solid var(--border)',
                    whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'auto',
                  }}>
                    {nr.input_text}
                  </div>
                </div>
              )}
              {nr.output_text && (
                <div>
                  <div style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    OUTPUT
                    <button onClick={() => setRunnerExpand({ label: `${nr.node_label || nr.node_id} — Output`, value: nr.output_text })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, padding: 0, lineHeight: 1 }}>↗</button>
                  </div>
                  <div style={{
                    ...MONO, fontSize: 11, color: 'var(--text-body)',
                    background: 'var(--bg-card)', padding: '8px 10px',
                    borderRadius: 6, border: '1px solid var(--border)',
                    whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto',
                  }}>
                    {nr.output_text}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Final output */}
      {run.final_output && (
        <div style={{ padding: '12px 20px' }}>
          <div style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            FINAL OUTPUT
            <button onClick={() => setRunnerExpand({ label: 'Final Output', value: run.final_output })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, padding: 0, lineHeight: 1 }}>↗</button>
          </div>
          <div style={{
            ...MONO, fontSize: 11, color: 'var(--text-body)',
            background: 'var(--bg-page)', padding: '10px 12px',
            borderRadius: 6, border: '1px solid var(--border)',
            whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto',
          }}>
            {run.final_output}
          </div>
        </div>
      )}

      {/* Shared Blackboard */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Shared Blackboard
        </div>
        {run.blackboard && Object.keys(run.blackboard).length > 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {Object.entries(run.blackboard).map(([k, v]) => (
              <div key={k} style={{
                display: 'flex', gap: 8, alignItems: 'flex-start',
                background: `${TEAL}10`, border: `1px solid ${TEAL}30`,
                borderRadius: 5, padding: '5px 8px',
              }}>
                <span style={{ ...MONO, fontSize: 10, color: TEAL, fontWeight: 700, flexShrink: 0 }}>{k}</span>
                <span style={{ ...MONO, fontSize: 10, color: 'var(--text-body)', flex: 1, wordBreak: 'break-all' }}>{v}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            ...MONO, fontSize: 11, color: 'var(--text-muted)',
            background: 'var(--bg-page)', padding: '10px 12px',
            borderRadius: 6, border: '1px solid var(--border)',
            fontStyle: 'italic',
          }}>
            Blackboard values will appear here during collaborative and hybrid runs.
          </div>
        )}
      </div>
    </div>

      {expandModal}
    </>
  )
}

// ─── run history panel ────────────────────────────────────────────────────────

function RunHistoryPanel({
  runs, onSelectRun, selectedRunId, workflowId, onRunsChanged,
}: {
  runs: WorkflowRun[]
  onSelectRun: (r: WorkflowRun) => void
  selectedRunId?: string
  workflowId: string
  onRunsChanged: () => void
}) {
  const statusColor = (s: string) =>
    s === 'completed' ? '#10B981' : s === 'running' ? '#3B82F6' : s === 'awaiting_checkpoint' ? '#7C3AED' : '#EF4444'
  const statusIcon = (s: string) =>
    s === 'completed' ? '✓' : s === 'running' ? '◌' : s === 'awaiting_checkpoint' ? '⏸' : '✗'

  const handleDeleteRun = async (e: React.MouseEvent, runId: string) => {
    e.stopPropagation()
    await deleteRun(workflowId, runId)
    onRunsChanged()
  }

  const handleClearAll = async () => {
    if (!confirm('Delete all run history and clear agent memory for this workflow?')) return
    await clearAllRuns(workflowId)
    onRunsChanged()
  }

  return (
    <div>
      {runs.length > 0 && (
        <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleClearAll}
            style={{
              ...MONO, fontSize: 10, padding: '2px 8px',
              background: 'none', border: '1px solid #EF4444',
              color: '#EF4444', borderRadius: 4, cursor: 'pointer',
            }}
          >
            Clear all + memory
          </button>
        </div>
      )}
      {runs.length === 0 && (
        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
          No runs yet
        </div>
      )}
      {runs.map(run => (
        <div
          key={run.run_id}
          onClick={() => onSelectRun(run)}
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--border)',
            cursor: 'pointer',
            background: selectedRunId === run.run_id ? 'var(--bg-page)' : 'transparent',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color: statusColor(run.status) }}>
              {statusIcon(run.status)}
            </span>
            <Chip label={run.execution_mode} color={statusColor(run.status)} />
            <button
              onClick={e => handleDeleteRun(e, run.run_id)}
              title="Delete this run"
              style={{
                marginLeft: 'auto', background: 'none', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14,
                lineHeight: 1, padding: '0 2px',
              }}
            >×</button>
          </div>
          <div style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)' }}>
            {fmt(run.started_at)} · {run.total_input_tokens + run.total_output_tokens} tok
          </div>
          {run.initial_input && (
            <div style={{
              fontSize: 11, color: 'var(--text-body)', marginTop: 3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {run.initial_input.slice(0, 60)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── triggers panel ───────────────────────────────────────────────────────────

interface TriggersPanelProps {
  workflowId: string
  onClose: () => void
}

function TriggersPanel({ workflowId, onClose }: TriggersPanelProps) {
  const [schedules, setSchedules] = useState<ScheduleTrigger[]>([])
  const [webhooks, setWebhooks] = useState<WebhookTrigger[]>([])
  const [loadingTriggers, setLoadingTriggers] = useState(true)
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  const [newCronExpr, setNewCronExpr] = useState('')
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    setLoadingTriggers(true)
    Promise.all([
      listSchedules(workflowId).catch(() => [] as ScheduleTrigger[]),
      listWebhooks(workflowId).catch(() => [] as WebhookTrigger[]),
    ]).then(([s, w]) => {
      setSchedules(s)
      setWebhooks(w)
    }).finally(() => setLoadingTriggers(false))
  }, [workflowId])

  const handleAddSchedule = async () => {
    if (!newCronExpr.trim()) return
    setSavingSchedule(true)
    try {
      const s = await createSchedule(workflowId, newCronExpr.trim())
      setSchedules(prev => [...prev, s])
      setNewCronExpr('')
      setShowAddSchedule(false)
    } catch { /* ignore */ } finally { setSavingSchedule(false) }
  }

  const handleDeleteSchedule = async (triggerId: string) => {
    await deleteSchedule(triggerId).catch(() => {})
    setSchedules(prev => prev.filter(s => s.trigger_id !== triggerId))
  }

  const handleAddWebhook = async () => {
    setSavingWebhook(true)
    try {
      const w = await createWebhook(workflowId)
      setWebhooks(prev => [...prev, w])
    } catch { /* ignore */ } finally { setSavingWebhook(false) }
  }

  const handleDeleteWebhook = async (webhookId: string) => {
    await deleteWebhook(webhookId).catch(() => {})
    setWebhooks(prev => prev.filter(w => w.webhook_id !== webhookId))
  }

  const webhookUrl = (id: string) =>
    `http://localhost:8000/triggers/webhooks/${encodeURIComponent(id)}/trigger`

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    }).catch(() => {})
  }

  return (
    <div style={{
      position: 'absolute', top: 44, right: 0, zIndex: 50,
      width: 360, background: 'var(--bg-card)',
      border: '1px solid var(--border)', borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-page)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-heading)', ...MONO }}>
          Triggers
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}
        >×</button>
      </div>

      <div style={{ maxHeight: 460, overflow: 'auto' }}>
        {loadingTriggers ? (
          <div style={{ padding: 14, color: 'var(--text-muted)', fontSize: 12 }}>Loading…</div>
        ) : (
          <>
            {/* Schedules section */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <span style={{ ...MONO, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Schedules
                </span>
                <button
                  onClick={() => setShowAddSchedule(!showAddSchedule)}
                  style={{
                    ...MONO, fontSize: 10, padding: '2px 8px',
                    background: '#1D5FFA22', border: '1px solid #1D5FFA44',
                    color: '#1D5FFA', borderRadius: 4, cursor: 'pointer',
                  }}
                >+ Add schedule</button>
              </div>

              {schedules.length === 0 && !showAddSchedule && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No schedules yet</div>
              )}

              {schedules.map(s => (
                <div key={s.trigger_id} style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
                  background: 'var(--bg-page)', borderRadius: 5, padding: '5px 8px',
                  border: '1px solid var(--border)',
                }}>
                  <span style={{ ...MONO, fontSize: 11, color: 'var(--text-body)', flex: 1 }}>{s.cron_expr}</span>
                  <span style={{
                    ...MONO, fontSize: 9, padding: '1px 5px', borderRadius: 3,
                    background: s.enabled ? '#10B98120' : '#6B728020',
                    color: s.enabled ? '#10B981' : '#6B7280',
                    border: `1px solid ${s.enabled ? '#10B98140' : '#6B728040'}`,
                  }}>{s.enabled ? 'on' : 'off'}</span>
                  {s.last_run_at && (
                    <span style={{ ...MONO, fontSize: 9, color: 'var(--text-muted)' }}>
                      {fmt(s.last_run_at)}
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteSchedule(s.trigger_id)}
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 12, padding: '0 2px' }}
                  >×</button>
                </div>
              ))}

              {showAddSchedule && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <input
                    value={newCronExpr}
                    onChange={e => setNewCronExpr(e.target.value)}
                    placeholder="0 9 * * 1-5"
                    style={{
                      flex: 1, ...MONO, fontSize: 11, padding: '4px 8px',
                      background: 'var(--bg-page)', color: 'var(--text-body)',
                      border: '1px solid var(--border)', borderRadius: 5,
                    }}
                  />
                  <button
                    onClick={handleAddSchedule}
                    disabled={savingSchedule || !newCronExpr.trim()}
                    style={{
                      ...MONO, fontSize: 10, padding: '4px 10px',
                      background: '#1D5FFA', color: '#fff', border: 'none',
                      borderRadius: 5, cursor: 'pointer', opacity: savingSchedule ? 0.6 : 1,
                    }}
                  >{savingSchedule ? '…' : 'Add'}</button>
                  <button
                    onClick={() => { setShowAddSchedule(false); setNewCronExpr('') }}
                    style={{
                      ...MONO, fontSize: 10, padding: '4px 8px',
                      background: 'var(--bg-page)', color: 'var(--text-muted)',
                      border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer',
                    }}
                  >Cancel</button>
                </div>
              )}
            </div>

            {/* Webhooks section */}
            <div style={{ padding: '10px 14px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <span style={{ ...MONO, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Webhooks
                </span>
                <button
                  onClick={handleAddWebhook}
                  disabled={savingWebhook}
                  style={{
                    ...MONO, fontSize: 10, padding: '2px 8px',
                    background: '#7C3AED22', border: '1px solid #7C3AED44',
                    color: '#7C3AED', borderRadius: 4, cursor: 'pointer',
                    opacity: savingWebhook ? 0.6 : 1,
                  }}
                >{savingWebhook ? '…' : '+ Add webhook'}</button>
              </div>

              {webhooks.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No webhooks yet</div>
              )}

              {webhooks.map(w => {
                const url = webhookUrl(w.webhook_id)
                return (
                  <div key={w.webhook_id} style={{
                    marginBottom: 6,
                    background: 'var(--bg-page)', borderRadius: 5, padding: '7px 8px',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{
                        ...MONO, fontSize: 9, padding: '1px 5px', borderRadius: 3,
                        background: w.enabled ? '#10B98120' : '#6B728020',
                        color: w.enabled ? '#10B981' : '#6B7280',
                        border: `1px solid ${w.enabled ? '#10B98140' : '#6B728040'}`,
                      }}>{w.enabled ? 'on' : 'off'}</span>
                      {w.last_triggered_at && (
                        <span style={{ ...MONO, fontSize: 9, color: 'var(--text-muted)' }}>
                          last: {fmt(w.last_triggered_at)}
                        </span>
                      )}
                      <div style={{ flex: 1 }} />
                      <button
                        onClick={() => handleDeleteWebhook(w.webhook_id)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 12, padding: '0 2px' }}
                      >×</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        ...MONO, fontSize: 9, color: 'var(--text-muted)', flex: 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{url}</span>
                      <button
                        onClick={() => copyToClipboard(url, w.webhook_id)}
                        style={{
                          ...MONO, fontSize: 9, padding: '2px 7px', flexShrink: 0,
                          background: copiedId === w.webhook_id ? '#10B98122' : 'var(--bg-card)',
                          border: `1px solid ${copiedId === w.webhook_id ? '#10B98144' : 'var(--border)'}`,
                          color: copiedId === w.webhook_id ? '#10B981' : 'var(--text-muted)',
                          borderRadius: 4, cursor: 'pointer',
                        }}
                      >{copiedId === w.webhook_id ? 'Copied' : 'Copy'}</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([])
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [selected, setSelected] = useState<WorkflowRecord | null>(null)
  const [loading, setLoading] = useState(true)

  // Canvas state
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [edges, setEdges] = useState<WorkflowEdge[]>([])
  const [execMode, setExecMode] = useState<ExecutionMode>('sequential')
  const [wfName, setWfName] = useState('')
  const [wfDesc, setWfDesc] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Drag state
  const dragging = useRef<{
    nodeId: string; startMX: number; startMY: number
    startNX: number; startNY: number
  } | null>(null)

  // Run state
  const [initialInput, setInitialInput] = useState('')
  const [expandPage, setExpandPage] = useState<{ field: 'wfDesc' | 'initialInput'; label: string } | null>(null)
  const [expandPageValue, setExpandPageValue] = useState('')
  const [loopIterations, setLoopIterations] = useState(3)
  const [enableMemory, setEnableMemory] = useState(false)
  const [convergenceExpr, setConvergenceExpr] = useState('')
  const [running, setRunning] = useState(false)
  const [currentRun, setCurrentRun] = useState<WorkflowRun | null>(null)
  const [runError, setRunError] = useState('')

  // History
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [selectedHistoryRun, setSelectedHistoryRun] = useState<WorkflowRun | null>(null)

  // Run panel resize
  const [runPanelH, setRunPanelH] = useState(420)
  const runPanelMinH = 36
  const resizeDragRef = useRef<{ startY: number; startH: number } | null>(null)

  // Triggers panel
  const [showTriggersPanel, setShowTriggersPanel] = useState(false)
  const triggersRef = useRef<HTMLDivElement>(null)

  const canvasRef = useRef<HTMLDivElement>(null)

  // Run panel drag-resize
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizeDragRef.current) return
      const dy = resizeDragRef.current.startY - e.clientY
      setRunPanelH(Math.max(runPanelMinH, Math.min(700, resizeDragRef.current.startH + dy)))
    }
    const onUp = () => { resizeDragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // Close triggers panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (triggersRef.current && !triggersRef.current.contains(e.target as Node)) {
        setShowTriggersPanel(false)
      }
    }
    if (showTriggersPanel) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showTriggersPanel])

  // Load on mount
  useEffect(() => {
    Promise.all([listWorkflows(), listAgents()])
      .then(([wfs, ags]) => {
        setWorkflows(wfs)
        setAgents(ags)
        if (wfs.length > 0) loadWorkflow(wfs[0])
      })
      .catch(_err => {})
      .finally(() => setLoading(false))
  }, [])

  const loadWorkflow = (wf: WorkflowRecord) => {
    setSelected(wf)
    setWfName(wf.name)
    setWfDesc(wf.description || '')
    setExecMode(wf.execution_mode || 'sequential')
    setLoopIterations(wf.loop_iterations || 3)
    setEnableMemory(wf.enable_memory || false)
    setConvergenceExpr(wf.convergence_expr || '')
    setShowTriggersPanel(false)
    // DAG nodes take precedence; convert legacy steps otherwise
    if (wf.nodes && wf.nodes.length > 0) {
      setNodes(wf.nodes)
      setEdges(wf.edges || [])
    } else {
      const synth: WorkflowNode[] = (wf.steps || []).map((s, i) => ({
        node_id: s.step_id,
        node_type: 'agent',
        label: s.label || '',
        agent_id: s.agent_id,
        position_x: 40 + i * 240,
        position_y: 120,
        config: {},
      }))
      setNodes(synth)
      // Auto-create sequential edges
      const synthEdges: WorkflowEdge[] = synth.slice(0, -1).map((n, i) => ({
        edge_id: newId('e'),
        from_node_id: n.node_id,
        to_node_id: synth[i + 1].node_id,
        label: '', condition_expr: '',
      }))
      setEdges(synthEdges)
    }
    setCurrentRun(null)
    setRunError('')
    listRuns(wf.workflow_id).then(setRuns).catch(() => setRuns([]))
  }

  // ── canvas mouse events ──────────────────────────────────────────────────

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const dx = e.clientX - dragging.current.startMX
    const dy = e.clientY - dragging.current.startMY
    const newX = Math.max(0, dragging.current.startNX + dx)
    const newY = Math.max(0, dragging.current.startNY + dy)
    setNodes(prev =>
      prev.map(n =>
        n.node_id === dragging.current!.nodeId
          ? { ...n, position_x: newX, position_y: newY }
          : n
      )
    )
  }, [])

  const handleCanvasMouseUp = useCallback(() => {
    dragging.current = null
  }, [])

  const startDrag = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.preventDefault()
    const node = nodes.find(n => n.node_id === nodeId)
    if (!node) return
    dragging.current = {
      nodeId,
      startMX: e.clientX, startMY: e.clientY,
      startNX: node.position_x, startNY: node.position_y,
    }
  }, [nodes])

  // ── add / delete nodes ───────────────────────────────────────────────────

  const addNode = (type: string = 'agent') => {
    const col = nodes.length % 4
    const row = Math.floor(nodes.length / 4)
    const newNode: WorkflowNode = {
      node_id: newId('nd'),
      node_type: type as any,
      label: type === 'orchestrator' ? 'Coordinator' : 'Agent Node',
      agent_id: null,
      position_x: 40 + col * 240,
      position_y: 40 + row * 140,
      config: {},
    }
    setNodes(prev => [...prev, newNode])
  }

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.node_id !== nodeId))
    setEdges(prev => prev.filter(e => e.from_node_id !== nodeId && e.to_node_id !== nodeId))
    if (connectingFrom === nodeId) setConnectingFrom(null)
  }

  const updateNodeField = (nodeId: string, agent_id: string, label: string, type: string) => {
    setNodes(prev => prev.map(n =>
      n.node_id === nodeId ? { ...n, agent_id: agent_id || null, label, node_type: type as any } : n
    ))
  }

  const updateNodeConfig = (nodeId: string, config: Record<string, unknown>) => {
    setNodes(prev => prev.map(n =>
      n.node_id === nodeId ? { ...n, config } : n
    ))
  }

  // ── connect ──────────────────────────────────────────────────────────────

  const startConnect = (nodeId: string) => {
    if (connectingFrom === nodeId) { setConnectingFrom(null); return }
    setConnectingFrom(nodeId)
  }

  const completeConnect = (toNodeId: string) => {
    if (!connectingFrom || connectingFrom === toNodeId) {
      setConnectingFrom(null); return
    }
    const alreadyExists = edges.some(
      e => e.from_node_id === connectingFrom && e.to_node_id === toNodeId
    )
    if (!alreadyExists) {
      setEdges(prev => [...prev, {
        edge_id: newId('e'),
        from_node_id: connectingFrom,
        to_node_id: toNodeId,
        label: '', condition_expr: '',
      }])
    }
    setConnectingFrom(null)
  }

  const deleteEdge = (edgeId: string) => {
    setEdges(prev => prev.filter(e => e.edge_id !== edgeId))
  }

  // ── auto-layout ──────────────────────────────────────────────────────────

  const autoLayout = () => {
    if (execMode === 'sequential') {
      setNodes(prev => prev.map((n, i) => ({ ...n, position_x: 40 + i * 240, position_y: 120 })))
      setEdges(() => {
        const sorted = [...nodes]
        const newEdges: WorkflowEdge[] = sorted.slice(0, -1).map((n, i) => ({
          edge_id: newId('e'),
          from_node_id: n.node_id,
          to_node_id: sorted[i + 1].node_id,
          label: '', condition_expr: '',
        }))
        return newEdges
      })
    } else if (execMode === 'collaborative') {
      // Sequential left-to-right per round — wire nodes in order
      setNodes(prev => prev.map((n, i) => ({ ...n, position_x: 40 + i * 240, position_y: 120 })))
      setEdges(() => {
        const sorted = [...nodes]
        return sorted.slice(0, -1).map((n, i) => ({
          edge_id: newId('e'),
          from_node_id: n.node_id,
          to_node_id: sorted[i + 1].node_id,
          label: '', condition_expr: '',
        }))
      })
    } else if (execMode === 'parallel' || execMode === 'hybrid') {
      setNodes(prev => prev.map((n, i) => ({
        ...n, position_x: 40 + i * 240, position_y: 120,
      })))
      setEdges([])
    } else if (execMode === 'hierarchical') {
      // Orchestrator centered above specialists
      setNodes(prev => {
        const [orch, ...specs] = prev
        const orchX = specs.length > 0 ? 40 + ((specs.length - 1) * 240) / 2 : 40
        const layouted = [
          { ...orch, node_type: 'orchestrator' as any, position_x: orchX, position_y: 30 },
          ...specs.map((s, i) => ({ ...s, position_x: 40 + i * 240, position_y: 260 })),
        ]
        return layouted
      })
      setEdges([])
    }
  }

  // ── save ─────────────────────────────────────────────────────────────────

  const saveWorkflow = async () => {
    setSaving(true); setSaveMsg('')
    try {
      const body = {
        name: wfName || 'Untitled Workflow',
        description: wfDesc,
        execution_mode: execMode,
        nodes, edges, steps: [],
        enable_memory: enableMemory,
        convergence_expr: convergenceExpr,
        ...(execMode === 'collaborative' ? { loop_iterations: loopIterations } : {}),
      }
      let wf: WorkflowRecord
      if (selected) {
        wf = await updateWorkflow(selected.workflow_id, body)
      } else {
        wf = await createWorkflow(body)
      }
      setSelected(wf)
      setWorkflows(prev => {
        const idx = prev.findIndex(w => w.workflow_id === wf.workflow_id)
        return idx >= 0 ? prev.map((w, i) => i === idx ? wf : w) : [wf, ...prev]
      })
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(''), 2000)
    } catch (e) {
      setSaveMsg(`Error: ${e}`)
    } finally {
      setSaving(false)
    }
  }

  // ── new workflow ──────────────────────────────────────────────────────────

  const newWorkflow = () => {
    setSelected(null)
    setWfName('New Workflow')
    setWfDesc('')
    setExecMode('sequential')
    setLoopIterations(3)
    setEnableMemory(false)
    setConvergenceExpr('')
    setNodes([])
    setEdges([])
    setCurrentRun(null)
    setRuns([])
    setShowTriggersPanel(false)
  }

  // ── delete workflow ───────────────────────────────────────────────────────

  const doDeleteWorkflow = async (wfId: string) => {
    if (!confirm('Delete this workflow and all its run history?')) return
    await deleteWorkflow(wfId)
    const remaining = workflows.filter(w => w.workflow_id !== wfId)
    setWorkflows(remaining)
    if (selected?.workflow_id === wfId) {
      if (remaining.length > 0) loadWorkflow(remaining[0])
      else newWorkflow()
    }
  }

  // ── run ───────────────────────────────────────────────────────────────────

  const pollRunRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pollRun = useCallback((workflowId: string, run: WorkflowRun) => {
    pollRunRef.current = setTimeout(async () => {
      try {
        const updated = await getRun(workflowId, run.run_id)
        setCurrentRun(updated)
        setRuns(prev => prev.map(r => r.run_id === updated.run_id ? updated : r))
        if (updated.status === 'running' || updated.status === 'awaiting_checkpoint') {
          if (updated.status === 'running') setRunning(true)
          else setRunning(false)  // allow user to interact with HITL panel
          pollRun(workflowId, updated)
        } else {
          setRunning(false)
          listRuns(workflowId).then(setRuns).catch(() => {})
        }
      } catch {
        setRunning(false)
      }
    }, 2000)
  }, [])

  const doRun = async () => {
    if (!selected) { alert('Save the workflow first.'); return }
    if (!initialInput.trim()) { alert('Enter an initial prompt.'); return }
    if (pollRunRef.current) clearTimeout(pollRunRef.current)
    setRunning(true); setRunError(''); setCurrentRun(null)
    try {
      const run = await runWorkflow(selected.workflow_id, initialInput, '')
      setCurrentRun(run)
      setRuns(prev => [run, ...prev])
      // Server returns immediately (202); start polling for completion
      pollRun(selected.workflow_id, run)
    } catch (e: any) {
      setRunError(e.message || String(e))
      setRunning(false)
    }
  }

  // ── edge SVG paths ────────────────────────────────────────────────────────

  const nodeMap = Object.fromEntries(nodes.map(n => [n.node_id, n]))

  const edgePaths = edges.map(edge => {
    const from = nodeMap[edge.from_node_id]
    const to = nodeMap[edge.to_node_id]
    if (!from || !to) return null
    const x1 = from.position_x + NODE_W
    const y1 = from.position_y + NODE_H / 2
    const x2 = to.position_x
    const y2 = to.position_y + NODE_H / 2
    const cx = (x1 + x2) / 2
    const d = `M ${x1} ${y1} C ${cx} ${y1} ${cx} ${y2} ${x2} ${y2}`
    return { edge, d, midX: cx, midY: (y1 + y2) / 2 }
  }).filter(Boolean) as { edge: WorkflowEdge; d: string; midX: number; midY: number }[]

  // canvas dimensions
  const canvasW = Math.max(900, ...nodes.map(n => n.position_x + NODE_W + 60))
  const canvasH = Math.max(400, ...nodes.map(n => n.position_y + NODE_H + 80))

  // node results map
  const nodeResultMap: Record<string, NodeRunResult> = {}
  const activeRun = currentRun || selectedHistoryRun
  if (activeRun) {
    // For each node, keep the result with the latest started_at (handles multi-round collaborative)
    activeRun.node_results.forEach(nr => {
      const existing = nodeResultMap[nr.node_id]
      if (!existing || (nr.started_at ?? '') > (existing.started_at ?? '')) {
        nodeResultMap[nr.node_id] = nr
      }
    })
  }

  // all mode keys in display order
  const allModes: ExecutionMode[] = ['sequential', 'parallel', 'hierarchical', 'hybrid', 'collaborative', 'event_driven']
  const modeIcons: Record<ExecutionMode, string> = {
    sequential: '→',
    parallel: '⇉',
    hierarchical: '⟐',
    hybrid: '⊕',
    collaborative: '↻',
    event_driven: '⚡',
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* ── Left panel ── */}
      <div style={{
        width: 220, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-card)',
      }}>
        <div style={{
          padding: '14px 14px 8px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-heading)' }}>Workflows</span>
          <button
            onClick={newWorkflow}
            style={{
              ...MONO, fontSize: 11, padding: '3px 8px',
              background: '#1D5FFA22', border: '1px solid #1D5FFA44',
              color: '#1D5FFA', borderRadius: 5, cursor: 'pointer',
            }}
          >+ New</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading && (
            <div style={{ padding: 14, color: 'var(--text-muted)', fontSize: 12 }}>Loading…</div>
          )}
          {workflows.map(wf => (
            <div
              key={wf.workflow_id}
              onClick={() => loadWorkflow(wf)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                background: selected?.workflow_id === wf.workflow_id ? 'var(--bg-page)' : 'transparent',
                borderBottom: '1px solid var(--border)',
                borderLeft: selected?.workflow_id === wf.workflow_id ? '3px solid #1D5FFA' : '3px solid transparent',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 3 }}>
                {wf.name}
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <Chip label={wf.execution_mode} />
                <span style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)' }}>
                  {wf.nodes?.length || wf.steps?.length || 0} nodes
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Run history in left panel */}
        {selected && (
          <div style={{ borderTop: '1px solid var(--border)', maxHeight: 220, overflow: 'auto' }}>
            <div style={{
              padding: '8px 14px', fontSize: 11, fontWeight: 700,
              color: 'var(--text-muted)', ...MONO, letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>Run History</div>
            <RunHistoryPanel
              runs={runs}
              onSelectRun={r => {
                setSelectedHistoryRun(r)
                setCurrentRun(null)
                setInitialInput(r.initial_input)
                setRunPanelH(420)
              }}
              selectedRunId={selectedHistoryRun?.run_id}
              workflowId={selected?.workflow_id ?? ''}
              onRunsChanged={() => {
                setRuns([])
                setSelectedHistoryRun(null)
                setCurrentRun(null)
                setInitialInput('')
                if (selected) listRuns(selected.workflow_id).then(setRuns)
              }}
            />
          </div>
        )}
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{
          padding: '10px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          background: 'var(--bg-card)',
          flexShrink: 0,
        }}>
          <input
            value={wfName}
            onChange={e => setWfName(e.target.value)}
            placeholder="Workflow name"
            style={{
              fontSize: 15, fontWeight: 700, color: 'var(--text-heading)',
              background: 'transparent', border: 'none', outline: 'none',
              minWidth: 160,
            }}
          />
          <span style={{ color: 'var(--border)', fontSize: 16 }}>|</span>
          <input
            value={wfDesc}
            onChange={e => setWfDesc(e.target.value)}
            placeholder="Description (optional)"
            style={{
              fontSize: 12, color: 'var(--text-muted)',
              background: 'transparent', border: 'none', outline: 'none',
              minWidth: 200, flex: 1,
            }}
          />
          <button
            onClick={() => { setExpandPageValue(wfDesc); setExpandPage({ field: 'wfDesc', label: 'Workflow Description' }) }}
            title="Edit in full view"
            style={{
              ...MONO, fontSize: 10, padding: '2px 6px', flexShrink: 0,
              background: 'var(--bg-page)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', borderRadius: 4, cursor: 'pointer',
            }}
          >↗</button>

          <select
            value={execMode}
            onChange={e => setExecMode(e.target.value as ExecutionMode)}
            style={{
              ...MONO, fontSize: 11, padding: '4px 8px',
              background: 'var(--bg-page)', color: 'var(--text-body)',
              border: '1px solid var(--border)', borderRadius: 5,
            }}
          >
            {(Object.entries(MODE_LABELS) as [ExecutionMode, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <button onClick={autoLayout} style={toolBtn}>Auto Layout</button>
          <button onClick={() => addNode('agent')} style={{ ...toolBtn, color: '#1D5FFA' }}>
            + Agent Node
          </button>
          {execMode === 'hierarchical' && (
            <button onClick={() => addNode('orchestrator')} style={{ ...toolBtn, color: '#7C3AED' }}>
              + Coordinator
            </button>
          )}
          {execMode === 'hybrid' && (
            <button onClick={() => addNode('fan_out')} style={{ ...toolBtn, color: '#F59E0B' }}>
              + Fan-out
            </button>
          )}
          {execMode === 'hybrid' && (
            <button onClick={() => addNode('loop')} style={{ ...toolBtn, color: '#06B6D4' }}>
              + Loop
            </button>
          )}
          {execMode === 'hybrid' && (
            <button onClick={() => addNode('switch')} style={{ ...toolBtn, color: '#F97316' }}>
              + Switch
            </button>
          )}

          {connectingFrom && (
            <span style={{
              ...MONO, fontSize: 11, color: '#F59E0B',
              padding: '4px 10px', background: '#F59E0B20',
              border: '1px solid #F59E0B40', borderRadius: 5,
            }}>
              Click target node — Esc to cancel
            </span>
          )}

          <div style={{ flex: 1 }} />

          {selected && (
            <button
              onClick={() => doDeleteWorkflow(selected.workflow_id)}
              style={{ ...toolBtn, color: '#EF4444' }}
            >Delete</button>
          )}

          <button
            onClick={saveWorkflow}
            disabled={saving}
            style={{
              ...MONO, fontSize: 11, padding: '4px 14px',
              background: '#1D5FFA', color: '#fff',
              border: 'none', borderRadius: 5, cursor: 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>

          {/* Triggers button */}
          <div ref={triggersRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowTriggersPanel(!showTriggersPanel)}
              disabled={!selected}
              style={{
                ...MONO, fontSize: 11, padding: '4px 12px',
                background: showTriggersPanel ? '#7C3AED22' : 'var(--bg-page)',
                color: showTriggersPanel ? '#7C3AED' : 'var(--text-body)',
                border: `1px solid ${showTriggersPanel ? '#7C3AED44' : 'var(--border)'}`,
                borderRadius: 5, cursor: selected ? 'pointer' : 'default',
                opacity: selected ? 1 : 0.5,
              }}
            >
              ⚡ Triggers
            </button>

            {showTriggersPanel && selected && (
              <TriggersPanel
                workflowId={selected.workflow_id}
                onClose={() => setShowTriggersPanel(false)}
              />
            )}
          </div>

          {saveMsg && (
            <span style={{ ...MONO, fontSize: 11, color: '#10B981' }}>{saveMsg}</span>
          )}
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'auto', position: 'relative', minHeight: 0 }}>
          <div
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onKeyDown={e => { if (e.key === 'Escape') setConnectingFrom(null) }}
            tabIndex={0}
            style={{
              position: 'relative',
              width: canvasW, height: canvasH,
              background: 'var(--bg-page)',
              backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              cursor: connectingFrom ? 'crosshair' : 'default',
            }}
          >
            {/* SVG edge layer */}
            <svg
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
              width={canvasW} height={canvasH}
            >
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#1D5FFA88" />
                </marker>
              </defs>
              {edgePaths.map(({ edge, d, midX, midY }) => (
                <g key={edge.edge_id}>
                  <path
                    d={d} fill="none" stroke="#1D5FFA66" strokeWidth={2}
                    markerEnd="url(#arrow)"
                  />
                  {/* Delete edge hit area */}
                  <circle
                    cx={midX} cy={midY} r={7}
                    fill="var(--bg-card)" stroke="var(--border)" strokeWidth={1}
                    style={{ cursor: 'pointer', pointerEvents: 'all' }}
                    onClick={() => deleteEdge(edge.edge_id)}
                  />
                  <text x={midX} y={midY + 4} textAnchor="middle"
                    fontSize={10} fill="#EF4444" style={{ pointerEvents: 'all', cursor: 'pointer' }}
                    onClick={() => deleteEdge(edge.edge_id)}>×</text>
                </g>
              ))}
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
                onSelect={() => setSelectedNodeId(node.node_id)}
                onDragStart={e => startDrag(node.node_id, e)}
                onStartConnect={() => startConnect(node.node_id)}
                onCompleteConnect={() => completeConnect(node.node_id)}
                onAgentChange={(agentId, label, type) =>
                  updateNodeField(node.node_id, agentId, label, type)
                }
                onConfigChange={config => updateNodeConfig(node.node_id, config)}
                onDelete={() => deleteNode(node.node_id)}
              />
            ))}

            {/* Empty state */}
            {nodes.length === 0 && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center', color: 'var(--text-muted)',
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                  No nodes yet
                </div>
                <div style={{ fontSize: 12, marginBottom: 14 }}>
                  Add agent nodes and connect them to build your workflow
                </div>
                <button onClick={() => addNode('agent')} style={{
                  ...MONO, fontSize: 12, padding: '8px 18px',
                  background: '#1D5FFA', color: '#fff',
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                }}>+ Add First Node</button>
              </div>
            )}
          </div>
        </div>

        {/* Run panel */}
        <div style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-card)',
          flexShrink: 0,
        }}>
          <div style={{
            padding: '12px 20px',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <input
              value={initialInput}
              onChange={e => setInitialInput(e.target.value)}
              placeholder="Initial prompt / input for the workflow…"
              style={{
                flex: 1, minWidth: 200, fontSize: 13,
                padding: '7px 12px',
                background: 'var(--bg-page)', color: 'var(--text-body)',
                border: '1px solid var(--border)', borderRadius: 6,
              }}
            />
            <button
              onClick={() => { setExpandPageValue(initialInput); setExpandPage({ field: 'initialInput', label: 'Initial Prompt' }) }}
              title="Edit in full view"
              style={{
                ...MONO, fontSize: 11, padding: '6px 10px', flexShrink: 0,
                background: 'var(--bg-page)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', borderRadius: 6, cursor: 'pointer',
              }}
            >↗</button>

            {/* Collaborative iterations pill selector */}
            {execMode === 'collaborative' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)' }}>Max rounds:</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setLoopIterations(n)}
                        style={{
                          ...MONO, fontSize: 11, width: 26, height: 26,
                          background: loopIterations === n ? '#14b8a6' : 'var(--bg-page)',
                          color: loopIterations === n ? '#fff' : 'var(--text-muted)',
                          border: `1px solid ${loopIterations === n ? '#14b8a6' : 'var(--border)'}`,
                          borderRadius: 4, cursor: 'pointer', fontWeight: loopIterations === n ? 700 : 400,
                        }}
                      >{n}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Stop when:</span>
                  <select
                    value={['', 'nonempty'].includes(convergenceExpr) || convergenceExpr.startsWith('contains:') || convergenceExpr.startsWith('startswith:') || convergenceExpr.startsWith('endswith:') || convergenceExpr.startsWith('equals:') || convergenceExpr.startsWith('regex:') ? '' : ''}
                    onChange={e => { if (e.target.value) setConvergenceExpr(e.target.value) }}
                    style={{
                      ...MONO, fontSize: 10, padding: '3px 4px',
                      background: 'var(--bg-page)', color: 'var(--text-muted)',
                      border: '1px solid var(--border)', borderRadius: 4,
                    }}
                  >
                    <option value="">— pick preset —</option>
                    <option value="nonempty">nonempty — any output stops the loop</option>
                    <option value="contains:APPROVED">contains:APPROVED</option>
                    <option value="contains:LGTM">contains:LGTM</option>
                    <option value="contains:DONE">contains:DONE</option>
                    <option value="contains:PASS">contains:PASS</option>
                    <option value="contains:score:9">contains:score:9 — score 9+</option>
                    <option value="regex:verdict:\s*yes">regex:verdict:\s*yes</option>
                  </select>
                  <input
                    value={convergenceExpr}
                    onChange={e => setConvergenceExpr(e.target.value)}
                    placeholder="or type: contains:X  startswith:X  equals:X  regex:X  nonempty"
                    style={{
                      ...MONO, fontSize: 10, padding: '3px 7px', width: 260,
                      background: 'var(--bg-page)', color: 'var(--text-body)',
                      border: `1px solid ${convergenceExpr ? TEAL : 'var(--border)'}`,
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={doRun}
              disabled={running || !selected}
              style={{
                ...MONO, fontSize: 12, padding: '7px 20px',
                background: running ? '#10B98144' : '#1D5FFA',
                color: '#fff', border: 'none', borderRadius: 6,
                cursor: running ? 'wait' : 'pointer',
                opacity: running || !selected ? 0.7 : 1,
              }}
            >
              {running ? '⟳ Running…' : '▶ Run'}
            </button>
            {runError && (
              <span style={{ ...MONO, fontSize: 11, color: '#EF4444' }}>{runError}</span>
            )}
          </div>

          {/* Mode tabs + notes */}
          <div style={{ padding: '0 20px 10px' }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {allModes.map(m => (
                <div key={m} style={{
                  ...MONO, fontSize: 10,
                  color: execMode === m ? '#1D5FFA' : 'var(--text-muted)',
                  cursor: 'pointer', padding: '3px 0',
                  borderBottom: execMode === m ? '2px solid #1D5FFA' : '2px solid transparent',
                }} onClick={() => setExecMode(m)}>
                  {modeIcons[m]} {m.charAt(0).toUpperCase() + m.slice(1)}
                </div>
              ))}
              <span style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {nodes.filter(n => n.agent_id).length}/{nodes.length} nodes assigned
              </span>
            </div>

            {/* Collaborative mode note */}
            {execMode === 'collaborative' && (
              <div style={{
                marginTop: 6, ...MONO, fontSize: 10,
                color: TEAL,
                padding: '3px 8px',
                background: `${TEAL}12`,
                border: `1px solid ${TEAL}30`,
                borderRadius: 4, display: 'inline-block',
              }}>
                Review loop — up to {loopIterations} round{loopIterations !== 1 ? 's' : ''}
                {convergenceExpr ? ` · stops when: ${convergenceExpr}` : ' · runs all rounds'}
              </div>
            )}

            {/* Hybrid mode note */}
            {execMode === 'hybrid' && (
              <div style={{
                marginTop: 6, ...MONO, fontSize: 10,
                color: '#F59E0B',
                padding: '3px 8px',
                background: '#F59E0B12',
                border: '1px solid #F59E0B30',
                borderRadius: 4, display: 'inline-block',
              }}>
                Nodes sharing the same parallel group name will fan-out together
              </div>
            )}

            {/* Persistent memory toggle */}
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setEnableMemory(v => !v)}
                style={{
                  ...MONO, fontSize: 10,
                  padding: '3px 10px',
                  background: enableMemory ? '#7C3AED22' : 'var(--bg-page)',
                  color: enableMemory ? '#7C3AED' : 'var(--text-muted)',
                  border: `1px solid ${enableMemory ? '#7C3AED66' : 'var(--border)'}`,
                  borderRadius: 4, cursor: 'pointer',
                  fontWeight: enableMemory ? 700 : 400,
                }}
              >
                {enableMemory ? '🧠 Memory: ON' : '○ Memory: OFF'}
              </button>
              {enableMemory && (
                <span style={{ ...MONO, fontSize: 10, color: '#7C3AED99' }}>
                  Agents summarize each run and remember it next time
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Results — drag-resizable panel */}
        {(currentRun || selectedHistoryRun) && (
          <div style={{ flexShrink: 0, position: 'relative' }}>
            {/* Drag handle */}
            <div
              onMouseDown={e => {
                resizeDragRef.current = { startY: e.clientY, startH: runPanelH }
                e.preventDefault()
              }}
              title="Drag to resize · drag down to minimise"
              style={{
                height: 6, cursor: 'ns-resize', background: 'var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{ width: 32, height: 3, borderRadius: 2, background: 'var(--text-muted)', opacity: 0.4 }} />
            </div>
            {/* Panel body — height controlled by drag */}
            <div style={{ height: runPanelH, overflow: 'hidden' }}>
              {runPanelH <= runPanelMinH ? (
                /* Minimised bar */
                <div style={{
                  height: '100%', display: 'flex', alignItems: 'center',
                  padding: '0 16px', gap: 10,
                  background: 'var(--bg-card)', borderTop: '1px solid var(--border)',
                  cursor: 'pointer',
                }} onClick={() => setRunPanelH(420)}>
                  <span style={{ ...MONO, fontSize: 11, color: 'var(--text-muted)' }}>
                    Run result — {(currentRun || selectedHistoryRun)!.status}
                  </span>
                  <span style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>▲ expand</span>
                </div>
              ) : (
                <RunResultPanel
                  run={(currentRun || selectedHistoryRun)!}
                  workflowId={selected?.workflow_id ?? ''}
                  onClose={() => {
                    setCurrentRun(null)
                    setSelectedHistoryRun(null)
                    setInitialInput('')
                  }}
                  onResumed={updated => {
                    setCurrentRun(updated)
                    setRuns(prev => prev.map(r => r.run_id === updated.run_id ? updated : r))
                    if (selected) pollRun(selected.workflow_id, updated)
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
      `}</style>

      {/* Page-level expand modal — for description and initial prompt */}
      {expandPage && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setExpandPage(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12, padding: 24,
              width: 640, maxWidth: '92vw',
              display: 'flex', flexDirection: 'column', gap: 14,
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color: '#1D5FFA', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {expandPage.label}
              </span>
              <button
                onClick={() => setExpandPage(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
              >×</button>
            </div>
            <textarea
              autoFocus
              value={expandPageValue}
              onChange={e => setExpandPageValue(e.target.value)}
              rows={expandPage.field === 'initialInput' ? 12 : 5}
              placeholder={expandPage.field === 'initialInput' ? 'Paste your full prompt here…' : 'Workflow description…'}
              style={{
                width: '100%', boxSizing: 'border-box',
                fontSize: 13, lineHeight: 1.6,
                padding: '10px 14px',
                background: 'var(--bg-page)', color: 'var(--text-body)',
                border: '1px solid #1D5FFA44',
                borderRadius: 7, resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setExpandPage(null)}
                style={{ ...MONO, fontSize: 11, padding: '7px 18px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-muted)' }}
              >Cancel</button>
              <button
                onClick={() => {
                  if (expandPage.field === 'wfDesc') setWfDesc(expandPageValue)
                  else setInitialInput(expandPageValue)
                  setExpandPage(null)
                }}
                style={{ ...MONO, fontSize: 11, padding: '7px 18px', background: '#1D5FFA', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#fff', fontWeight: 700 }}
              >Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const toolBtn: React.CSSProperties = {
  ...MONO, fontSize: 11, padding: '4px 10px',
  background: 'var(--bg-page)', color: 'var(--text-body)',
  border: '1px solid var(--border)', borderRadius: 5,
  cursor: 'pointer',
}
