import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BASE_URL } from '../api/client'
import ConfirmModal from '../components/ui/ConfirmModal'
import { useToast } from '../components/ui/Toast'
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
import { invalidateDashboardStats, queryKeys } from '../lib/queryClient'

// ─── constants ───────────────────────────────────────────────────────────────

const NODE_W = 200
const NODE_H = 80
const MONO = { fontFamily: 'var(--font-mono)' }
const SANS = { fontFamily: 'var(--font-sans)' }

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
  subworkflow: '#7C3AED',
  collaborative_node: '#EC4899',
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

const relativeTime = (iso: string | null | undefined) => {
  if (!iso) return ''
  try {
    const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
    if (sec < 60) return `${sec}s ago`
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min}m ago`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}h ago`
    const day = Math.floor(hr / 24)
    if (day < 30) return `${day}d ago`
    return fmt(iso)
  } catch { return '' }
}

const elapsed = (start: string | null, end: string | null): string => {
  if (!start || !end) return ''
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  const totalSec = Math.floor(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  const remM = m % 60
  return remM > 0 ? `${h}h ${remM}m` : `${h}h`
}

const formatTokens = (n: number) => n.toLocaleString('en-US')

const modeShort = (mode: string) => (mode || '').replace(/_/g, ' ')

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
  workflows?: WorkflowRecord[]
  selected?: WorkflowRecord | null
  onSelect: () => void
  onDragStart: (e: React.MouseEvent) => void
  onCompleteConnect: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onHeightChange: (h: number) => void
  onAgentChange: (agentId: string, label: string, type: string) => void
  onConfigChange: (config: Record<string, unknown>) => void
  onDelete: () => void
}

