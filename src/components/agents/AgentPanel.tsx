import { useState, useEffect } from 'react'
import { AgentRecord, AgentBody, createAgent, updateAgent } from '../../api/agents'
import { DataSourceRecord, listDataSources } from '../../api/dataSources'
import { ApiError } from '../../api/client'
import Button from '../ui/Button'

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
  onSave: (agent: AgentRecord) => void
  onClose: () => void
}

const LABEL_STYLE = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-body)',
  marginBottom: 8,
  display: 'block',
}

const INPUT_STYLE = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid var(--border-light)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13.5,
  color: 'var(--text-dark)',
  background: '#fff',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box' as const,
}

export default function AgentPanel({ mode, agent, availableTools, onSave, onClose }: AgentPanelProps) {
  const [visible, setVisible] = useState(false)
  const [name, setName] = useState(agent?.name ?? '')
  const [description, setDescription] = useState(agent?.description ?? '')
  const [modelId, setModelId] = useState(agent?.model_id ?? 'claude-sonnet-5')
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt ?? '')
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set(agent?.tool_names ?? []))
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set(agent?.datasource_ids ?? []))
  const [availableSources, setAvailableSources] = useState<DataSourceRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setTimeout(() => setVisible(true), 10)
    listDataSources().then(setAvailableSources).catch(() => {})
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
      const body: AgentBody = {
        name: name.trim(),
        description,
        system_prompt: systemPrompt,
        model_id: modelId,
        provider,
        tool_names: [...selectedTools],
        datasource_ids: [...selectedSources],
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
    e.target.style.borderColor = 'var(--blue)'
    e.target.style.boxShadow = '0 0 0 3px var(--blue-dim)'
  }
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = 'var(--border-light)'
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
          background: '#ffffff',
          zIndex: 101,
          boxShadow: 'var(--shadow-panel)',
          display: 'flex', flexDirection: 'column',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'var(--bg-dark)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.4)', marginBottom: 4,
            }}>
              {mode === 'create' ? 'New Agent' : 'Edit Agent'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: '#fff' }}>
              {mode === 'edit' ? (agent?.name ?? 'Agent') : 'Configure your agent'}
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, color: 'rgba(255,255,255,0.6)',
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
            <div style={{ position: 'relative' }}>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                style={{
                  ...INPUT_STYLE,
                  appearance: 'none',
                  paddingRight: 36,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                }}
                onFocus={focusStyle}
                onBlur={blurStyle}
              >
                <optgroup label="Anthropic">
                  {ANTHROPIC_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </optgroup>
                <optgroup label="OpenAI">
                  {OPENAI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </optgroup>
              </select>
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none"
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              >
                <path d="M2 4L6 8L10 4" stroke="var(--text-body)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{
              marginTop: 6, display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-body)',
            }}>
              Provider:
              <span style={{
                padding: '1px 8px', borderRadius: 4, fontSize: 11,
                background: provider === 'anthropic' ? 'var(--blue-dim)' : 'rgba(11,16,32,0.06)',
                border: `1px solid ${provider === 'anthropic' ? 'var(--blue-border)' : 'var(--border-light)'}`,
                color: provider === 'anthropic' ? 'var(--blue)' : 'var(--text-dark)',
                fontFamily: 'var(--font-mono)',
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
                fontFamily: 'var(--font-mono)',
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
                background: 'rgba(11,16,32,0.03)',
                border: '1px solid var(--border-light)',
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: 'var(--text-body)',
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
                        border: `1px solid ${active ? 'var(--blue-border)' : 'var(--border-light)'}`,
                        background: active ? 'var(--blue-dim)' : 'transparent',
                        color: active ? 'var(--blue)' : 'var(--text-body)',
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
            {availableTools.length === 0 ? (
              <div style={{
                padding: '14px 16px', borderRadius: 8,
                background: 'rgba(11,16,32,0.03)',
                border: '1px solid var(--border-light)',
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: 'var(--text-body)',
              }}>
                No tools available — upload a tool first.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                        border: `1px solid ${active ? 'var(--blue-border)' : 'var(--border-light)'}`,
                        background: active ? 'var(--blue-dim)' : 'transparent',
                        color: active ? 'var(--blue)' : 'var(--text-body)',
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
            )}
            {autoInjectedTools.length > 0 && (
              <div style={{
                marginTop: 8, fontSize: 11, color: 'var(--text-body)',
                fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M5.5 1L2 5.5h3.5L4.5 9 8 4.5H4.5L5.5 1Z" fill="currentColor"/></svg>
                These tools are added automatically when the agent runs.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-light)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {error && (
            <span style={{
              flex: 1, fontSize: 12,
              color: 'var(--invalid)',
              fontFamily: 'var(--font-mono)',
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
