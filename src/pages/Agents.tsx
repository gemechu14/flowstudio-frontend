import { useState, useEffect, useMemo } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import ConfirmModal from '../components/ui/ConfirmModal'
import AgentPanel from '../components/agents/AgentPanel'
import AgentChat from '../components/agents/AgentChat'
import { AgentRecord, listAgents, deleteAgent } from '../api/agents'
import { listTools } from '../api/tools'
import { listWorkflows, WorkflowRecord } from '../api/workflows'

const BUILTIN_TOOLS: string[] = []

type PanelState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; agent: AgentRecord }

const MODEL_LABELS: Record<string, string> = {
  'claude-sonnet-5': 'Sonnet 5',
  'claude-sonnet-4-6': 'Sonnet 4.6',
  'claude-opus-4-8': 'Opus 4.8',
  'claude-haiku-4-5': 'Haiku 4.5',
  'claude-fable-5': 'Fable 5',
  'gpt-4.1': 'GPT-4.1',
  'gpt-4.1-mini': 'GPT-4.1 mini',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o mini',
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
}

const SEL: React.CSSProperties = {
  fontSize: 12, padding: '7px 10px',
  background: 'var(--bg-page)', color: 'var(--text-body)',
  border: '1px solid var(--border-light)', borderRadius: 6,
  outline: 'none', cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
}