function CanvasNodeCard({
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

// ─── run result panel ─────────────────────────────────────────────────────────

const elapsedSec = (start: string | null, end: string | null): string => {
  if (!start || !end) return '—'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 0) return '—'
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  return elapsed(start, end)
}

function StatusPill({ status }: { status: string }) {
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

function AgentInspector({
  nr, tab, onTabChange, onClose, onExpand,
}: {
  nr: NodeRunResult
  tab: 'system' | 'input' | 'output'
  onTabChange: (t: 'system' | 'input' | 'output') => void
  onClose: () => void
  onExpand: (label: string, value: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVisible(false)
        setTimeout(onClose, 220)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // intentionally only bind once; onClose clears inspect state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 220)
  }

  const content =
    tab === 'system' ? (nr.system_prompt_used || '')
    : tab === 'input' ? (nr.input_text || '')
    : (nr.output_text || '')
  const lineCount = content ? content.split('\n').length : 0
  const duration = elapsedSec(nr.started_at, nr.completed_at)
  const tokens = nr.input_tokens + nr.output_tokens

  const tabs: Array<{ id: 'system' | 'input' | 'output'; label: string }> = [
    { id: 'system', label: 'System' },
    { id: 'input', label: 'Input' },
    { id: 'output', label: 'Output' },
  ]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch { /* ignore */ }
  }

  return (
    <>
      <div
        className="wf-agent-inspector-backdrop"
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(8,12,24,0.35)',
          zIndex: 100,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.22s ease',
        }}
      />

      <div
        className="wf-agent-inspector"
        role="dialog"
        aria-label="Agent Inspector"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 520, maxWidth: '94vw',
          background: 'var(--bg-surface)',
          zIndex: 101,
          boxShadow: 'var(--shadow-panel)',
          display: 'flex', flexDirection: 'column',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          ...SANS,
        }}
      >
        {/* Header — matches New Agent panel */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-page)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              ...MONO, fontSize: 10, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--text-tertiary)', marginBottom: 4,
            }}>
              Agent Inspector
            </div>
            <div style={{
              ...MONO, fontSize: 15, fontWeight: 700, color: 'var(--text-heading)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {nr.node_label || nr.node_id}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <StatusPill status={nr.status} />
              <span style={{ ...SANS, fontSize: 12, color: 'var(--text-tertiary)' }}>{duration}</span>
              <span style={{ ...SANS, fontSize: 12, color: 'var(--text-tertiary)' }}>
                {formatTokens(tokens)} tok
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              ...SANS,
              background: 'var(--bg-hover)',
              border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text-secondary)',
              cursor: 'pointer', padding: '5px 10px', fontSize: 12, flexShrink: 0,
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          padding: '0 24px', display: 'flex', gap: 0, flexShrink: 0,
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-page)',
        }}>
          {tabs.map(t => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                style={{
                  ...SANS, fontSize: 13, fontWeight: active ? 600 : 500,
                  padding: '12px 14px', cursor: 'pointer',
                  border: 'none',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -1,
                  background: 'transparent',
                  color: active ? 'var(--accent-text)' : 'var(--text-tertiary)',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div style={{
          flex: 1, minHeight: 0, overflow: 'auto',
          padding: '20px 24px 24px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              ...MONO, fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              {lineCount} lines
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={copy}
                title={copied ? 'Copied' : 'Copy'}
                aria-label={copied ? 'Copied' : 'Copy'}
                style={{
                  width: 32, height: 32, padding: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: copied ? 'var(--accent-soft)' : 'var(--bg-hover)',
                  border: `1px solid ${copied ? 'var(--blue-border)' : 'var(--border)'}`,
                  borderRadius: 8, cursor: 'pointer',
                  color: copied ? 'var(--accent-text)' : 'var(--text-secondary)',
                }}
              >
                {copied ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                    <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                    <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => onExpand(
                  `${nr.node_label || nr.node_id} — ${tab[0].toUpperCase()}${tab.slice(1)}`,
                  content,
                )}
                title="Expand"
                aria-label="Expand"
                style={{
                  width: 32, height: 32, padding: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: 8, cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {nr.error_message && tab === 'output' && (
            <div style={{
              padding: '8px 10px',
              background: 'var(--invalid-dim)', border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8, color: 'var(--invalid)', fontSize: 12, ...SANS,
            }}>
              {nr.error_message}
            </div>
          )}

          <pre style={{
            ...MONO, fontSize: 12, lineHeight: 1.55, color: 'var(--text-primary)',
            margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            background: 'var(--bg-page)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '14px 16px', flex: 1,
          }}>
            {content || '—'}
          </pre>
        </div>
      </div>
    </>
  )
}

function RunResultPanel({
  run, workflowId, onClose, onResumed,
}: {
  run: WorkflowRun
  workflowId: string
  onClose: () => void
  onResumed: (updated: WorkflowRun) => void
}) {
  const [checkpoint, setCheckpoint] = useState<CheckpointInfo | null>(null)
  const [humanInput, setHumanInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resumeError, setResumeError] = useState('')
  const [runnerExpand, setRunnerExpand] = useState<{ label: string; value: string } | null>(null)
  const [expandCopied, setExpandCopied] = useState(false)
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false)
  const [inspect, setInspect] = useState<{ nodeId: string; tab: 'system' | 'input' | 'output' } | null>(null)

  useEffect(() => {
    if (run.status === 'awaiting_checkpoint') {
      getCheckpoint(workflowId, run.run_id)
        .then(cp => { if (cp.status === 'awaiting') setCheckpoint(cp) })
        .catch(() => {})
    } else {
      setCheckpoint(null)
    }
  }, [run.status, run.run_id, workflowId])

  useEffect(() => {
    setInspect(null)
  }, [run.run_id])

  const doResume = async () => {
    setShowEmptyConfirm(false)
    setSubmitting(true)
    try {
      const updated = await resumeRun(workflowId, run.run_id, humanInput || 'APPROVE')
      setHumanInput('')
      setCheckpoint(null)
      onResumed(updated)
    } catch (e: any) {
      setResumeError(e.message || String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResume = () => {
    if (!humanInput.trim()) { setShowEmptyConfirm(true); return }
    doResume()
  }

  const openInspect = (nr: NodeRunResult, tab: 'system' | 'input' | 'output') => {
    setInspect({ nodeId: nr.node_id, tab })
  }

  const inspectingNr = inspect
    ? run.node_results.find(n => n.node_id === inspect.nodeId) ?? null
    : null

  const expandLineCount = runnerExpand?.value ? runnerExpand.value.split('\n').length : 0

  const copyExpanded = async () => {
    if (!runnerExpand) return
    try {
      await navigator.clipboard.writeText(runnerExpand.value)
      setExpandCopied(true)
      setTimeout(() => setExpandCopied(false), 1200)
    } catch { /* ignore */ }
  }

  const closeExpand = () => {
    setRunnerExpand(null)
    setExpandCopied(false)
  }

  const expandModal = runnerExpand ? (
    <div
      onClick={closeExpand}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(8,12,24,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 24,
        ...SANS,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label={runnerExpand.label}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          width: 820, maxWidth: '100%',
          maxHeight: 'min(88vh, 900px)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-page)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              ...MONO, fontSize: 10, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--text-tertiary)', marginBottom: 4,
            }}>
              Expanded view
            </div>
            <div style={{
              ...MONO, fontSize: 14, fontWeight: 700, color: 'var(--text-heading)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {runnerExpand.label}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={copyExpanded}
              title={expandCopied ? 'Copied' : 'Copy'}
              aria-label={expandCopied ? 'Copied' : 'Copy'}
              style={{
                width: 34, height: 34, padding: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: expandCopied ? 'var(--accent-soft)' : 'var(--bg-hover)',
                border: `1px solid ${expandCopied ? 'var(--blue-border)' : 'var(--border)'}`,
                borderRadius: 8, cursor: 'pointer',
                color: expandCopied ? 'var(--accent-text)' : 'var(--text-secondary)',
              }}
            >
              {expandCopied ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                  <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={closeExpand}
              style={{
                ...SANS,
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-secondary)',
                cursor: 'pointer', padding: '6px 10px', fontSize: 12,
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div style={{
          padding: '10px 22px',
          display: 'flex', alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <span style={{
            ...MONO, fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            {expandLineCount} lines
          </span>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '18px 22px 22px' }}>
          <pre style={{
            ...MONO, fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)',
            margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            background: 'var(--bg-page)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '16px 18px', minHeight: '100%',
          }}>
            {runnerExpand.value || '—'}
          </pre>
        </div>
      </div>
    </div>
  ) : null

  const totalTokens = run.total_input_tokens + run.total_output_tokens
  const runDuration = elapsed(run.started_at, run.completed_at)

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
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        position: 'sticky', top: 0, background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)', zIndex: 1,
      }}>
        <span style={{ ...SANS, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Run result
        </span>
        <StatusPill status={run.status} />
        {runDuration && (
          <span style={{
            ...SANS, fontSize: 12, color: 'var(--text-tertiary)',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" strokeLinecap="round" />
            </svg>
            {runDuration}
          </span>
        )}
        <span style={{
          ...SANS, fontSize: 12, color: 'var(--text-tertiary)',
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 3l2.2 4.5L19 8.2l-3.5 3.4.8 4.9L12 14.8 7.7 16.5l.8-4.9L5 8.2l4.8-.7L12 3z" strokeLinejoin="round" />
          </svg>
          {formatTokens(totalTokens)} tok
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            ...SANS, fontSize: 12, fontWeight: 500, marginLeft: 'auto',
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 2px',
          }}
        >
          Collapse
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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
          {resumeError && (
            <span style={{ ...MONO, fontSize: 11, color: '#EF4444', marginTop: 4, display: 'block' }}>{resumeError}</span>
          )}
        </div>
      )}

      {/* Node results table */}
      <div style={{ overflowX: 'auto' }}>
        <div
          className="wf-run-result-table"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(160px, 1.6fr) 120px 72px 88px 110px',
            minWidth: 560,
            ...SANS,
          }}
        >
          {['AGENT', 'STATUS', 'TIME', 'TOKENS', 'VIEW'].map(h => (
            <div
              key={h}
              style={{
                padding: '10px 16px',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: 'var(--text-tertiary)',
                borderBottom: '1px solid var(--border)',
                textAlign: h === 'VIEW' ? 'right' : 'left',
              }}
            >
              {h}
            </div>
          ))}

          {run.node_results.map(nr => {
            const active = inspect?.nodeId === nr.node_id
            return (
              <div
                key={nr.result_id || nr.node_id}
                style={{ display: 'contents' }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openInspect(nr, 'system')}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openInspect(nr, 'system') } }}
                  title="Open system prompt"
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
                    background: active ? 'var(--accent-soft)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" aria-hidden style={{ flexShrink: 0 }}>
                    <path d="M12 2l1.8 5.6L20 9.4l-4.6 3.4L16.8 19 12 15.8 7.2 19l1.4-6.2L4 9.4l6.2-1.8L12 2z" />
                  </svg>
                  <span style={{
                    ...MONO, fontSize: 12,
                    color: active && inspect?.tab === 'system' ? 'var(--accent-text)' : 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {nr.node_label || nr.node_id}
                  </span>
                </div>
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                }}>
                  <StatusPill status={nr.status} />
                </div>
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  ...MONO, fontSize: 12, color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                }}>
                  {elapsedSec(nr.started_at, nr.completed_at)}
                </div>
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  ...MONO, fontSize: 12, color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                }}>
                  {formatTokens(nr.input_tokens + nr.output_tokens)}
                </div>
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
                  background: active ? 'var(--accent-soft)' : 'transparent',
                }}>
                  <button
                    type="button"
                    onClick={() => openInspect(nr, 'input')}
                    style={{
                      ...SANS, fontSize: 12, fontWeight: 500, padding: 0,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: inspect?.nodeId === nr.node_id && inspect.tab === 'input'
                        ? 'var(--accent-text)' : 'var(--text-secondary)',
                    }}
                  >
                    input
                  </button>
                  <button
                    type="button"
                    onClick={() => openInspect(nr, 'output')}
                    style={{
                      ...SANS, fontSize: 12, fontWeight: 500, padding: 0,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: inspect?.nodeId === nr.node_id && inspect.tab === 'output'
                        ? 'var(--accent-text)' : 'var(--text-secondary)',
                    }}
                  >
                    output
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

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

      {/* Shared Blackboard — only rendered when agents have written to it */}
      {run.blackboard && Object.keys(run.blackboard).length > 0 && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{
            ...MONO, fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
            marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Shared Blackboard
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(run.blackboard).map(([k, v]) => (
              <div key={k} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: 'var(--accent-soft)',
                border: '1px solid var(--blue-border)',
                borderRadius: 8, padding: '8px 12px',
              }}>
                <span style={{
                  ...MONO, fontSize: 11, color: 'var(--accent-text)',
                  fontWeight: 700, flexShrink: 0,
                }}>
                  {k}
                </span>
                <span style={{
                  ...MONO, fontSize: 11, color: 'var(--text-primary)',
                  flex: 1, wordBreak: 'break-word', lineHeight: 1.45,
                }}>
                  {typeof v === 'string' ? v : JSON.stringify(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

      {inspectingNr && inspect && (
        <AgentInspector
          nr={inspectingNr}
          tab={inspect.tab}
          onTabChange={tab => setInspect({ nodeId: inspect.nodeId, tab })}
          onClose={() => setInspect(null)}
          onExpand={(label, value) => setRunnerExpand({ label, value })}
        />
      )}

      {expandModal}

      {showEmptyConfirm && (
        <ConfirmModal
          message="No input provided. Submit anyway and let the agent decide how to proceed?"
          confirmLabel="Submit"
          confirmColor="#7C3AED"
          onConfirm={doResume}
          onClose={() => setShowEmptyConfirm(false)}
        />
      )}
    </>
  )
}

// ─── run history panel ────────────────────────────────────────────────────────

function RunHistorySkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading run history" style={{ padding: '0 8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Array.from({ length: count }).map((_, i) => {
        const base = i * 0.06
        return (
          <div
            key={i}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'var(--skeleton-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Bone h={16} w={84} r={999} delay={base} />
              <Bone h={11} w={56} delay={base + 0.04} style={{ marginLeft: 'auto' }} />
            </div>
            <Bone h={13} w="90%" delay={base + 0.06} style={{ marginBottom: 8 }} />
            <Bone h={11} w="70%" delay={base + 0.1} />
          </div>
        )
      })}
    </div>
  )
}

function RunHistoryPanel({
  runs, onSelectRun, selectedRunId, workflowId, onRunsChanged, loading = false,
}: {
  runs: WorkflowRun[]
  onSelectRun: (r: WorkflowRun) => void
  selectedRunId?: string
  workflowId: string
  onRunsChanged: () => void
  loading?: boolean
}) {
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [deleteRunId, setDeleteRunId] = useState<string | null>(null)

  const statusMeta = (s: string) => {
    if (s === 'completed') return { color: 'var(--accent-text)', bg: 'transparent', icon: '✓', label: 'COMPLETED', bare: true }
    if (s === 'running') return { color: 'var(--accent-text)', bg: 'var(--accent-soft)', icon: '◌', label: 'RUNNING', bare: false }
    if (s === 'awaiting_checkpoint') return { color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.12)', icon: '⏸', label: 'CHECKPOINT', bare: false }
    return { color: 'var(--invalid)', bg: 'var(--invalid-dim)', icon: '✗', label: 'FAILED', bare: false }
  }

  const requestDeleteRun = (e: React.MouseEvent, runId: string) => {
    e.stopPropagation()
    setDeleteRunId(runId)
  }

  const confirmDeleteRun = async () => {
    if (!deleteRunId) return
    const runId = deleteRunId
    setDeleteRunId(null)
    await deleteRun(workflowId, runId)
    onRunsChanged()
  }

  const confirmClearAll = async () => {
    setShowClearConfirm(false)
    await clearAllRuns(workflowId)
    onRunsChanged()
  }

  return (
    <div className="wf-run-history-inner">
      <div style={{
        padding: '10px 14px 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          ...SANS, fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Run History
        </span>
        {!loading && runs.length > 0 && (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            style={{
              ...SANS, fontSize: 12, fontWeight: 500, padding: 0,
              background: 'none', border: 'none',
              color: 'var(--invalid)', cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <RunHistorySkeleton />
      ) : runs.length === 0 ? (
        <div style={{
          padding: '16px 14px', color: 'var(--text-muted)', fontSize: 12,
          textAlign: 'center', ...SANS,
        }}>
          No runs yet
        </div>
      ) : (
      <div style={{ padding: '0 8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {runs.map(run => {
          const active = selectedRunId === run.run_id
          const meta = statusMeta(run.status)
          const duration = elapsed(run.started_at, run.completed_at)
          const tokens = run.total_input_tokens + run.total_output_tokens
          return (
            <div
              key={run.run_id}
              className={`wf-run-item${active ? ' is-active' : ''}`}
              onClick={() => onSelectRun(run)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                borderRadius: 10,
                border: active ? '1px solid var(--blue-border)' : '1px solid transparent',
                background: active ? 'var(--accent-soft)' : 'transparent',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  ...SANS, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                  padding: meta.bare ? 0 : '3px 8px', borderRadius: meta.bare ? 0 : 999,
                  background: meta.bg, color: meta.color,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <span aria-hidden>{meta.icon}</span>
                  {meta.label}
                </span>
                <span style={{
                  ...SANS, fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatTokens(tokens)} tok
                </span>
                <button
                  type="button"
                  onClick={e => requestDeleteRun(e, run.run_id)}
                  title="Delete this run"
                  className="wf-run-delete"
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14,
                    lineHeight: 1, padding: '0 2px', opacity: 0.55,
                  }}
                >×</button>
              </div>

              {run.initial_input ? (
                <div style={{
                  ...SANS, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: 6, lineHeight: 1.35,
                }}>
                  {run.initial_input}
                </div>
              ) : (
                <div style={{
                  ...SANS, fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)',
                  marginBottom: 6, fontStyle: 'italic',
                }}>
                  (no input)
                </div>
              )}

              <div style={{
                ...SANS, fontSize: 11, color: 'var(--text-tertiary)',
                display: 'flex', flexWrap: 'wrap', gap: 0, alignItems: 'center',
              }}>
                <span>{fmt(run.started_at)}</span>
                {duration && (
                  <>
                    <span style={{ margin: '0 6px', opacity: 0.55 }}>·</span>
                    <span>{duration}</span>
                  </>
                )}
                <span style={{ margin: '0 6px', opacity: 0.55 }}>·</span>
                <span>{modeShort(run.execution_mode)}</span>
              </div>
            </div>
          )
        })}
      </div>
      )}

      {showClearConfirm && (
        <ConfirmModal
          message="Are you sure you want to clear all run history and agent memory for this workflow? This action cannot be undone."
          confirmLabel="Clear All"
          onConfirm={confirmClearAll}
          onClose={() => setShowClearConfirm(false)}
        />
      )}

      {deleteRunId && (
        <ConfirmModal
          message="Are you sure you want to delete this run? This action cannot be undone."
          confirmLabel="Delete Run"
          onConfirm={confirmDeleteRun}
          onClose={() => setDeleteRunId(null)}
        />
      )}
    </div>
  )
}

// ─── triggers panel (disabled — coming soon) ─────────────────────────────────

// @ts-nocheck-start — entire TriggersPanel block kept for reference, not used
// @ts-ignore — kept for reference, not used while Triggers is coming soon
function _TriggersPanel({ workflowId, onClose }: { workflowId: string; onClose: () => void }) {
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
    `${BASE_URL}/triggers/webhooks/${encodeURIComponent(id)}/trigger`

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
                    background: 'var(--accent-soft)', border: '1px solid var(--blue-border)',
                    color: 'var(--accent-text)', borderRadius: 4, cursor: 'pointer',
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
                      background: 'var(--accent)', color: 'var(--btn-upload-text)', border: 'none',
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

// ─── skeleton ────────────────────────────────────────────────────────────────

function Bone({
  h, w, r = 6, delay = 0, style,
}: {
  h: number | string
  w: number | string
  r?: number
  delay?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      className="skeleton-bone"
      style={{
        height: h,
        width: w,
        borderRadius: r,
        ['--skel-delay' as string]: `${delay}s`,
        ...style,
      }}
    />
  )
}

function WorkflowsListSkeleton({ count = 6 }: { count?: number }) {
  const widths = [130, 150, 110, 140, 120, 155]
  return (
    <div aria-busy="true" aria-label="Loading workflows" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {Array.from({ length: count }).map((_, i) => {
        const base = i * 0.06
        return (
          <div
            key={i}
            style={{
              padding: '12px',
              borderRadius: 10,
              border: '1px solid transparent',
              background: 'var(--skeleton-card)',
            }}
          >
            <Bone h={13} w={widths[i % widths.length]} delay={base} style={{ marginBottom: 8 }} />
            <Bone h={11} w={Math.round(widths[i % widths.length] * 1.4)} delay={base + 0.03} style={{ marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Bone h={18} w={64} r={999} delay={base + 0.04} />
              <Bone h={10} w={48} delay={base + 0.08} />
              <Bone h={10} w={40} delay={base + 0.1} style={{ marginLeft: 'auto' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WorkflowsCanvasSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading workflow editor"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
        ...SANS,
      }}
    >
      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid var(--skeleton-border)',
        background: 'var(--skeleton-card)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        <Bone h={18} w={160} delay={0} />
        <Bone h={14} w={200} delay={0.05} style={{ flex: 1, maxWidth: 280 }} />
        <Bone h={28} w={120} r={5} delay={0.08} />
        <Bone h={28} w={72} r={5} delay={0.1} />
        <Bone h={28} w={64} r={5} delay={0.12} />
      </div>
      <div style={{
        flex: 1,
        backgroundColor: 'var(--canvas-bg)',
        backgroundImage: 'radial-gradient(circle, var(--canvas-dot) 1px, transparent 1.5px)',
        backgroundSize: '20px 20px',
        padding: 40,
        display: 'flex',
        gap: 24,
        alignItems: 'flex-start',
      }}>
        <Bone h={80} w={200} r={10} delay={0.1} />
        <Bone h={80} w={200} r={10} delay={0.16} style={{ marginTop: 40 }} />
        <Bone h={80} w={200} r={10} delay={0.22} style={{ marginTop: 10 }} />
      </div>
      <div style={{
        borderTop: '1px solid var(--skeleton-border)',
        background: 'var(--skeleton-card)',
        padding: '12px 20px',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
      }}>
        <Bone h={36} w="100%" r={6} delay={0.14} style={{ maxWidth: 480 }} />
        <Bone h={36} w={88} r={6} delay={0.18} />
      </div>
    </div>
  )
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<WorkflowRecord | null>(null)
  const [wfSearch, setWfSearch] = useState('')
  const [wfModeFilter, setWfModeFilter] = useState<ExecutionMode | ''>('')
  const [mobileShowDetail, setMobileShowDetail] = useState(false)
  const [mobileTab, setMobileTab] = useState<'canvas' | 'run' | 'history'>('canvas')
  const initializedRef = useRef(false)

  // Canvas state
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [edges, setEdges] = useState<WorkflowEdge[]>([])
  const [execMode, setExecMode] = useState<ExecutionMode>('sequential')
  const [wfName, setWfName] = useState('')
  const [wfDesc, setWfDesc] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const { show: showToast } = useToast()
  const [saving, setSaving] = useState(false)

  // Port-drag state
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const hoverCancelRef = useRef<number | null>(null)
  const [portDrag, setPortDrag] = useState<{
    fromNodeId: string; fromSide: string; fromOffset: number; canvasX: number; canvasY: number
  } | null>(null)
  const [nodeHeights, setNodeHeights] = useState<Record<string, number>>({})

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
  const [deleteWfTarget, setDeleteWfTarget] = useState<string | null>(null)
  const [currentRun, setCurrentRun] = useState<WorkflowRun | null>(null)
  const [runError, setRunError] = useState('')

  // History
  const [selectedHistoryRun, setSelectedHistoryRun] = useState<WorkflowRun | null>(null)

  // Canvas zoom
  const [zoom, setZoom] = useState(1)
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null)
  const [editingEdgeLabel, setEditingEdgeLabel] = useState('')
  const ZOOM_MIN = 0.3
  const ZOOM_MAX = 2
  const ZOOM_STEP = 0.1
  const zoomIn  = () => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))
  const zoomOut = () => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))
  const zoomReset = () => setZoom(1)

  // Run panel resize
  const [runPanelH, setRunPanelH] = useState(420)
  const runPanelMinH = 36
  const resizeDragRef = useRef<{ startY: number; startH: number } | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)

  const { data: workflows = [], isLoading: workflowsLoading } = useQuery({
    queryKey: queryKeys.workflows,
    queryFn: () => listWorkflows().catch(() => [] as WorkflowRecord[]),
  })

  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents,
    queryFn: () => listAgents().catch(() => [] as AgentRecord[]),
  })

  const selectedId = selected?.workflow_id ?? ''

  const { data: runs = [], isLoading: runsLoading, isFetching: runsFetching } = useQuery({
    queryKey: queryKeys.workflowRuns(selectedId),
    queryFn: () => listRuns(selectedId).catch(() => [] as WorkflowRun[]),
    enabled: !!selectedId,
  })

  const runsBusy = !!selectedId && (runsLoading || (runsFetching && runs.length === 0))

  const loading = workflowsLoading

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

  const loadWorkflow = (wf: WorkflowRecord) => {
    setSelected(wf)
    setWfName(wf.name)
    setWfDesc(wf.description || '')
    setExecMode(wf.execution_mode || 'sequential')
    setLoopIterations(wf.loop_iterations || 3)
    setEnableMemory(wf.enable_memory || false)
    setConvergenceExpr(wf.convergence_expr || '')
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
    setSelectedHistoryRun(null)
    setInitialInput('')
    setRunError('')
  }

  // Select first workflow once data is ready
  useEffect(() => {
    if (initializedRef.current || workflowsLoading) return
    initializedRef.current = true
    if (workflows.length > 0) loadWorkflow(workflows[0])
  }, [workflowsLoading, workflows])

  // ── canvas mouse events ──────────────────────────────────────────────────
  // Listeners are attached to window during drag so fast mouse movement
  // outside the canvas div doesn't lose mouseup and corrupt drag state.

  const startDrag = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const node = nodes.find(n => n.node_id === nodeId)
    if (!node) return
    dragging.current = {
      nodeId,
      startMX: e.clientX, startMY: e.clientY,
      startNX: node.position_x, startNY: node.position_y,
    }

    const onMove = (ev: MouseEvent) => {
      const d = dragging.current
      if (!d) return
      const dx = ev.clientX - d.startMX
      const dy = ev.clientY - d.startMY
      const newX = Math.max(0, d.startNX + dx)
      const newY = Math.max(0, d.startNY + dy)
      const targetId = d.nodeId
      setNodes(prev =>
        prev.map(n =>
          n.node_id === targetId
            ? { ...n, position_x: newX, position_y: newY }
            : n
        )
      )
    }
    const onUp = () => {
      dragging.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [nodes])

  // ── add / delete nodes ───────────────────────────────────────────────────

  const addNode = (type: string = 'agent') => {
    const col = nodes.length % 4
    const row = Math.floor(nodes.length / 4)
    const newNode: WorkflowNode = {
      node_id: newId('nd'),
      node_type: type as any,
      label: type === 'orchestrator' ? 'Coordinator'
      : type === 'subworkflow' ? 'Sub-workflow'
      : type === 'collaborative_node' ? 'Collab Loop'
      : 'Agent Node',
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

  // ── port-handle drag ─────────────────────────────────────────────────────

  const startPortDrag = (fromNodeId: string, fromSide: string, fromOffset: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const canvasX = (e.clientX - rect.left) / zoom
    const canvasY = (e.clientY - rect.top) / zoom
    setPortDrag({ fromNodeId, fromSide, fromOffset, canvasX, canvasY })

    const onMove = (ev: MouseEvent) => {
      const r = canvasRef.current?.getBoundingClientRect()
      if (!r) return
      setPortDrag(prev => prev ? {
        ...prev,
        canvasX: (ev.clientX - r.left) / zoom,
        canvasY: (ev.clientY - r.top) / zoom,
      } : null)
    }

    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const r = canvasRef.current?.getBoundingClientRect()
      if (!r) { setPortDrag(null); return }
      const cx = (ev.clientX - r.left) / zoom
      const cy = (ev.clientY - r.top) / zoom
      // Find target node under cursor (use actual height, not hardcoded 500)
      const target = nodes.find(n => {
        const h = nodeHeights[n.node_id] || NODE_H
        return cx >= n.position_x - 16 && cx <= n.position_x + NODE_W + 16 &&
               cy >= n.position_y - 16 && cy <= n.position_y + h + 16 &&
               n.node_id !== fromNodeId
      })
      if (target) {
        // Snap to the nearest displayed port dot — use the same portOffsets() the dots
        // are rendered with so every visible dot is a valid snap target.
        const th = nodeHeights[target.node_id] || NODE_H
        const hOffs = portOffsets(NODE_W)
        const vOffs = portOffsets(th)
        let bestDist = Infinity, toSide = 'left', toOffset = 0.5;
        (['top', 'bottom', 'left', 'right'] as const).forEach(side => {
          const offs = (side === 'left' || side === 'right') ? vOffs : hOffs
          offs.forEach(off => {
            const p = getPortPos(target, side, off)
            const d = Math.hypot(cx - p.x, cy - p.y)
            if (d < bestDist) { bestDist = d; toSide = side; toOffset = off }
          })
        })
        const already = edges.some(
          ed => ed.from_node_id === fromNodeId && ed.to_node_id === target.node_id &&
                ed.from_side === fromSide && ed.from_offset === fromOffset
        )
        if (!already) {
          setEdges(prev => [...prev, {
            edge_id: newId('e'),
            from_node_id: fromNodeId,
            to_node_id: target.node_id,
            label: '', condition_expr: '',
            from_side: fromSide, from_offset: fromOffset,
            to_side: toSide, to_offset: toOffset,
          }])
        }
      }
      setPortDrag(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // While dragging: show dots on all nodes (so user can see drop targets).
  // While hovering: show dots only on hovered node.
  const showPortsFor: string | 'all' | null = portDrag ? 'all' : hoveredNodeId

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
      const [orch, ...specs] = nodes
      if (!orch) return
      const COL_W = NODE_W + 80                           // 280px between agent left-edges
      const orchH = nodeHeights[orch.node_id] || 340     // actual card height, or safe default
      const totalAgentsW = specs.length > 0 ? (specs.length - 1) * COL_W + NODE_W : NODE_W
      const orchX = 40 + Math.max(0, (totalAgentsW - NODE_W) / 2)  // centre over agent row
      const agentY = 40 + orchH + 80                     // below orch with 80px gap
      const layouted = [
        { ...orch, node_type: 'orchestrator' as any, position_x: orchX, position_y: 40 },
        ...specs.map((s, i) => ({ ...s, position_x: 40 + i * COL_W, position_y: agentY })),
      ]
      setNodes(layouted)
      setEdges([])
    } else if (execMode === 'event_driven') {
      // ── Hierarchical pub/sub layout ──────────────────────────────────────
      // subscribes_to is stored as a comma-separated STRING, not an array.
      const getSubs = (n: WorkflowNode) => {
        const raw = (n.config.subscribes_to as string) || ''
        return raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : []
      }

      // event name → id of node that emits it
      const emitterOf: Record<string, string> = {}
      nodes.forEach(n => {
        const evt = ((n.config.emits_event as string) || '').trim()
        if (evt) emitterOf[evt] = n.node_id
      })

      // BFS topological depth: root nodes (no subscriptions) = depth 0
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
            return pid ? (depth[pid] ?? -1) : 0  // unknown event src → treat as root
          })
          if (parentDepths.some(d => d === -1)) return  // parent not resolved yet
          const d = Math.max(...parentDepths) + 1
          if (depth[n.node_id] !== d) { depth[n.node_id] = d; changed = true }
        })
      }
      // Any node that couldn't be resolved falls back to depth 0
      nodes.forEach(n => { if (depth[n.node_id] === undefined) depth[n.node_id] = 0 })

      // Group by column (depth)
      const cols: Record<number, string[]> = {}
      nodes.forEach(n => {
        const col = depth[n.node_id]
        ;(cols[col] = cols[col] || []).push(n.node_id)
      })

      const COL_W = 320   // horizontal distance between column left-edges
      const ROW_H = 240   // vertical distance between node top-edges in same column
      const START_X = 40, START_Y = 60

      const nMap: Record<string, WorkflowNode> = {}
      nodes.forEach(n => { nMap[n.node_id] = n })

      const colKeys = Object.keys(cols).map(Number).sort((a, b) => a - b)
      const maxRows = Math.max(...colKeys.map(c => cols[c].length))

      const positioned: WorkflowNode[] = []
      colKeys.forEach((col, ci) => {
        const ids = cols[col]
        // Centre shorter columns vertically relative to the tallest
        const topPad = ((maxRows - ids.length) * ROW_H) / 2
        ids.forEach((nid, ri) => {
          positioned.push({ ...nMap[nid],
            position_x: START_X + ci * COL_W,
            position_y: START_Y + topPad + ri * ROW_H,
          })
        })
      })
      setNodes(positioned)

      // Rebuild edges from subscriptions (no stored port sides → auto-routed)
      const newEdges: WorkflowEdge[] = []
      nodes.forEach(n => {
        getSubs(n).forEach(evt => {
          const srcId = emitterOf[evt]
          if (srcId && srcId !== n.node_id) {
            newEdges.push({ edge_id: newId('e'), from_node_id: srcId, to_node_id: n.node_id, label: evt, condition_expr: '' })
          }
        })
      })
      setEdges(newEdges)
    }
  }

  // ── save ─────────────────────────────────────────────────────────────────

  const saveWorkflow = async () => {
    setSaving(true)
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
      queryClient.setQueryData<WorkflowRecord[]>(queryKeys.workflows, (prev = []) => {
        const idx = prev.findIndex(w => w.workflow_id === wf.workflow_id)
        return idx >= 0 ? prev.map((w, i) => i === idx ? wf : w) : [wf, ...prev]
      })
      invalidateDashboardStats()
      showToast('success', 'Workflow saved successfully')
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const openMobileDetail = (tab: 'canvas' | 'run' | 'history' = 'canvas') => {
    setMobileTab(tab)
    setMobileShowDetail(true)
  }

  const selectHistoryRun = (r: WorkflowRun) => {
    setSelectedHistoryRun(r)
    setCurrentRun(null)
    setInitialInput(r.initial_input)
    setRunError('')
    setRunPanelH(420)
    openMobileDetail('run')
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
    openMobileDetail('canvas')
  }

  // ── delete workflow ───────────────────────────────────────────────────────

  const doDeleteWorkflow = (wfId: string) => setDeleteWfTarget(wfId)

  const confirmDeleteWorkflow = async () => {
    if (!deleteWfTarget) return
    const wfId = deleteWfTarget
    setDeleteWfTarget(null)
    try {
      await deleteWorkflow(wfId)
    } catch (e: unknown) {
      setRunError(e instanceof Error ? e.message : 'Failed to delete workflow')
      return
    }
    const remaining = workflows.filter(w => w.workflow_id !== wfId)
    queryClient.setQueryData<WorkflowRecord[]>(queryKeys.workflows, remaining)
    invalidateDashboardStats()
    if (selected?.workflow_id === wfId) {
      if (remaining.length > 0) {
        loadWorkflow(remaining[0])
        openMobileDetail('canvas')
      } else {
        newWorkflow()
        setMobileShowDetail(false)
      }
    }
  }

  // ── run ───────────────────────────────────────────────────────────────────

  const pollRunRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pollRun = useCallback((workflowId: string, run: WorkflowRun) => {
    pollRunRef.current = setTimeout(async () => {
      try {
        const updated = await getRun(workflowId, run.run_id)
        setCurrentRun(updated)
        queryClient.setQueryData<WorkflowRun[]>(queryKeys.workflowRuns(workflowId), (prev = []) =>
          prev.map(r => r.run_id === updated.run_id ? updated : r)
        )
        if (updated.status === 'running' || updated.status === 'awaiting_checkpoint') {
          if (updated.status === 'running') setRunning(true)
          else setRunning(false)  // allow user to interact with HITL panel
          pollRun(workflowId, updated)
        } else {
          setRunning(false)
          queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns(workflowId) })
          invalidateDashboardStats()
        }
      } catch {
        setRunning(false)
      }
    }, 2000)
  }, [queryClient])

  const doRun = async () => {
    if (!selected) { setRunError('Save the workflow first.'); return }
    if (pollRunRef.current) clearTimeout(pollRunRef.current)
    setRunning(true); setRunError(''); setCurrentRun(null); setSelectedHistoryRun(null)
    setMobileTab('run')
    try {
      const run = await runWorkflow(selected.workflow_id, initialInput, '')
      setCurrentRun(run)
      queryClient.setQueryData<WorkflowRun[]>(queryKeys.workflowRuns(selected.workflow_id), (prev = []) =>
        [run, ...prev]
      )
      invalidateDashboardStats()
      // Server returns immediately (202); start polling for completion
      pollRun(selected.workflow_id, run)
    } catch (e: any) {
      setRunError(e.message || String(e))
      setRunning(false)
    }
  }

  // ── fired events — derived from completed node results during a run ────────
  // A node's emits_event is considered fired once that node is completed.
  const firedEvents = useMemo<Set<string>>(() => {
    const active = currentRun || selectedHistoryRun
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
  }, [currentRun, selectedHistoryRun, execMode, nodes])

  // ── edge SVG paths ────────────────────────────────────────────────────────

  const nodeMap = Object.fromEntries(nodes.map(n => [n.node_id, n]))

  const getNodeH = (node: WorkflowNode) => nodeHeights[node.node_id] || NODE_H

  const getPortPos = (node: WorkflowNode, side: string, offset = 0.5): { x: number; y: number } => {
    const h = getNodeH(node)
    switch (side) {
      case 'top':    return { x: node.position_x + NODE_W * offset, y: node.position_y }
      case 'bottom': return { x: node.position_x + NODE_W * offset, y: node.position_y + h }
      case 'left':   return { x: node.position_x,        y: node.position_y + h * offset }
      case 'right': default: return { x: node.position_x + NODE_W, y: node.position_y + h * offset }
    }
  }

  // Generate evenly-spaced offsets for a given side length
  const portOffsets = (len: number) => {
    const n = Math.max(2, Math.min(8, Math.floor(len / 60)))
    return Array.from({ length: n }, (_, i) => (i + 1) / (n + 1))
  }

  // Outward unit tangent for each port side
  const sideTangent = (side: string): [number, number] => {
    switch (side) {
      case 'top':    return [0, -1]
      case 'bottom': return [0,  1]
      case 'left':   return [-1, 0]
      case 'right':  default: return [1, 0]
    }
  }

  // Choose best exit/entry sides by measuring the angle between node centers
  const autoSides = (from: WorkflowNode, to: WorkflowNode) => {
    const angle = Math.atan2(
      (to.position_y + getNodeH(to) / 2) - (from.position_y + getNodeH(from) / 2),
      (to.position_x + NODE_W / 2)       - (from.position_x + NODE_W / 2)
    ) * 180 / Math.PI
    if (angle > -45 && angle <= 45)   return { fromSide: 'right',  toSide: 'left'   }
    if (angle > 45  && angle <= 135)  return { fromSide: 'bottom', toSide: 'top'    }
    if (angle < -45 && angle >= -135) return { fromSide: 'top',    toSide: 'bottom' }
    return                                   { fromSide: 'left',   toSide: 'right'  }
  }

  // For edges without stored port info, pre-compute angle-based sides and
  // evenly spread offsets so multiple edges on the same side fan out cleanly.
  const _sideCache: Record<string, { fromSide: string; toSide: string }> = {}
  const _srcGroup: Record<string, string[]> = {}
  const _dstGroup: Record<string, string[]> = {}
  edges.forEach(edge => {
    if (edge.from_side) return
    const from = nodeMap[edge.from_node_id], to = nodeMap[edge.to_node_id]
    if (!from || !to) return
    const sides = autoSides(from, to)
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

  // ---------------------------------------------------------------------------
  // Bezier edge computation
  // Each edge exits its source port and arrives at its destination port using
  // a cubic bezier. Both control points pull outward from their respective
  // ports, guaranteeing smooth tangents. The path endpoint is pulled back by
  // PULL px so the drawn line ends just before the border; the arrowhead tip
  // is rendered separately at the exact border position in the top SVG.
  // ---------------------------------------------------------------------------
  const EDGE_PULL = 10   // path stops this many px before dest border
  const ARROW_REACH = 18 // invisible arrowhead line extends this far outside border

  const edgePaths = edges.map(edge => {
    const from = nodeMap[edge.from_node_id], to = nodeMap[edge.to_node_id]
    if (!from || !to) return null

    let fromSide: string, toSide: string, x1: number, y1: number, x2: number, y2: number

    if (edge.from_side && edge.to_side) {
      // User explicitly drew this edge to specific ports — honour stored sides
      fromSide = edge.from_side; toSide = edge.to_side
      const p1 = getPortPos(from, fromSide, edge.from_offset ?? 0.5)
      const p2 = getPortPos(to,   toSide,   edge.to_offset   ?? 0.5)
      x1 = p1.x; y1 = p1.y; x2 = p2.x; y2 = p2.y
    } else {
      // Auto-route: angle-based side + spread offset
      const s = _sideCache[edge.edge_id] || autoSides(from, to)
      fromSide = s.fromSide; toSide = s.toSide
      const p1 = getPortPos(from, fromSide, _autoFromOff[edge.edge_id] ?? 0.5)
      const p2 = getPortPos(to,   toSide,   _autoToOff[edge.edge_id]   ?? 0.5)
      x1 = p1.x; y1 = p1.y; x2 = p2.x; y2 = p2.y
    }

    const [tx1, ty1] = sideTangent(fromSide)
    const [tx2, ty2] = sideTangent(toSide)
    const dist = Math.hypot(x2 - x1, y2 - y1)

    // If the source tangent points AWAY from the destination, the edge is
    // "backward" and needs a larger pull-out to avoid tight S-loops.
    const dot = tx1 * (x2 - x1) + ty1 * (y2 - y1)
    const cp = dot < 0
      ? Math.max(80, dist * 0.6 + 50)
      : Math.max(60, dist * 0.45)

    // Control points: pull outward from each port.
    // Clamp y so control points never go above the canvas top (y < 0 can't scroll to).
    const MIN_Y = 20
    const cx1 = x1 + tx1 * cp
    const cy1 = Math.max(MIN_Y, y1 + ty1 * cp)
    const cx2 = x2 + tx2 * cp
    const cy2 = Math.max(MIN_Y, y2 + ty2 * cp)

    // Path endpoint pulled back PULL px outside the dest border
    const px2 = x2 + tx2 * EDGE_PULL, py2 = y2 + ty2 * EDGE_PULL

    const path = `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${px2} ${py2}`

    // True bezier midpoint at t=0.5
    const midX = (x1 + 3*cx1 + 3*cx2 + px2) / 8
    const midY = (y1 + 3*cy1 + 3*cy2 + py2) / 8

    const maxCtrlY = Math.max(y1, cy1, cy2, py2)
    return { edge, path, midX, midY, arrowX: x2, arrowY: y2, tx2, ty2, maxCtrlY }
  }).filter(Boolean) as {
    edge: WorkflowEdge; path: string; midX: number; midY: number
    arrowX: number; arrowY: number; tx2: number; ty2: number; maxCtrlY: number
  }[]

  // Canvas size includes bezier control-point extremes so large arcs trigger scroll
  const canvasW = Math.max(900, ...nodes.map(n => n.position_x + NODE_W + 80))
  const edgeMaxY = edgePaths.length > 0 ? Math.max(...edgePaths.map(ep => ep.maxCtrlY)) : 0
  const canvasH = Math.max(600, ...nodes.map(n => n.position_y + getNodeH(n) + 100), edgeMaxY + 80)

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
    <div className={`wf-page${mobileShowDetail ? ' is-detail-open' : ''}`} style={{ display: 'flex', height: '100%', gap: 0, ...SANS }}>
      {/* ── Left panel ── */}
      <div
        className="wf-list-pane"
        style={{
        width: 260, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-card)',
      }}>
        <div className="wf-list-header" style={{
          padding: '16px 16px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <span style={{ ...SANS, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Workflows</span>
          <button
            className="wf-new-btn"
            onClick={newWorkflow}
            style={{
              ...SANS, fontSize: 12, padding: '6px 12px', fontWeight: 600,
              background: 'var(--accent)', border: 'none',
              color: '#FFFFFF', borderRadius: 8, cursor: 'pointer',
            }}
          >New</button>
        </div>

        {/* Search + mode filter */}
        <div className="wf-list-filters" style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="wf-search-wrap" style={{ position: 'relative' }}>
            <svg
              className="wf-search-icon"
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              className="wf-search-input"
              value={wfSearch}
              onChange={e => setWfSearch(e.target.value)}
              placeholder="Search workflows…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '8px 10px 8px 36px', fontSize: 12, ...SANS,
                background: 'var(--bg-page)', color: 'var(--text-primary)',
                border: '1px solid var(--border)', borderRadius: 8, outline: 'none',
              }}
            />
          </div>
          <select
            value={wfModeFilter}
            onChange={e => setWfModeFilter(e.target.value as ExecutionMode | '')}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '7px 10px', fontSize: 12, ...SANS,
              background: 'var(--bg-page)', color: 'var(--text-secondary)',
              border: '1px solid var(--border)', borderRadius: 8, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">All modes</option>
            <option value="sequential">Sequential</option>
            <option value="parallel">Parallel</option>
            <option value="hierarchical">Hierarchical</option>
            <option value="hybrid">Hybrid</option>
            <option value="collaborative">Collaborative</option>
            <option value="event_driven">Event driven</option>
          </select>
        </div>

        <div className="wf-list-scroll" style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: '0 8px 8px' }}>
          {loading ? (
            <WorkflowsListSkeleton />
          ) : (
            workflows
              .filter(wf =>
                (!wfSearch || wf.name.toLowerCase().includes(wfSearch.toLowerCase())) &&
                (!wfModeFilter || wf.execution_mode === wfModeFilter)
              )
              .map(wf => {
                const active = selected?.workflow_id === wf.workflow_id
                const nodeCount = wf.nodes?.length || wf.steps?.length || 0
                return (
              <div
                key={wf.workflow_id}
                className={`wf-list-item${active ? ' is-active' : ''}`}
                onClick={() => { loadWorkflow(wf); openMobileDetail('canvas') }}
                style={{
                  padding: '12px 12px',
                  cursor: 'pointer',
                  marginBottom: 4,
                  borderRadius: 10,
                  border: active ? '1px solid var(--blue-border)' : '1px solid transparent',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  boxShadow: active ? 'none' : undefined,
                }}
              >
                <div style={{
                  ...SANS, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                  marginBottom: wf.description ? 4 : 8, lineHeight: 1.35,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {wf.name}
                </div>
                {wf.description ? (
                  <div style={{
                    ...SANS, fontSize: 12, color: 'var(--text-secondary)',
                    marginBottom: 8, lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {wf.description}
                  </div>
                ) : null}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
                  <span style={{
                    ...SANS, fontSize: 11, fontWeight: 500,
                    padding: '2px 8px', borderRadius: 999,
                    background: 'var(--bg-hover)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    flexShrink: 0,
                  }}>
                    {modeShort(wf.execution_mode)}
                  </span>
                  <span style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                    {nodeCount} nodes
                  </span>
                  <span style={{
                    ...SANS, fontSize: 11, color: 'var(--text-tertiary)',
                    marginLeft: 'auto', flexShrink: 0,
                  }}>
                    {relativeTime(wf.updated_at || wf.created_at)}
                  </span>
                </div>
              </div>
                )
              })
          )}
        </div>

        {/* Run history in left panel */}
        {selected && (
          <div className="wf-run-history" style={{
            borderTop: '1px solid var(--border)',
            maxHeight: '42%',
            minHeight: 160,
            overflow: 'auto',
            background: 'var(--bg-card)',
          }}>
            <RunHistoryPanel
              runs={runs}
              loading={runsBusy}
              onSelectRun={selectHistoryRun}
              selectedRunId={selectedHistoryRun?.run_id}
              workflowId={selected?.workflow_id ?? ''}
              onRunsChanged={() => {
                setSelectedHistoryRun(null)
                setCurrentRun(null)
                setInitialInput('')
                if (selected) {
                  queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns(selected.workflow_id) })
                }
                invalidateDashboardStats()
              }}
            />
          </div>
        )}
      </div>

      {/* ── Main area ── */}
      {loading ? (
        <div className="wf-detail-pane" style={{ flex: 1, minWidth: 0, display: 'flex', overflow: 'hidden' }}>
          <WorkflowsCanvasSkeleton />
        </div>
      ) : (
      <div className="wf-detail-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Toolbar */}
        <div className="wf-toolbar" style={{
          padding: 0,
          borderBottom: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-card)',
          flexShrink: 0,
        }}>
          {/* Row 1 — identity + mode / delete / save */}
          <div className="wf-toolbar-top" style={{
            padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
            borderBottom: '1px solid var(--border)',
            flexWrap: 'wrap',
          }}>
            <button
              type="button"
              className="wf-back"
              onClick={() => setMobileShowDetail(false)}
              style={{
                display: 'none',
                alignItems: 'center',
                gap: 6,
                ...SANS,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--accent-text)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                width: '100%',
                flexBasis: '100%',
              }}
            >
              <span aria-hidden>‹</span> All workflows
            </button>

            <div className="wf-toolbar-identity" style={{
              flex: 1, minWidth: 180,
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              <input
                className="wf-name-input"
                value={wfName}
                onChange={e => setWfName(e.target.value)}
                placeholder="Workflow name"
                style={{
                  ...SANS, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
                  background: 'transparent', border: 'none', outline: 'none',
                  minWidth: 140, flex: '0 1 auto', padding: 0,
                }}
              />
              <span style={{
                ...SANS, fontSize: 11, fontWeight: 500, flexShrink: 0,
                padding: '2px 8px', borderRadius: 999,
                background: 'var(--bg-hover)', color: 'var(--text-tertiary)',
                border: '1px solid var(--border)',
              }}>
                {nodes.length} nodes
              </span>
              <span className="wf-toolbar-sep" style={{ color: 'var(--border)', fontSize: 16, flexShrink: 0 }} aria-hidden>|</span>
              <input
                className="wf-desc-input"
                value={wfDesc}
                onChange={e => setWfDesc(e.target.value)}
                placeholder="Description (optional)"
                style={{
                  ...SANS, fontSize: 13, color: 'var(--text-secondary)',
                  background: 'transparent', border: 'none', outline: 'none',
                  minWidth: 140, flex: 1, padding: 0,
                }}
              />
              <button
                type="button"
                onClick={() => { setExpandPageValue(wfDesc); setExpandPage({ field: 'wfDesc', label: 'Workflow Description' }) }}
                title="Edit in full view"
                style={{
                  ...SANS, fontSize: 11, padding: '2px 6px', flexShrink: 0,
                  background: 'var(--bg-hover)', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', borderRadius: 6, cursor: 'pointer',
                }}
              >↗</button>
            </div>

            <div className="wf-toolbar-actions" style={{
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto',
            }}>
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                <span style={{
                  position: 'absolute', left: 10, pointerEvents: 'none',
                  color: 'var(--accent-text)', fontSize: 13, lineHeight: 1,
                }}>
                  {modeIcons[execMode]}
                </span>
                <select
                  value={execMode}
                  onChange={e => setExecMode(e.target.value as ExecutionMode)}
                  title={MODE_LABELS[execMode]}
                  style={{
                    ...SANS, fontSize: 12, fontWeight: 500,
                    padding: '7px 28px 7px 28px',
                    background: 'var(--bg-card)', color: 'var(--text-primary)',
                    border: '1px solid var(--border)', borderRadius: 8,
                    cursor: 'pointer', outline: 'none', appearance: 'none',
                    WebkitAppearance: 'none', width: 248,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                  }}
                >
                  {(Object.entries(MODE_LABELS) as [ExecutionMode, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className={`wf-delete-btn${!selected ? ' is-placeholder' : ''}`}
                disabled={!selected}
                onClick={() => { if (selected) doDeleteWorkflow(selected.workflow_id) }}
                style={{
                  ...SANS, fontSize: 13, fontWeight: 500,
                  padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 7,
                  background: 'var(--invalid-dim)', color: 'var(--invalid)',
                  border: '1px solid rgba(239, 68, 68, 0.28)', borderRadius: 10,
                  cursor: selected ? 'pointer' : 'default',
                  visibility: selected ? 'visible' : 'hidden',
                  pointerEvents: selected ? 'auto' : 'none',
                  flexShrink: 0,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M9 4h6M10 4V3h4v1M5 7h14M8 7l.8 12.5a1.5 1.5 0 0 0 1.5 1.5h3.4a1.5 1.5 0 0 0 1.5-1.5L16 7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10.5 11v5.5M13.5 11v5.5" strokeLinecap="round" />
                </svg>
                Delete
              </button>

              <button
                type="button"
                className="wf-save-btn"
                onClick={saveWorkflow}
                disabled={saving}
                style={{
                  ...SANS, fontSize: 13, fontWeight: 600,
                  padding: '7px 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: 'var(--accent)', color: '#FFFFFF',
                  border: 'none', borderRadius: 8, cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  minWidth: 108, flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M5 3h11l3 3v15H5V3z" strokeLinejoin="round" />
                  <path d="M8 3v6h8V3M8 21v-7h8v7" strokeLinejoin="round" />
                </svg>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {/* Mobile / tablet detail tabs */}
          <div className="wf-mobile-tabs" role="tablist" aria-label="Workflow sections">
            {([
              { id: 'canvas' as const, label: 'Canvas' },
              { id: 'run' as const, label: 'Run Result' },
              { id: 'history' as const, label: 'History' },
            ]).map(t => {
              const active = mobileTab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`wf-mobile-tab${active ? ' is-active' : ''}`}
                  onClick={() => setMobileTab(t.id)}
                >
                  {t.id === 'history' && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" strokeLinecap="round" />
                    </svg>
                  )}
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Row 2 — ADD tools left, auto layout + zoom right */}
          <div className={`wf-toolbar-bottom${mobileTab !== 'canvas' ? ' wf-mobile-hide' : ''}`} style={{
            padding: '10px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
            flexWrap: 'wrap',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, flexWrap: 'wrap',
            }}>
              <span style={{
                ...SANS, fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
                letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 2,
              }}>
                Add
              </span>
              {([
                { type: 'agent', label: 'Agent', show: true },
                { type: 'orchestrator', label: 'Orchestrator', show: execMode === 'hierarchical' || execMode === 'hybrid' },
                { type: 'fan_out', label: 'Fan-out', show: execMode === 'hybrid' },
                { type: 'loop', label: 'Loop', show: execMode === 'hybrid' },
                { type: 'condition', label: 'Condition', show: execMode === 'hybrid' },
                { type: 'switch', label: 'Switch', show: execMode === 'hybrid' },
                { type: 'subworkflow', label: 'Sub-flow', show: execMode === 'hybrid' },
                { type: 'collaborative_node', label: 'Collab', show: execMode === 'hybrid' },
              ] as const).filter(b => b.show).map(b => (
                <button
                  key={b.type}
                  type="button"
                  onClick={() => addNode(b.type)}
                  style={{
                    ...MONO, fontSize: 11, fontWeight: 500,
                    padding: '6px 10px',
                    background: 'var(--accent-soft)',
                    color: 'var(--text-primary)',
                    border: '1px solid transparent',
                    borderRadius: 8, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <span style={{ color: 'var(--accent-text)', fontWeight: 700 }}>+</span>
                  {b.label}
                </button>
              ))}

              {connectingFrom && (
                <span style={{
                  ...SANS, fontSize: 11, color: '#F59E0B',
                  padding: '4px 10px', background: '#F59E0B20',
                  border: '1px solid #F59E0B40', borderRadius: 8,
                }}>
                  Click target node — Esc to cancel
                </span>
              )}
            </div>

            <div className="wf-toolbar-view" style={{
              display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 'auto',
            }}>
              <button
                type="button"
                onClick={execMode === 'hybrid' ? undefined : autoLayout}
                disabled={execMode === 'hybrid'}
                title={execMode === 'hybrid' ? 'Auto Layout is disabled in hybrid mode to preserve manual edges' : 'Auto layout'}
                style={{
                  ...SANS, fontSize: 13, fontWeight: 500,
                  padding: '6px 4px',
                  background: 'none', border: 'none',
                  color: 'var(--text-primary)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  opacity: execMode === 'hybrid' ? 0.4 : 1,
                  cursor: execMode === 'hybrid' ? 'not-allowed' : 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <rect x="3" y="3" width="18" height="6" rx="1" />
                  <rect x="3" y="13" width="8" height="8" rx="1" />
                  <rect x="13" y="13" width="8" height="8" rx="1" />
                </svg>
                Auto layout
              </button>

              <div style={{
                display: 'inline-flex', alignItems: 'center',
                border: '1px solid var(--border)', borderRadius: 999,
                background: 'var(--bg-card)', overflow: 'hidden',
              }}>
                <button
                  type="button"
                  onClick={zoomOut}
                  title="Zoom out (Ctrl+scroll)"
                  style={{
                    ...SANS, fontSize: 14, lineHeight: 1, padding: '6px 10px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-primary)',
                  }}
                >−</button>
                <button
                  type="button"
                  onClick={zoomReset}
                  title="Reset zoom"
                  style={{
                    ...SANS, fontSize: 12, fontWeight: 500, minWidth: 44,
                    padding: '6px 4px', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--text-primary)',
                    borderLeft: '1px solid var(--border)',
                    borderRight: '1px solid var(--border)',
                  }}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  title="Zoom in (Ctrl+scroll)"
                  style={{
                    ...SANS, fontSize: 14, lineHeight: 1, padding: '6px 10px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-primary)',
                  }}
                >+</button>
              </div>
            </div>
          </div>
        </div>

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
                const p = getPortPos(fromNode, portDrag.fromSide, portDrag.fromOffset)
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
                  const h = getNodeH(n)
                  const isDest = showPortsFor === 'all'
                  return (['top', 'bottom', 'left', 'right'] as const).flatMap(side => {
                    const offs = (side === 'left' || side === 'right') ? portOffsets(h) : portOffsets(NODE_W)
                    return offs.map(off => {
                      const p = getPortPos(n, side, off)
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

        {/* Run panel */}
        <div
          className={`wf-run-panel${mobileTab !== 'run' ? ' wf-mobile-hide' : ''}`}
          style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-card)',
          flexShrink: 0,
        }}>
          <div className="wf-run-controls" style={{
            padding: '12px 20px',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <input
              className="wf-run-input"
              value={initialInput}
              onChange={e => setInitialInput(e.target.value)}
              placeholder="Initial prompt / input for the workflow…"
              style={{
                flex: 1, minWidth: 200, fontSize: 13, ...SANS,
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
              className="wf-run-btn"
              onClick={doRun}
              disabled={running || !selected}
              style={{
                ...MONO, fontSize: 12, padding: '7px 20px',
                background: running ? '#10B98144' : 'var(--accent)',
                color: 'var(--btn-upload-text)', border: 'none', borderRadius: 6,
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
          <div className="wf-mode-tabs" style={{ padding: '0 20px 10px' }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {allModes.map(m => (
                <div key={m} style={{
                  ...MONO, fontSize: 10,
                  color: execMode === m ? 'var(--accent-text)' : 'var(--text-muted)',
                  cursor: 'pointer', padding: '3px 0',
                  borderBottom: execMode === m ? '2px solid var(--accent)' : '2px solid transparent',
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
          <div className={mobileTab !== 'run' ? 'wf-mobile-hide' : undefined} style={{ flexShrink: 0, position: 'relative' }}>
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
                    if (selected) {
                      queryClient.setQueryData<WorkflowRun[]>(queryKeys.workflowRuns(selected.workflow_id), (prev = []) =>
                        prev.map(r => r.run_id === updated.run_id ? updated : r)
                      )
                      pollRun(selected.workflow_id, updated)
                    }
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Mobile / tablet History tab */}
        <div
          className={`wf-mobile-history${mobileTab !== 'history' ? ' wf-mobile-hide' : ''}`}
        >
          {selected ? (
            <RunHistoryPanel
              runs={runs}
              loading={runsBusy}
              onSelectRun={selectHistoryRun}
              selectedRunId={selectedHistoryRun?.run_id}
              workflowId={selected.workflow_id}
              onRunsChanged={() => {
                setSelectedHistoryRun(null)
                setCurrentRun(null)
                setInitialInput('')
                queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns(selected.workflow_id) })
                invalidateDashboardStats()
              }}
            />
          ) : (
            <div style={{
              padding: 24, textAlign: 'center', color: 'var(--text-muted)',
              ...SANS, fontSize: 13,
            }}>
              Save the workflow to view run history.
            </div>
          )}
        </div>
      </div>
      )}

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
              <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color: 'var(--accent-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
                border: '1px solid var(--blue-border)',
                borderRadius: 7, resize: 'vertical',
                fontFamily: 'var(--font-sans)',
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
                style={{ ...MONO, fontSize: 11, padding: '7px 18px', background: 'var(--accent)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--btn-upload-text)', fontWeight: 700 }}
              >Apply</button>
            </div>
          </div>
        </div>
      )}

      {deleteWfTarget && (
        <ConfirmModal
          message="Delete this workflow and all its run history? This cannot be undone."
          confirmLabel="Delete Workflow"
          onConfirm={confirmDeleteWorkflow}
          onClose={() => setDeleteWfTarget(null)}
        />
      )}
    </div>
  )
}
