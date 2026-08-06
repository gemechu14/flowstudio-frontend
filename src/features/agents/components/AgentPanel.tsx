import { useState, useEffect } from 'react'
import { type AgentRecord, type AgentBody, createAgent, updateAgent } from '../api/agents.api'
import { type DataSourceRecord, listDataSources } from '../../data-sources/api/dataSources.api'
import { listMcpServers, getMcpServerTools, type McpServerRecord, type McpToolInfo } from '../api/mcp.api'
import { ApiError } from '../../../shared/api/client'
import Button from '../../../shared/components/ui/Button'

const ANTHROPIC_MODELS = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  { id: 'claude-fable-5', label: 'Claude Fable 5' },
]

const OPENAI_MODELS = [
  { id: 'gpt-4.1', label: 'GPT-4.1' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
]

interface AgentPanelProps {
  mode: 'create' | 'edit'
  agent?: AgentRecord
  availableTools: string[]
  communityTools?: string[]
  onSave: (agent: AgentRecord) => void
  onClose: () => void
}

const MONO = { fontFamily: 'var(--font-mono)' }
const SANS = { fontFamily: 'var(--font-sans)' }

const LABEL_STYLE = {
  ...MONO,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-tertiary)',
  marginBottom: 8,
  display: 'block',
}

const INPUT_STYLE = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  ...SANS,
  fontSize: 13.5,
  color: 'var(--text-heading)',
  backgroundColor: 'var(--card-bg)',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box' as const,
  colorScheme: 'dark light' as const,
}

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  ...SANS,
  fontSize: 13,
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  paddingRight: 36,
  cursor: 'pointer',
  backgroundColor: 'var(--card-bg)',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8L9.5 4.5' stroke='%2371717A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
}

