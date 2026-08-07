import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ConfirmModal from '../../../shared/components/ui/ConfirmModal'
import AgentPanel from '../components/AgentPanel'
import AgentChat from '../components/AgentChat'
import { type AgentRecord, listAgents, deleteAgent } from '../api/agents.api'
import { listTools } from '../../tools/api/tools.api'
import { getCatalog } from '../../community-tools/api/communityTools.api'
import { listWorkflows, type WorkflowRecord } from '../../workflows/api/workflows.api'
import { invalidateDashboardStats } from '../../../shared/api/queryClient'
import { queryKeys } from '../../../shared/api/queryKeys'
import { AgentChip } from '../components/AgentChip'
import { AgentTag } from '../components/AgentTag'
import { AgentActionBtn } from '../components/AgentActionBtn'
import { AgentsListSkeleton } from '../components/AgentsListSkeleton'
import {
  BUILTIN_TOOLS,
  MONO,
  SANS,
  FIELD,
  SELECT,
  MODEL_LABELS,
  PROVIDER_LABELS,
  type PanelState,
} from '../lib/agentsUi'

export default function AgentsPage() {
  const queryClient = useQueryClient()
  const [panel, setPanel] = useState<PanelState>({ open: false })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AgentRecord | null>(null)
  const [chatAgent, setChatAgent] = useState<AgentRecord | null>(null)
  const [search, setSearch] = useState('')
  const [filterProvider, setFilterProvider] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [filterWorkflow, setFilterWorkflow] = useState('')

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: queryKeys.agents,
    queryFn: () => listAgents().catch(() => [] as AgentRecord[]),
  })

  const { data: workflows = [] } = useQuery({
    queryKey: queryKeys.workflows,
    queryFn: () => listWorkflows().catch(() => [] as WorkflowRecord[]),
  })

  const { data: toolsData } = useQuery({
    queryKey: queryKeys.tools,
    queryFn: () => listTools().catch(() => []),
  })

  const { data: catalogData } = useQuery({
    queryKey: queryKeys.communityCatalog,
    queryFn: () => getCatalog().catch(() => []),
  })

  const availableTools = useMemo(() => {
    const customNames = (toolsData ?? []).map((t) => t.name)
    return [...BUILTIN_TOOLS, ...customNames]
  }, [toolsData])

  const communityTools = useMemo(
    () => (catalogData ?? []).filter(t => t.is_enabled).map(t => t.name),
    [catalogData],
  )

  const loading = agentsLoading

  const handleSave = (saved: AgentRecord) => {
    queryClient.setQueryData<AgentRecord[]>(queryKeys.agents, (prev = []) => {
      const exists = prev.find((a) => a.agent_id === saved.agent_id)
      return exists
        ? prev.map((a) => (a.agent_id === saved.agent_id ? saved : a))
        : [saved, ...prev]
    })
    invalidateDashboardStats()
  }

  const handleDelete = (agent: AgentRecord) => setDeleteTarget(agent)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const agentId = deleteTarget.agent_id
    setDeleteTarget(null)
    setDeletingId(agentId)
    try {
      await deleteAgent(agentId)
      queryClient.setQueryData<AgentRecord[]>(queryKeys.agents, (prev = []) =>
        prev.filter((a) => a.agent_id !== agentId),
      )
      invalidateDashboardStats()
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

  const uniqueProviders = useMemo(() => [...new Set(agents.map(a => a.provider))], [agents])
  const uniqueModels = useMemo(() => [...new Set(agents.map(a => a.model_id))], [agents])

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
    <div
      className="agents-page"
      style={{
      height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: 'var(--bg-surface)', ...SANS,
    }}>

      {/* ── Header ── */}
      <div
        className="agents-header"
        style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 20, padding: '20px 28px 16px', flexShrink: 0, flexWrap: 'wrap',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
      }}>
        <div className="agents-header-copy">
          <div style={{
            ...MONO, fontSize: 10, fontWeight: 600,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--accent)', marginBottom: 6,
          }}>
            Configuration
          </div>
          <h2 style={{
            ...SANS, fontSize: 16, fontWeight: 500, color: 'var(--text-heading)', margin: 0,
          }}>Agents</h2>
          <p style={{
            ...SANS, fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0,
          }}>
            Configure AI agents: assign tools, pick a model, and set a system prompt.
          </p>
        </div>
        <button
          className="agents-new-btn"
          onClick={() => setPanel({ open: true, mode: 'create' })}
          style={{
            ...SANS, fontSize: 13, fontWeight: 600, marginTop: 4, flexShrink: 0,
            padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
            background: 'var(--accent)', color: 'var(--btn-upload-text)',
            border: '1px solid var(--accent)',
            display: 'inline-flex', alignItems: 'center', gap: 7,
            boxShadow: 'none',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          New Agent
        </button>
      </div>

      {/* ── Search + Filters ── */}
      {!loading && agents.length > 0 && (
        <div
          className="agents-filters"
          style={{
          padding: '12px 28px', borderBottom: '1px solid var(--border)',
          display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap',
          background: 'var(--bg-surface)',
        }}>
          <div className="agents-search" style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents by name or description…"
              style={{ ...FIELD, width: '100%', paddingLeft: 36 }}
              onFocus={e => {
                e.target.style.borderColor = 'var(--accent)'
                e.target.style.boxShadow = '0 0 0 3px var(--accent-soft)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'var(--border)'
                e.target.style.boxShadow = 'none'
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-tertiary)',
                cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0,
              }}>×</button>
            )}
          </div>

          <select
            className="agents-filter-select"
            value={filterProvider}
            onChange={e => setFilterProvider(e.target.value)}
            style={SELECT}
            onFocus={e => {
              e.target.style.borderColor = 'var(--accent)'
              e.target.style.boxShadow = '0 0 0 3px var(--accent-soft)'
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--border)'
              e.target.style.boxShadow = 'none'
            }}
          >
            <option value="">All Providers</option>
            {uniqueProviders.map(p => (
              <option key={p} value={p}>{PROVIDER_LABELS[p] ?? p}</option>
            ))}
          </select>

          <select
            className="agents-filter-select"
            value={filterModel}
            onChange={e => setFilterModel(e.target.value)}
            style={SELECT}
            onFocus={e => {
              e.target.style.borderColor = 'var(--accent)'
              e.target.style.boxShadow = '0 0 0 3px var(--accent-soft)'
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--border)'
              e.target.style.boxShadow = 'none'
            }}
          >
            <option value="">All Models</option>
            {uniqueModels.map(m => (
              <option key={m} value={m}>{MODEL_LABELS[m] ?? m}</option>
            ))}
          </select>

          <select
            className="agents-filter-select"
            value={filterWorkflow}
            onChange={e => setFilterWorkflow(e.target.value)}
            style={{ ...SELECT, minWidth: 168 }}
            onFocus={e => {
              e.target.style.borderColor = 'var(--accent)'
              e.target.style.boxShadow = '0 0 0 3px var(--accent-soft)'
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--border)'
              e.target.style.boxShadow = 'none'
            }}
          >
            <option value="">All Workflows</option>
            {workflows.map(wf => (
              <option key={wf.workflow_id} value={wf.workflow_id}>{wf.name}</option>
            ))}
          </select>

          {hasFilters && (
            <div className="agents-filter-meta" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ ...MONO, fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                {filtered.length} of {agents.length}
              </span>
              <button onClick={clearFilters} style={{
                ...SANS, fontSize: 12, padding: '7px 12px',
                background: 'var(--bg-hover)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Scrollable list ── */}
      <div className="agents-list" style={{ flex: 1, overflowY: 'auto', padding: '16px 28px 32px', background: 'var(--bg-surface)' }}>

        {loading ? (
          <AgentsListSkeleton count={5} />
        ) : agents.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '64px 24px',
            background: 'var(--card-bg)',
            borderRadius: 12,
            border: '1px solid var(--card-border)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, background: 'var(--accent-soft)',
              border: '1px solid var(--blue-border)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/>
                <path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
              </svg>
            </div>
            <div style={{ ...SANS, fontSize: 16, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 6 }}>
              No agents yet
            </div>
            <p style={{ ...SANS, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.55 }}>
              Create your first agent to assign tools and start running workflows.
            </p>
            <button
              onClick={() => setPanel({ open: true, mode: 'create' })}
              style={{
                ...SANS, fontSize: 13, fontWeight: 600,
                padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
                background: 'var(--accent)', color: 'var(--btn-upload-text)',
                border: '1px solid var(--accent)',
              }}
            >
              Create Agent
            </button>
          </div>
        ) : agents.length > 0 && filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 0',
            ...SANS, color: 'var(--text-secondary)', fontSize: 13,
          }}>
            No agents match the current filters.
          </div>
        ) : filtered.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((agent) => {
              const isDeleting = deletingId === agent.agent_id
              const isAnthropic = agent.provider === 'anthropic'
              const modelLabel = MODEL_LABELS[agent.model_id] ?? agent.model_id
              const agentWorkflows = workflows.filter(wf => workflowAgentMap[wf.workflow_id]?.has(agent.agent_id))
              const toolCount = agent.tool_names.length + (agent.mcp_tools ?? []).length

              return (
                <div
                  key={agent.agent_id}
                  className="agents-card"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderLeft: `3px solid ${isAnthropic ? 'var(--accent)' : 'var(--text-tertiary)'}`,
                    borderRadius: 10,
                    overflow: 'hidden',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--border-strong)'
                    e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--card-border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div
                    className="agents-card-main"
                    style={{
                    padding: '14px 18px',
                    display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 14,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span className="agents-card-title" style={{
                          ...MONO, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)',
                          wordBreak: 'break-word',
                        }}>
                          {agent.name}
                        </span>
                        <AgentChip label={modelLabel} tone="accent" />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        <AgentChip
                          label={PROVIDER_LABELS[agent.provider] ?? agent.provider}
                          tone="muted"
                        />
                        {toolCount > 0 && (
                          <AgentChip label={`${toolCount} tool${toolCount === 1 ? '' : 's'}`} tone="neutral" />
                        )}
                      </div>

                      {agent.description && (
                        <div
                          className="agents-card-desc"
                          style={{
                          ...SANS, fontSize: 13, color: 'var(--text-secondary)', marginTop: 10,
                          lineHeight: 1.55,
                        }}>
                          {agent.description}
                        </div>
                      )}

                      {(agent.tool_names.length > 0 || (agent.mcp_tools ?? []).length > 0) ? (
                        <div className="agents-card-tools" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                          {agent.tool_names.map((t) => (
                            <AgentTag key={t}>{t}</AgentTag>
                          ))}
                          {(agent.mcp_tools ?? []).map((m) => (
                            <AgentTag key={`${m.server_id}:${m.tool_name}`}>{m.tool_name}</AgentTag>
                          ))}
                        </div>
                      ) : (
                        <div style={{ ...MONO, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 12 }}>
                          No tools assigned
                        </div>
                      )}

                      {agentWorkflows.length > 0 && (
                        <div className="agents-card-workflows" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                          <span style={{
                            ...MONO, fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
                            textTransform: 'uppercase', color: 'var(--text-tertiary)',
                          }}>
                            Workflows
                          </span>
                          {agentWorkflows.map(wf => (
                            <AgentTag key={wf.workflow_id}>{wf.name}</AgentTag>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="agents-card-footer">
                      <div className="agents-card-actions" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <AgentActionBtn variant="accent" onClick={() => setChatAgent(agent)}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                          Test
                        </AgentActionBtn>
                        <AgentActionBtn variant="accent" onClick={() => setPanel({ open: true, mode: 'edit', agent })}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                          </svg>
                          Edit
                        </AgentActionBtn>
                        <AgentActionBtn variant="danger" disabled={isDeleting} onClick={() => handleDelete(agent)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>
                          </svg>
                          {isDeleting ? '…' : 'Delete'}
                        </AgentActionBtn>
                      </div>
                      <div className="agents-card-meta">
                        <div style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)' }}>
                          Created {formatDate(agent.created_at)}
                        </div>
                        {agent.updated_at !== agent.created_at && (
                          <div style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                            Updated {formatDate(agent.updated_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

      {panel.open && (
        <AgentPanel
          mode={panel.mode}
          agent={panel.mode === 'edit' ? panel.agent : undefined}
          availableTools={availableTools}
          communityTools={communityTools}
          onSave={handleSave}
          onClose={() => setPanel({ open: false })}
        />
      )}

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
