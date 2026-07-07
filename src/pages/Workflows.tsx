import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { AgentRecord, listAgents } from '../api/agents'
import {
  WorkflowRecord, RunResult,
  listWorkflows, createWorkflow, updateWorkflow, deleteWorkflow, runWorkflow,
} from '../api/workflows'
import { ApiError } from '../api/client'

// ─── helpers ────────────────────────────────────────────────────────────────

let _stepCounter = 0
const newStepId = () => `step_${++_stepCounter}_${Math.random().toString(36).slice(2, 7)}`

const MODEL_SHORT: Record<string, string> = {
  'claude-sonnet-5': 'Sonnet 5', 'claude-sonnet-4-6': 'Sonnet 4.6',
  'claude-opus-4-8': 'Opus 4.8', 'claude-haiku-4-5': 'Haiku 4.5',
  'claude-fable-5': 'Fable 5',
  'gpt-4.1': 'GPT-4.1', 'gpt-4.1-mini': 'GPT-4.1 mini',
  'gpt-4o': 'GPT-4o', 'gpt-4o-mini': 'GPT-4o mini',
}

const fmt = (iso: string) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return '—' }
}

const MONO = { fontFamily: 'var(--font-mono)' }

// ─── types ──────────────────────────────────────────────────────────────────

type View = { mode: 'list' } | { mode: 'detail'; workflow: WorkflowRecord }

interface DraftStep {
  step_id: string
  agent_id: string
}

// ─── sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      ...MONO, fontSize: 10, fontWeight: 600,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      color: 'var(--text-body)', marginBottom: 10,
    }}>
      {children}
    </div>
  )
}