export default function AgentPanel({ mode, agent, availableTools, communityTools = [], onSave, onClose }: AgentPanelProps) {
  const [visible, setVisible] = useState(false)
  const [name, setName] = useState(agent?.name ?? '')
  const [description, setDescription] = useState(agent?.description ?? '')
  const [modelId, setModelId] = useState(agent?.model_id ?? 'claude-sonnet-5')
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt ?? '')
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set(agent?.tool_names ?? []))
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set(agent?.datasource_ids ?? []))
  const [availableSources, setAvailableSources] = useState<DataSourceRecord[]>([])
  // MCP: {server_id}:{tool_name} → selected
  const [selectedMcpTools, setSelectedMcpTools] = useState<Set<string>>(
    new Set((agent?.mcp_tools ?? []).map(m => `${m.server_id}:${m.tool_name}`))
  )
  const [mcpServers, setMcpServers] = useState<McpServerRecord[]>([])
  const [mcpToolsByServer, setMcpToolsByServer] = useState<Record<string, McpToolInfo[]>>({})
  const [loadingMcp, setLoadingMcp] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setTimeout(() => setVisible(true), 10)
    listDataSources().then(setAvailableSources).catch(() => {})
    setLoadingMcp(true)
    listMcpServers()
      .then(async (servers) => {
        const enabled = servers.filter(s => s.enabled)
        setMcpServers(enabled)
        const toolMap: Record<string, McpToolInfo[]> = {}
        await Promise.all(
          enabled.map(s =>
            getMcpServerTools(s.server_id)
              .then(tools => { toolMap[s.server_id] = tools })
              .catch(() => { toolMap[s.server_id] = [] })
          )
        )
        setMcpToolsByServer(toolMap)
      })
      .catch(() => {})
      .finally(() => setLoadingMcp(false))
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 220)
  }

  const toggleTool = (toolName: string) => {
    setSelectedTools((prev) => {
      const next = new Set(prev)
      if (next.has(toolName)) next.delete(toolName)
      else next.add(toolName)
      return next
    })
  }

  const toggleSource = (sourceId: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev)
      if (next.has(sourceId)) next.delete(sourceId)
      else next.add(sourceId)
      return next
    })
  }

  const toggleMcpTool = (serverId: string, toolName: string) => {
    const key = `${serverId}:${toolName}`
    setSelectedMcpTools((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleMcpServer = (serverId: string) => {
    const serverTools = mcpToolsByServer[serverId] ?? []
    const allKeys = serverTools.map(t => `${serverId}:${t.name}`)
    const allSelected = allKeys.every(k => selectedMcpTools.has(k))
    setSelectedMcpTools((prev) => {
      const next = new Set(prev)
      if (allSelected) allKeys.forEach(k => next.delete(k))
      else allKeys.forEach(k => next.add(k))
      return next
    })
  }

  const provider: 'anthropic' | 'openai' = modelId.startsWith('claude') ? 'anthropic' : 'openai'

  const autoInjectedTools: string[] = (() => {
    const tools: string[] = []
    const selected = availableSources.filter(s => selectedSources.has(s.source_id))
    const hasDocOrWeb = selected.some(s => s.source_type === 'document' || s.source_type === 'website')
    if (hasDocOrWeb) tools.push('search_docs')
    selected.filter(s => s.source_type === 'database').forEach(s => {
      tools.push(`get_schema_${s.source_id.slice(0, 8)}`)
      tools.push(`run_sql_${s.source_id.slice(0, 8)}`)
    })
    return tools
  })()

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const mcpToolsList = [...selectedMcpTools].map(key => {
        const idx = key.indexOf(':')
        return { server_id: key.slice(0, idx), tool_name: key.slice(idx + 1) }
      })
      const body: AgentBody = {
        name: name.trim(),
        description,
        system_prompt: systemPrompt,
        model_id: modelId,
        provider,
        tool_names: [...selectedTools],
        datasource_ids: [...selectedSources],
        mcp_tools: mcpToolsList,
      }
      const result = mode === 'create'
        ? await createAgent(body)
        : await updateAgent(agent!.agent_id, body)
      onSave(result)
      handleClose()
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : String(err))
      setSaving(false)
    }
  }

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = 'var(--accent)'
    e.target.style.boxShadow = '0 0 0 3px var(--accent-soft)'
  }
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = 'var(--border)'
    e.target.style.boxShadow = 'none'
  }

  return (
    <>
      <div
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
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-page)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{
              ...MONO, fontSize: 10, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--text-tertiary)', marginBottom: 4,
            }}>
              {mode === 'create' ? 'New Agent' : 'Edit Agent'}
            </div>
            <div style={{ ...MONO, fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>
              {mode === 'edit' ? (agent?.name ?? 'Agent') : 'Configure your agent'}
            </div>
          </div>
          <button
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

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Identity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={LABEL_STYLE}>Name <span style={{ color: 'var(--invalid)' }}>*</span></label>
              <input
                type="text"
                placeholder="e.g. sql-analyst"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={INPUT_STYLE}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Description</label>
              <input
                type="text"
                placeholder="What does this agent do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={INPUT_STYLE}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>
          </div>

          {/* Model */}
          <div>
            <label style={LABEL_STYLE}>Model</label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              style={SELECT_STYLE}
              onFocus={focusStyle}
              onBlur={blurStyle}
            >
              <optgroup label="Anthropic" style={SANS}>
                {ANTHROPIC_MODELS.map((m) => (
                  <option key={m.id} value={m.id} style={SANS}>{m.label}</option>
                ))}
              </optgroup>
              <optgroup label="OpenAI" style={SANS}>
                {OPENAI_MODELS.map((m) => (
                  <option key={m.id} value={m.id} style={SANS}>{m.label}</option>
                ))}
              </optgroup>
            </select>
            <div style={{
              marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
              ...MONO, fontSize: 11, color: 'var(--text-tertiary)',
            }}>
              Provider:
              <span style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                background: provider === 'anthropic' ? 'var(--accent-soft)' : 'var(--bg-hover)',
                border: `1px solid ${provider === 'anthropic' ? 'var(--blue-border)' : 'var(--border)'}`,
                color: provider === 'anthropic' ? 'var(--accent)' : 'var(--text-secondary)',
                ...MONO,
              }}>
                {provider === 'anthropic' ? 'Anthropic' : 'OpenAI'}
              </span>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label style={LABEL_STYLE}>System Prompt</label>
            <textarea
              placeholder="You are a helpful assistant that..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              style={{
                ...INPUT_STYLE,
                ...MONO,
                fontSize: 12.5,
                lineHeight: 1.7,
                resize: 'vertical',
                minHeight: 120,
              }}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          {/* Data Sources */}
          <div>
            <label style={LABEL_STYLE}>Data Sources ({selectedSources.size} attached)</label>
            {availableSources.length === 0 ? (
              <div style={{
                padding: '14px 16px', borderRadius: 8,
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: 'var(--text-secondary)',
              }}>
                No data sources yet — create one in the Data Sources page.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {availableSources.map((src) => {
                  const active = selectedSources.has(src.source_id)
                  return (
                    <button
                      key={src.source_id}
                      onClick={() => toggleSource(src.source_id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', borderRadius: 6, textAlign: 'left', cursor: 'pointer',
                        border: `1px solid ${active ? 'var(--blue-border)' : 'var(--border)'}`,
                        background: active ? 'var(--blue-dim)' : 'transparent',
                        color: active ? 'var(--blue)' : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{src.name}</div>
                        <div style={{ fontSize: 11, opacity: 0.7, fontFamily: 'var(--font-mono)' }}>{src.source_type}</div>
                      </div>
                      {active && <span style={{ fontSize: 11 }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Tools */}
          <div>
            <label style={LABEL_STYLE}>Tools ({selectedTools.size} selected)</label>
            {/* Orphaned tools — selected but no longer exist */}
            {(() => {
              const orphaned = Array.from(selectedTools).filter(t => !availableTools.includes(t))
              if (orphaned.length === 0) return null
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {orphaned.map(toolName => (
                    <span key={toolName} title="Tool was deleted — click × to remove" style={{
                      fontFamily: 'var(--font-mono)', fontSize: 12,
                      padding: '4px 6px 4px 11px', borderRadius: 6,
                      border: '1px solid rgba(248,113,113,0.4)',
                      background: 'rgba(248,113,113,0.08)',
                      color: '#f87171',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                      {toolName}
                      <button
                        onClick={() => toggleTool(toolName)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 0, fontSize: 15, lineHeight: 1 }}
                      >×</button>
                    </span>
                  ))}
                </div>
              )
            })()}
            {availableTools.length === 0 && autoInjectedTools.length === 0 ? (
              <div style={{
                padding: '14px 16px', borderRadius: 8,
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: 'var(--text-secondary)',
              }}>
                No tools available — upload a tool first.
              </div>
            ) : (
              <div>
                {availableTools.length > 0 && (
                  <>
                    {communityTools.length > 0 && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>
                        Your Tools
                      </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: communityTools.length > 0 ? 12 : 0 }}>
                      {availableTools.map((toolName) => {
                  const active = selectedTools.has(toolName)
                  return (
                    <button
                      key={toolName}
                      onClick={() => toggleTool(toolName)}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        padding: '5px 12px',
                        borderRadius: 6,
                        border: `1px solid ${active ? 'var(--blue-border)' : 'var(--border)'}`,
                        background: active ? 'var(--blue-dim)' : 'transparent',
                        color: active ? 'var(--blue)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {active && '✓ '}{toolName}
                    </button>
                  )
                })}
                {autoInjectedTools.map(toolName => (
                  <span
                    key={toolName}
                    title="Added automatically from an attached data source"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      padding: '5px 12px',
                      borderRadius: 6,
                      border: '1px dashed rgba(29,95,250,0.35)',
                      background: 'rgba(29,95,250,0.04)',
                      color: 'rgba(29,95,250,0.6)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M5.5 1L2 5.5h3.5L4.5 9 8 4.5H4.5L5.5 1Z" fill="currentColor"/>
                    </svg>
                    {toolName}
                  </span>
                ))}
                    </div>
                  </>
                )}

                {communityTools.length > 0 && (
                  <>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#10B981', marginBottom: 6, textTransform: 'uppercase' }}>
                      Community Tools
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {communityTools.map((toolName) => {
                        const active = selectedTools.has(toolName)
                        return (
                          <button
                            key={toolName}
                            onClick={() => toggleTool(toolName)}
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 12,
                              padding: '5px 12px',
                              borderRadius: 6,
                              border: `1px solid ${active ? '#10B98150' : '#10B98125'}`,
                              background: active ? '#10B98115' : 'transparent',
                              color: active ? '#10B981' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {active && '✓ '}{toolName}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
            {autoInjectedTools.length > 0 && (
              <div style={{
                marginTop: 8, fontSize: 11, color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M5.5 1L2 5.5h3.5L4.5 9 8 4.5H4.5L5.5 1Z" fill="currentColor"/></svg>
                These tools are added automatically when the agent runs.
              </div>
            )}
          </div>

          {/* MCP Tools */}
          <div>
            <label style={LABEL_STYLE}>
              MCP Tools ({selectedMcpTools.size} selected)
            </label>
            {loadingMcp ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', padding: '10px 0' }}>
                Loading MCP servers…
              </div>
            ) : mcpServers.length === 0 ? (
              <div style={{
                padding: '14px 16px', borderRadius: 8,
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: 'var(--text-secondary)',
              }}>
                No MCP servers configured — add one in Settings.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mcpServers.map(server => {
                  const tools = mcpToolsByServer[server.server_id] ?? []
                  const allKeys = tools.map(t => `${server.server_id}:${t.name}`)
                  const selectedCount = allKeys.filter(k => selectedMcpTools.has(k)).length
                  const allSelected = tools.length > 0 && selectedCount === tools.length
                  return (
                    <div key={server.server_id} style={{
                      border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
                    }}>
                      {/* Server header row */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'var(--bg-hover)',
                        borderBottom: tools.length > 0 ? '1px solid var(--border)' : 'none',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text-heading)' }}>
                            {server.name}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
                            {tools.length} tool{tools.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {tools.length > 0 && (
                          <button
                            onClick={() => toggleMcpServer(server.server_id)}
                            style={{
                              fontFamily: 'var(--font-mono)', fontSize: 11,
                              padding: '3px 10px', borderRadius: 5, cursor: 'pointer',
                              border: `1px solid ${allSelected ? 'var(--blue-border)' : 'var(--border)'}`,
                              background: allSelected ? 'var(--blue-dim)' : 'transparent',
                              color: allSelected ? 'var(--blue)' : 'var(--text-secondary)',
                            }}
                          >
                            {allSelected ? 'Deselect all' : 'Select all'}
                          </button>
                        )}
                      </div>
                      {/* Offline selected tools — MCP down but tools were previously selected */}
                      {tools.length === 0 && (() => {
                        const offlineKeys = Array.from(selectedMcpTools).filter(k => k.startsWith(`${server.server_id}:`))
                        if (offlineKeys.length === 0) return null
                        return (
                          <div style={{ padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {offlineKeys.map(key => {
                              const toolName = key.slice(server.server_id.length + 1)
                              return (
                                <span key={key} title="MCP server offline — click × to remove" style={{
                                  fontFamily: 'var(--font-mono)', fontSize: 12,
                                  padding: '4px 6px 4px 11px', borderRadius: 5,
                                  border: '1px solid rgba(248,113,113,0.4)',
                                  background: 'rgba(248,113,113,0.08)',
                                  color: '#f87171',
                                  display: 'flex', alignItems: 'center', gap: 6,
                                }}>
                                  {toolName}
                                  <button
                                    onClick={() => toggleMcpTool(server.server_id, toolName)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 0, fontSize: 15, lineHeight: 1 }}
                                  >×</button>
                                </span>
                              )
                            })}
                          </div>
                        )
                      })()}
                      {/* Tool list */}
                      {tools.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 12px' }}>
                          {tools.map(tool => {
                            const key = `${server.server_id}:${tool.name}`
                            const active = selectedMcpTools.has(key)
                            return (
                              <button
                                key={tool.name}
                                onClick={() => toggleMcpTool(server.server_id, tool.name)}
                                title={tool.description}
                                style={{
                                  fontFamily: 'var(--font-mono)', fontSize: 12,
                                  padding: '4px 11px', borderRadius: 5, cursor: 'pointer',
                                  border: `1px solid ${active ? 'var(--blue-border)' : 'var(--border)'}`,
                                  background: active ? 'var(--blue-dim)' : 'transparent',
                                  color: active ? 'var(--blue)' : 'var(--text-secondary)',
                                  transition: 'all 0.12s',
                                }}
                              >
                                {active && '✓ '}{tool.name}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg-surface)',
        }}>
          {error && (
            <span style={{
              flex: 1, fontSize: 12,
              color: 'var(--invalid)',
              ...MONO,
            }}>
              {error}
            </span>
          )}
          {!error && <span style={{ flex: 1 }} />}
          <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
            {mode === 'create' ? 'Create Agent' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </>
  )
}