export default function Agents() {
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([])
  const [availableTools, setAvailableTools] = useState<string[]>(BUILTIN_TOOLS)
  const [panel, setPanel] = useState<PanelState>({ open: false })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AgentRecord | null>(null)
  const [chatAgent, setChatAgent] = useState<AgentRecord | null>(null)
  const [search, setSearch] = useState('')
  const [filterProvider, setFilterProvider] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [filterWorkflow, setFilterWorkflow] = useState('')

  useEffect(() => {
    listAgents().then(setAgents).catch(() => {})
    listWorkflows().then(setWorkflows).catch(() => {})
    listTools()
      .then((apiTools) => {
        const customNames = apiTools.map((t) => t.name)
        setAvailableTools([...BUILTIN_TOOLS, ...customNames])
      })
      .catch(() => {})
  }, [])

  const handleSave = (saved: AgentRecord) => {
    setAgents((prev) => {
      const exists = prev.find((a) => a.agent_id === saved.agent_id)
      return exists
        ? prev.map((a) => (a.agent_id === saved.agent_id ? saved : a))
        : [saved, ...prev]
    })
  }

  const handleDelete = (agent: AgentRecord) => setDeleteTarget(agent)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const agentId = deleteTarget.agent_id
    setDeleteTarget(null)
    setDeletingId(agentId)
    try {
      await deleteAgent(agentId)
      setAgents((prev) => prev.filter((a) => a.agent_id !== agentId))
    } catch (e: unknown) {
      console.error('Failed to delete agent', e)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (iso: string) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return '—'
    }
  }

  // Unique values for dropdowns (derived from loaded agents)
  const uniqueProviders = useMemo(() => [...new Set(agents.map(a => a.provider))], [agents])
  const uniqueModels = useMemo(() => [...new Set(agents.map(a => a.model_id))], [agents])

  // Map workflow_id → set of agent_ids used in its nodes/steps
  const workflowAgentMap = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    for (const wf of workflows) {
      const ids = new Set<string>()
      for (const node of wf.nodes) { if (node.agent_id) ids.add(node.agent_id) }
      for (const step of wf.steps) { if (step.agent_id) ids.add(step.agent_id) }
      map[wf.workflow_id] = ids
    }
    return map
  }, [workflows])

  const filtered = useMemo(() => {
    let list = agents
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
      )
    }
    if (filterProvider) list = list.filter(a => a.provider === filterProvider)
    if (filterModel)    list = list.filter(a => a.model_id === filterModel)
    if (filterWorkflow) {
      const ids = workflowAgentMap[filterWorkflow] ?? new Set()
      list = list.filter(a => ids.has(a.agent_id))
    }
    return list
  }, [agents, search, filterProvider, filterModel, filterWorkflow, workflowAgentMap])

  const hasFilters = !!(search || filterProvider || filterModel || filterWorkflow)
  const clearFilters = () => { setSearch(''); setFilterProvider(''); setFilterModel(''); setFilterWorkflow('') }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 20, padding: '28px 36px 20px', flexShrink: 0, flexWrap: 'wrap',
        borderBottom: agents.length === 0 ? 'none' : '1px solid var(--border-light)',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--blue)', marginBottom: 6,
          }}>
            Configuration
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>Agents</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-body)', marginTop: 4, marginBottom: 0 }}>
            Configure AI agents: assign tools, pick a model, and set a system prompt.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setPanel({ open: true, mode: 'create' })}
          style={{ marginTop: 4, flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          New Agent
        </Button>
      </div>

      {/* ── Search + Filters (only when there are agents) ── */}
      {agents.length > 0 && (
        <div style={{
          padding: '12px 36px', borderBottom: '1px solid var(--border-light)',
          display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-body)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents…"
              style={{ ...SEL, width: '100%', paddingLeft: 32, boxSizing: 'border-box' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-body)',
                cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0,
              }}>×</button>
            )}
          </div>

          {/* Provider filter */}
          <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)} style={SEL}>
            <option value="">All Providers</option>
            {uniqueProviders.map(p => (
              <option key={p} value={p}>{PROVIDER_LABELS[p] ?? p}</option>
            ))}
          </select>

          {/* Model filter */}
          <select value={filterModel} onChange={e => setFilterModel(e.target.value)} style={SEL}>
            <option value="">All Models</option>
            {uniqueModels.map(m => (
              <option key={m} value={m}>{MODEL_LABELS[m] ?? m}</option>
            ))}
          </select>

          {/* Workflow filter */}
          <select value={filterWorkflow} onChange={e => setFilterWorkflow(e.target.value)} style={SEL}>
            <option value="">All Workflows</option>
            {workflows.map(wf => (
              <option key={wf.workflow_id} value={wf.workflow_id}>{wf.name}</option>
            ))}
          </select>

          {/* Result count + clear */}
          {hasFilters && (
            <>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-body)', whiteSpace: 'nowrap' }}>
                {filtered.length} of {agents.length}
              </span>
              <button onClick={clearFilters} style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, padding: '6px 12px',
                background: 'none', border: '1px solid var(--border-light)',
                color: 'var(--text-body)', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                Clear
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Scrollable list ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 36px 32px' }}>

        {/* No agents at all */}
        {agents.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '64px 24px',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>🤖</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 6 }}>
              No agents yet
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-body)', marginBottom: 20 }}>
              Create your first agent to assign tools and start running workflows.
            </p>
            <Button variant="primary" size="sm" onClick={() => setPanel({ open: true, mode: 'create' })}>
              Create Agent
            </Button>
          </div>
        )}

        {/* Filters returned nothing */}
        {agents.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-body)', fontSize: 13 }}>
            No agents match the current filters.
          </div>
        )}

        {/* Agent cards */}
        {filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((agent) => {
              const isDeleting = deletingId === agent.agent_id
              const isAnthropic = agent.provider === 'anthropic'
              const modelLabel = MODEL_LABELS[agent.model_id] ?? agent.model_id
              const agentWorkflows = workflows.filter(wf => workflowAgentMap[wf.workflow_id]?.has(agent.agent_id))

              return (
                <Card key={agent.agent_id} hoverable>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>

                      {/* Name + chips */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>
                          {agent.name}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 11, padding: '1px 9px', borderRadius: 4,
                          background: isAnthropic ? 'var(--blue-dim)' : 'rgba(11,16,32,0.06)',
                          border: `1px solid ${isAnthropic ? 'var(--blue-border)' : 'var(--border-light)'}`,
                          color: isAnthropic ? 'var(--blue)' : 'var(--text-body)',
                        }}>
                          {modelLabel}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 8px', borderRadius: 4,
                          background: 'rgba(11,16,32,0.04)', border: '1px solid var(--border-light)',
                          color: 'var(--text-body)', textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          {PROVIDER_LABELS[agent.provider] ?? agent.provider}
                        </span>
                      </div>

                      {/* Description */}
                      {agent.description && (
                        <p style={{ fontSize: 13, color: 'var(--text-body)', marginBottom: 10, lineHeight: 1.55 }}>
                          {agent.description}
                        </p>
                      )}

                      {/* Tools */}
                      {(agent.tool_names.length > 0 || (agent.mcp_tools ?? []).length > 0) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: agentWorkflows.length > 0 ? 8 : 0 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-body)', marginRight: 2 }}>
                            Tools:
                          </span>
                          {agent.tool_names.map((t) => (
                            <span key={t} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--blue)', background: 'var(--blue-dim)', border: '1px solid var(--blue-border)', borderRadius: 4, padding: '1px 8px' }}>
                              {t}
                            </span>
                          ))}
                          {(agent.mcp_tools ?? []).map((m) => (
                            <span key={`${m.server_id}:${m.tool_name}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#059669', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 4, padding: '1px 8px' }}>
                              {m.tool_name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-body)' }}>
                          No tools assigned
                        </span>
                      )}

                      {/* Workflows this agent belongs to */}
                      {agentWorkflows.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-body)', marginRight: 2 }}>
                            Workflows:
                          </span>
                          {agentWorkflows.map(wf => (
                            <span key={wf.workflow_id} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7C3AED', background: '#7C3AED10', border: '1px solid #7C3AED30', borderRadius: 4, padding: '1px 8px' }}>
                              {wf.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="primary" size="sm" onClick={() => setChatAgent(agent)}>▶ Test</Button>
                        <Button variant="ghost" size="sm" onClick={() => setPanel({ open: true, mode: 'edit', agent })}>Edit</Button>
                        <Button variant="danger" size="sm" loading={isDeleting} onClick={() => handleDelete(agent)}>Delete</Button>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-body)' }}>Created {formatDate(agent.created_at)}</div>
                        {agent.updated_at !== agent.created_at && (
                          <div style={{ fontSize: 11, color: 'var(--text-body)', marginTop: 2 }}>Updated {formatDate(agent.updated_at)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Slide panel */}
      {panel.open && (
        <AgentPanel
          mode={panel.mode}
          agent={panel.mode === 'edit' ? panel.agent : undefined}
          availableTools={availableTools}
          onSave={handleSave}
          onClose={() => setPanel({ open: false })}
        />
      )}

      {/* Chat test panel */}
      {chatAgent && (
        <AgentChat agent={chatAgent} onClose={() => setChatAgent(null)} />
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Delete agent "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete Agent"
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