function RunPanel({
  workflow, onClose,
}: { workflow: WorkflowRecord; onClose: () => void }) {
  const [input, setInput] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggle = (i: number) =>
    setExpanded(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n })

  const handleRun = async () => {
    if (!input.trim()) { setError('Enter an initial input.'); return }
    setRunning(true); setError(''); setResult(null)
    try {
      const r = await runWorkflow(workflow.workflow_id, input.trim(), apiKey)
      setResult(r)
      setExpanded(new Set(r.steps.map((_, i) => i)))
    } catch (e) {
      setError(e instanceof ApiError ? String(e.detail) : String(e))
    } finally { setRunning(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <SectionLabel>Initial Input</SectionLabel>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Enter the starting message for the pipeline…"
          rows={3}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 8,
            border: '1px solid var(--border-light)',
            ...MONO, fontSize: 12.5, lineHeight: 1.7, resize: 'vertical',
            color: 'var(--text-dark)', background: '#fff', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div>
        <SectionLabel>API Key</SectionLabel>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-… or anthropic key"
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 8,
            border: '1px solid var(--border-light)',
            ...MONO, fontSize: 12.5,
            color: 'var(--text-dark)', background: '#fff', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button variant="primary" size="sm" onClick={handleRun} loading={running}>
          {running ? 'Running pipeline…' : '▶ Run Workflow'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        {error && <span style={{ ...MONO, fontSize: 11, color: 'var(--invalid)', flex: 1 }}>{error}</span>}
      </div>

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Token summary */}
          <div style={{
            display: 'flex', gap: 16, padding: '10px 14px',
            background: 'rgba(34,197,94,0.04)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 8,
          }}>
            {[
              { label: 'Steps', value: result.steps.length },
              { label: 'Input tokens', value: result.total_input_tokens.toLocaleString() },
              { label: 'Output tokens', value: result.total_output_tokens.toLocaleString() },
            ].map(m => (
              <div key={m.label}>
                <div style={{ ...MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-body)' }}>{m.label}</div>
                <div style={{ ...MONO, fontSize: 15, fontWeight: 700, color: 'var(--text-dark)' }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Step results */}
          {result.steps.map((step, i) => (
            <div key={i} style={{
              border: '1px solid var(--border-light)',
              borderRadius: 10, overflow: 'hidden',
            }}>
              <button
                onClick={() => toggle(i)}
                style={{
                  width: '100%', padding: '10px 14px',
                  background: 'var(--bg-dark)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    ...MONO, fontSize: 10, fontWeight: 700,
                    background: 'var(--blue-dim)', border: '1px solid var(--blue-border)',
                    color: 'var(--blue)', borderRadius: 4, padding: '1px 7px',
                  }}>
                    {step.step_order + 1}
                  </span>
                  <span style={{ ...MONO, fontSize: 13, fontWeight: 600, color: '#fff' }}>
                    {step.agent_name}
                  </span>
                  <span style={{ ...MONO, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {MODEL_SHORT[step.model_id] ?? step.model_id}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ ...MONO, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                    {step.input_tokens + step.output_tokens} tok
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                    {expanded.has(i) ? '▲' : '▼'}
                  </span>
                </div>
              </button>
              {expanded.has(i) && (
                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div style={{ ...MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-body)', marginBottom: 5 }}>Input</div>
                    <pre style={{ ...MONO, fontSize: 11.5, color: 'var(--text-body)', background: 'rgba(11,16,32,0.04)', border: '1px solid var(--border-light)', borderRadius: 6, padding: '10px 12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
                      {step.input_text}
                    </pre>
                  </div>
                  <div>
                    <div style={{ ...MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--verified)', marginBottom: 5 }}>Output</div>
                    <pre style={{ ...MONO, fontSize: 11.5, color: 'var(--text-dark)', background: 'rgba(34,197,94,0.03)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '10px 12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
                      {step.output_text}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function Workflows() {
  const [view, setView] = useState<View>({ mode: 'list' })
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([])
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // detail/edit state
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [draftSteps, setDraftSteps] = useState<DraftStep[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showRun, setShowRun] = useState(false)

  // create form (list view)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    listWorkflows().then(setWorkflows).catch(() => {})
    listAgents().then(setAgents).catch(() => {})
  }, [])

  const agentMap = Object.fromEntries(agents.map(a => [a.agent_id, a]))

  // ── list actions ──

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const w = await createWorkflow({ name: newName.trim(), description: newDesc, steps: [] })
      setWorkflows(p => [w, ...p])
      setNewName(''); setNewDesc(''); setShowCreate(false)
      openDetail(w)
    } catch { /* stay */ } finally { setCreating(false) }
  }

  const handleDelete = async (workflow: WorkflowRecord) => {
    setDeletingId(workflow.workflow_id)
    try {
      await deleteWorkflow(workflow.workflow_id)
      setWorkflows(p => p.filter(w => w.workflow_id !== workflow.workflow_id))
    } catch { /* stay */ } finally { setDeletingId(null) }
  }

  // ── detail actions ──

  const openDetail = (w: WorkflowRecord) => {
    setEditName(w.name)
    setEditDesc(w.description)
    setDraftSteps(w.steps.map(s => ({ step_id: s.step_id, agent_id: s.agent_id })))
    setSaveError('')
    setShowRun(false)
    setView({ mode: 'detail', workflow: w })
  }

  const addStep = (agentId: string) => {
    setDraftSteps(p => [...p, { step_id: newStepId(), agent_id: agentId }])
  }

  const removeStep = (idx: number) => {
    setDraftSteps(p => p.filter((_, i) => i !== idx))
  }

  const moveStep = (idx: number, dir: -1 | 1) => {
    setDraftSteps(p => {
      const next = [...p]
      const target = idx + dir
      if (target < 0 || target >= next.length) return p;
      [next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  const handleSave = async () => {
    if (view.mode !== 'detail') return
    if (!editName.trim()) { setSaveError('Name is required.'); return }
    setSaving(true); setSaveError('')
    try {
      const updated = await updateWorkflow(view.workflow.workflow_id, {
        name: editName.trim(),
        description: editDesc,
        steps: draftSteps.map((s, i) => ({ step_id: s.step_id, agent_id: s.agent_id, label: '', step_order: i })),
      })
      setWorkflows(p => p.map(w => w.workflow_id === updated.workflow_id ? updated : w))
      setView({ mode: 'detail', workflow: updated })
    } catch (e) {
      setSaveError(e instanceof ApiError ? String(e.detail) : String(e))
    } finally { setSaving(false) }
  }

  // ── render: list ──

  if (view.mode === 'list') {
    return (
      <div style={{ padding: '40px 48px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <div style={{ ...MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 6 }}>Builder</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-dark)' }}>Workflows</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-body)', marginTop: 4 }}>
              Chain agents into multi-step pipelines. Output of each step feeds into the next.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => setShowCreate(v => !v)} style={{ marginTop: 4 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            New Workflow
          </Button>
        </div>

        {/* Quick-create form */}
        {showCreate && (
          <div style={{ marginBottom: 20, padding: '20px 24px', background: 'var(--bg-card)', border: '1px solid var(--blue-border)', borderRadius: 12 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 2, minWidth: 180 }}>
                <label style={{ ...MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-body)', display: 'block', marginBottom: 6 }}>Name</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. research-pipeline"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)', ...MONO, fontSize: 13, color: 'var(--text-dark)', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 3, minWidth: 220 }}>
                <label style={{ ...MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-body)', display: 'block', marginBottom: 6 }}>Description</label>
                <input
                  type="text"
                  placeholder="What does this pipeline do?"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-dark)', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="primary" size="sm" onClick={handleCreate} loading={creating}>Create</Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setNewName(''); setNewDesc('') }}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {workflows.length === 0 && !showCreate && (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>⚡</div>
            <div style={{ ...MONO, fontSize: 14, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 6 }}>No workflows yet</div>
            <p style={{ fontSize: 13, color: 'var(--text-body)', marginBottom: 20 }}>Create a workflow to chain agents into a multi-step pipeline.</p>
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>Create Workflow</Button>
          </div>
        )}

        {/* Workflow cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {workflows.map(w => (
            <Card key={w.workflow_id} hoverable>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                    <span style={{ ...MONO, fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>{w.name}</span>
                    <span style={{ ...MONO, fontSize: 11, padding: '1px 8px', borderRadius: 4, background: 'rgba(11,16,32,0.06)', border: '1px solid var(--border-light)', color: 'var(--text-body)' }}>
                      {w.steps.length} {w.steps.length === 1 ? 'step' : 'steps'}
                    </span>
                  </div>
                  {w.description && <p style={{ fontSize: 13, color: 'var(--text-body)', marginBottom: 10, lineHeight: 1.55 }}>{w.description}</p>}
                  {/* Agent chain preview */}
                  {w.steps.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {w.steps.slice().sort((a, b) => a.step_order - b.step_order).map((s, i) => {
                        const ag = agentMap[s.agent_id]
                        return (
                          <div key={s.step_id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {i > 0 && <span style={{ color: 'var(--blue)', fontSize: 12, opacity: 0.5 }}>→</span>}
                            <span style={{ ...MONO, fontSize: 11, padding: '2px 9px', borderRadius: 4, background: 'var(--blue-dim)', border: '1px solid var(--blue-border)', color: 'var(--blue)' }}>
                              {ag?.name ?? s.agent_id.slice(0, 8)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="ghost" size="sm" onClick={() => openDetail(w)}>Edit</Button>
                    <Button variant="danger" size="sm" loading={deletingId === w.workflow_id} onClick={() => handleDelete(w)}>Delete</Button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-body)' }}>Created {fmt(w.created_at)}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ── render: detail ──

  const wf = view.workflow

  return (
    <div style={{ padding: '40px 48px', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => { setView({ mode: 'list' }); setShowRun(false) }}
            style={{ background: 'transparent', border: '1px solid var(--border-light)', borderRadius: 7, padding: '5px 11px', cursor: 'pointer', color: 'var(--text-body)', fontSize: 12 }}
          >
            ← Back
          </button>
          <div>
            <div style={{ ...MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 3 }}>Workflow</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-dark)' }}>{editName || wf.name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={() => setShowRun(v => !v)}>
            {showRun ? 'Hide Run' : '▶ Run'}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>Save</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showRun ? '1fr 1fr' : '1fr', gap: 24 }}>
        {/* Editor column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Metadata */}
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <SectionLabel>Name</SectionLabel>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)', ...MONO, fontSize: 13, color: 'var(--text-dark)', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <SectionLabel>Description</SectionLabel>
                <input
                  type="text"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="What does this pipeline do?"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-dark)', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </Card>

          {/* Steps */}
          <Card>
            <SectionLabel>Pipeline Steps</SectionLabel>

            {draftSteps.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--border-light)', borderRadius: 8, ...MONO, fontSize: 12, color: 'var(--text-body)' }}>
                No steps yet — add an agent below.
              </div>
            )}

            {draftSteps.map((s, i) => {
              const ag = agentMap[s.agent_id]
              const isAnthropic = ag?.provider === 'anthropic'
              return (
                <div key={s.step_id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--border-light)',
                  marginBottom: i < draftSteps.length - 1 ? 8 : 0,
                  background: 'rgba(11,16,32,0.02)',
                }}>
                  <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color: 'var(--blue)', minWidth: 20 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ ...MONO, fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>
                      {ag?.name ?? <span style={{ color: 'var(--invalid)' }}>Unknown agent</span>}
                    </span>
                    {ag && (
                      <span style={{
                        ...MONO, fontSize: 10, marginLeft: 8,
                        padding: '1px 7px', borderRadius: 4,
                        background: isAnthropic ? 'var(--blue-dim)' : 'rgba(11,16,32,0.06)',
                        border: `1px solid ${isAnthropic ? 'var(--blue-border)' : 'var(--border-light)'}`,
                        color: isAnthropic ? 'var(--blue)' : 'var(--text-body)',
                      }}>
                        {MODEL_SHORT[ag.model_id] ?? ag.model_id}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => moveStep(i, -1)} disabled={i === 0} style={{ background: 'transparent', border: '1px solid var(--border-light)', borderRadius: 5, padding: '3px 7px', cursor: i === 0 ? 'not-allowed' : 'pointer', opacity: i === 0 ? 0.3 : 1, fontSize: 11, color: 'var(--text-body)' }}>↑</button>
                    <button onClick={() => moveStep(i, 1)} disabled={i === draftSteps.length - 1} style={{ background: 'transparent', border: '1px solid var(--border-light)', borderRadius: 5, padding: '3px 7px', cursor: i === draftSteps.length - 1 ? 'not-allowed' : 'pointer', opacity: i === draftSteps.length - 1 ? 0.3 : 1, fontSize: 11, color: 'var(--text-body)' }}>↓</button>
                    <button onClick={() => removeStep(i)} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--invalid)' }}>✕</button>
                  </div>
                </div>
              )
            })}

            {/* Add step */}
            {agents.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  defaultValue=""
                  onChange={e => { if (e.target.value) { addStep(e.target.value); e.target.value = '' } }}
                  style={{
                    flex: 1, padding: '7px 10px', borderRadius: 8,
                    border: '1px solid var(--border-light)',
                    ...MONO, fontSize: 12.5,
                    color: 'var(--text-body)', background: '#fff', cursor: 'pointer',
                  }}
                >
                  <option value="" disabled>+ Add agent step…</option>
                  {agents.map(a => (
                    <option key={a.agent_id} value={a.agent_id}>
                      {a.name} ({MODEL_SHORT[a.model_id] ?? a.model_id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {agents.length === 0 && (
              <p style={{ fontSize: 12.5, color: 'var(--text-body)', marginTop: 10 }}>
                No agents found — create agents on the Agents page first.
              </p>
            )}

            {saveError && (
              <p style={{ ...MONO, fontSize: 11, color: 'var(--invalid)', marginTop: 8 }}>{saveError}</p>
            )}
          </Card>
        </div>

        {/* Run column */}
        {showRun && (
          <Card>
            <SectionLabel>Run Pipeline</SectionLabel>
            <RunPanel workflow={wf} onClose={() => setShowRun(false)} />
          </Card>
        )}
      </div>
    </div>
  )
}
