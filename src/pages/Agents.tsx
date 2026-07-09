import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import AgentPanel from '../components/agents/AgentPanel'
import AgentChat from '../components/agents/AgentChat'
import { AgentRecord, listAgents, deleteAgent } from '../api/agents'
import { listTools } from '../api/tools'

const BUILTIN_TOOLS = ['web_search', 'run_sql', 'send_slack', 'get_schema']

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

export default function Agents() {
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [availableTools, setAvailableTools] = useState<string[]>(BUILTIN_TOOLS)
  const [panel, setPanel] = useState<PanelState>({ open: false })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [chatAgent, setChatAgent] = useState<AgentRecord | null>(null)

  useEffect(() => {
    listAgents().then(setAgents).catch(() => {})
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

  const handleDelete = async (agent: AgentRecord) => {
    setDeletingId(agent.agent_id)
    try {
      await deleteAgent(agent.agent_id)
      setAgents((prev) => prev.filter((a) => a.agent_id !== agent.agent_id))
    } catch {
      // stay in list
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

  return (
    <div style={{ padding: '40px 48px', width: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 20,
        marginBottom: 28, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--blue)', marginBottom: 6,
          }}>
            Configuration
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-dark)' }}>Agents</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-body)', marginTop: 4 }}>
            Configure AI agents — assign tools, pick a model, and set a system prompt.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setPanel({ open: true, mode: 'create' })}
          style={{ marginTop: 4 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          New Agent
        </Button>
      </div>

      {/* Empty state */}
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

      {/* Agent list */}
      {agents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {agents.map((agent) => {
            const isDeleting = deletingId === agent.agent_id
            const isAnthropic = agent.provider === 'anthropic'
            const modelLabel = MODEL_LABELS[agent.model_id] ?? agent.model_id

            return (
              <Card key={agent.agent_id} hoverable>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 14,
                        fontWeight: 700, color: 'var(--text-dark)',
                      }}>
                        {agent.name}
                      </span>
                      {/* Model chip */}
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11,
                        padding: '1px 9px', borderRadius: 4,
                        background: isAnthropic ? 'var(--blue-dim)' : 'rgba(11,16,32,0.06)',
                        border: `1px solid ${isAnthropic ? 'var(--blue-border)' : 'var(--border-light)'}`,
                        color: isAnthropic ? 'var(--blue)' : 'var(--text-body)',
                      }}>
                        {modelLabel}
                      </span>
                    </div>

                    {/* Description */}
                    {agent.description && (
                      <p style={{ fontSize: 13, color: 'var(--text-body)', marginBottom: 12, lineHeight: 1.55 }}>
                        {agent.description}
                      </p>
                    )}

                    {/* Tools */}
                    {agent.tool_names.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
                          letterSpacing: '0.12em', textTransform: 'uppercase',
                          color: 'var(--text-body)', marginRight: 2,
                        }}>
                          Tools:
                        </span>
                        {agent.tool_names.map((t) => (
                          <span key={t} style={{
                            fontFamily: 'var(--font-mono)', fontSize: 11,
                            color: 'var(--blue)',
                            background: 'var(--blue-dim)',
                            border: '1px solid var(--blue-border)',
                            borderRadius: 4, padding: '1px 8px',
                          }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {agent.tool_names.length === 0 && (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11,
                        color: 'var(--text-body)',
                      }}>
                        No tools assigned
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setChatAgent(agent)}
                      >
                        ▶ Test
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPanel({ open: true, mode: 'edit', agent })}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={isDeleting}
                        onClick={() => handleDelete(agent)}
                      >
                        Delete
                      </Button>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-body)' }}>
                        Created {formatDate(agent.created_at)}
                      </div>
                      {agent.updated_at !== agent.created_at && (
                        <div style={{ fontSize: 11, color: 'var(--text-body)', marginTop: 2 }}>
                          Updated {formatDate(agent.updated_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

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
        <AgentChat
          agent={chatAgent}
          onClose={() => setChatAgent(null)}
        />
      )}
    </div>
  )
}
