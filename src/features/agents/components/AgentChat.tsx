import { useState, useEffect, useRef, useCallback } from 'react'
import { type AgentRecord } from '../api/agents.api'
import { type DataSourceRecord, listDataSources } from '../../data-sources/api/dataSources.api'
import { BASE_URL } from '../../../shared/api/client'

// ─── types ────────────────────────────────────────────────────────────────────

interface ToolStep {
  label: string
  tool_name?: string
  result_preview?: string
  done: boolean
}

type MsgRole = 'user' | 'assistant'

interface ChatMessage {
  id: string
  role: MsgRole
  content: string
  steps: ToolStep[]       // tool calls that happened before this assistant turn
  streaming: boolean
  input_tokens?: number
  output_tokens?: number
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }

const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)' }

const TYPE_COLORS: Record<string, string> = {
  document: '#10b981',
  database: '#1D5FFA',
  website:  '#8b5cf6',
}

// ─── streaming fetch ──────────────────────────────────────────────────────────

interface StreamEvent {
  type: 'chunk' | 'tool_start' | 'tool_done' | 'done' | 'error'
  text?: string
  label?: string
  tool_name?: string
  result_preview?: string
  input_tokens?: number
  output_tokens?: number
  message?: string
}

async function* streamAgent(
  agentId: string,
  message: string,
  history: { role: string; content: string }[],
  datasource_ids: string[],
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const token = localStorage.getItem('cl_token')
  const activeTenant = localStorage.getItem('cl_active_tenant')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (activeTenant) {
    try { headers['x-active-tenant'] = JSON.parse(activeTenant).tenant_id } catch {}
  }
  const res = await fetch(`${BASE_URL}/agents/${agentId}/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, history, datasource_ids }),
    signal,
  })
  if (!res.ok) {
    const text = await res.text()
    yield { type: 'error', message: text || `HTTP ${res.status}` }
    return
  }
  const reader = res.body!.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const raw = line.slice(6).trim()
        if (raw) {
          try { yield JSON.parse(raw) } catch { /* skip malformed */ }
        }
      }
    }
  }
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ToolStepCard({ step }: { step: ToolStep }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '8px 12px', borderRadius: 8,
      background: step.done ? 'rgba(16,185,129,0.05)' : 'rgba(29,95,250,0.05)',
      border: `1px solid ${step.done ? 'rgba(16,185,129,0.18)' : 'rgba(29,95,250,0.18)'}`,
    }}>
      {/* icon / spinner */}
      <div style={{ marginTop: 1, flexShrink: 0, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {step.done ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1.2"/>
            <path d="M4 7l2.5 2.5L10 5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            border: '2px solid rgba(29,95,250,0.3)',
            borderTopColor: 'var(--blue)',
            animation: 'spin 0.8s linear infinite',
          }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: step.done ? '#10b981' : 'var(--blue)', fontWeight: 500 }}>
          {step.label}
        </div>
        {step.done && step.result_preview && (
          <div style={{ marginTop: 4 }}>
            <button onClick={() => setExpanded(v => !v)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: 'var(--text-secondary)', padding: 0, ...MONO,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {expanded ? '▾' : '▸'} {expanded ? 'Hide result' : 'Show result'}
            </button>
            {expanded && (
              <pre style={{
                marginTop: 6, padding: '8px 10px', borderRadius: 6,
                background: 'var(--bg-hover)', border: '1px solid var(--border)',
                fontSize: 11, ...MONO, color: 'var(--text-heading)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 200, overflowY: 'auto',
              }}>
                {step.result_preview}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function UserBubble({ content }: { content: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{
        maxWidth: '72%', padding: '10px 14px', borderRadius: '14px 14px 2px 14px',
        background: 'var(--accent-soft)', color: 'var(--accent-text)', fontSize: 14, lineHeight: 1.6,
        border: '1px solid var(--blue-border)',
        boxShadow: 'none',
      }}>
        {content}
      </div>
    </div>
  )
}

function AssistantBubble({ msg }: { msg: ChatMessage }) {
  const hasSteps = msg.steps.length > 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', maxWidth: '80%' }}>
      {/* tool steps */}
      {hasSteps && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          {msg.steps.map((s, i) => <ToolStepCard key={i} step={s} />)}
        </div>
      )}
      {/* text bubble */}
      {(msg.content || msg.streaming) && (
        <div style={{
          padding: '10px 14px', borderRadius: '2px 14px 14px 14px',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          fontSize: 14, lineHeight: 1.7, color: 'var(--text-heading)',
          boxShadow: 'var(--shadow-card)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.content || ''}
          {msg.streaming && (
            <span style={{
              display: 'inline-block', width: 7, height: 14,
              background: 'var(--blue)', marginLeft: 2, borderRadius: 1,
              animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom',
            }} />
          )}
          {!msg.streaming && msg.input_tokens !== undefined && (
            <div style={{
              marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)',
              fontSize: 10.5, ...MONO, color: 'var(--text-secondary)',
              display: 'flex', gap: 10,
            }}>
              <span>{msg.input_tokens} in</span>
              <span>{msg.output_tokens} out</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── source chip ──────────────────────────────────────────────────────────────

function SourceChip({
  source, active, onToggle,
}: { source: DataSourceRecord; active: boolean; onToggle: () => void }) {
  const color = TYPE_COLORS[source.source_type] ?? '#94a3b8'
  return (
    <button onClick={onToggle} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
      border: `1px solid ${active ? color : 'var(--border)'}`,
      background: active ? `${color}14` : 'transparent',
      color: active ? color : 'var(--text-secondary)',
      fontSize: 12, fontWeight: active ? 600 : 400,
      transition: 'all 0.13s',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: active ? color : 'var(--text-tertiary)',
      }} />
      {source.name}
    </button>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

interface AgentChatProps {
  agent: AgentRecord
  onClose: () => void
}

const MODEL_LABELS: Record<string, string> = {
  'claude-sonnet-5': 'Sonnet 5', 'claude-sonnet-4-6': 'Sonnet 4.6',
  'claude-opus-4-8': 'Opus 4.8', 'claude-haiku-4-5': 'Haiku 4.5',
  'claude-fable-5': 'Fable 5', 'gpt-4.1': 'GPT-4.1',
  'gpt-4.1-mini': 'GPT-4.1 mini', 'gpt-4o': 'GPT-4o', 'gpt-4o-mini': 'GPT-4o mini',
}

export default function AgentChat({ agent, onClose }: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [allSources, setAllSources] = useState<DataSourceRecord[]>([])
  const [activeSources, setActiveSources] = useState<Set<string>>(new Set(agent.datasource_ids))
  const [visible, setVisible] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTimeout(() => setVisible(true), 10)
    listDataSources().then(setAllSources).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 220)
  }

  const toggleSource = (id: string) =>
    setActiveSources(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // build history for the API (user + assistant turns only)
  const buildHistory = (msgs: ChatMessage[]) =>
    msgs
      .filter(m => !m.streaming)
      .map(m => ({ role: m.role, content: m.content }))

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || running) return
    setInput('')
    setRunning(true)

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text, steps: [], streaming: false }
    const assistantMsgId = uid()
    const assistantMsg: ChatMessage = { id: assistantMsgId, role: 'assistant', content: '', steps: [], streaming: true }

    setMessages(prev => [...prev, userMsg, assistantMsg])

    const ctrl = new AbortController()
    abortRef.current = ctrl

    const history = buildHistory([...messages, userMsg])
    // remove the last entry since that's the current user message we're about to send
    const priorHistory = history.slice(0, -1)

    try {
      for await (const event of streamAgent(
        agent.agent_id, text, priorHistory, [...activeSources], ctrl.signal,
      )) {
        if (event.type === 'chunk') {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId ? { ...m, content: m.content + (event.text ?? '') } : m,
          ))
        } else if (event.type === 'tool_start') {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, steps: [...m.steps, { label: event.label ?? 'Working…', done: false }] }
              : m,
          ))
        } else if (event.type === 'tool_done') {
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMsgId) return m
            const steps = [...m.steps]
            // mark the last pending step as done
            const idx = steps.map(s => s.done).lastIndexOf(false)
            if (idx >= 0) steps[idx] = { ...steps[idx], tool_name: event.tool_name, result_preview: event.result_preview, done: true }
            return { ...m, steps }
          }))
        } else if (event.type === 'done') {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, streaming: false, input_tokens: event.input_tokens, output_tokens: event.output_tokens }
              : m,
          ))
        } else if (event.type === 'error') {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, streaming: false, content: m.content || `⚠ ${event.message}` }
              : m,
          ))
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, streaming: false, content: m.content || '⚠ Connection lost.' }
            : m,
        ))
      }
    } finally {
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId && m.streaming ? { ...m, streaming: false } : m,
      ))
      setRunning(false)
      abortRef.current = null
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [input, running, messages, agent.agent_id, activeSources])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const stopStream = () => {
    abortRef.current?.abort()
  }

  const isAnthropic = agent.provider === 'anthropic'
  const modelLabel = MODEL_LABELS[agent.model_id] ?? agent.model_id

  return (
    <>
      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(8,12,24,0.4)', zIndex: 200,
        opacity: visible ? 1 : 0, transition: 'opacity 0.22s ease',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 680, maxWidth: '92vw',
        background: 'var(--bg-page)', zIndex: 201,
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-panel)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* Header */}
        <div style={{
          background: 'var(--bg-surface)', padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
            background: 'var(--accent-soft)', border: '1px solid var(--blue-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="3" stroke="var(--accent)" strokeWidth="1.4"/>
              <path d="M2 14c0-2.76 2.69-5 6-5s6 2.24 6 5" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, ...MONO, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 2 }}>
              Test Agent
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {agent.name}
            </div>
          </div>
          <span style={{
            padding: '2px 9px', borderRadius: 5, fontSize: 11, ...MONO, fontWeight: 600,
            background: isAnthropic ? 'var(--accent-soft)' : 'var(--bg-hover)',
            border: isAnthropic ? '1px solid var(--blue-border)' : '1px solid var(--border)',
            color: isAnthropic ? 'var(--accent)' : 'var(--text-secondary)',
            flexShrink: 0,
          }}>
            {modelLabel}
          </span>
          <button onClick={handleClose} style={{
            background: 'var(--bg-hover)', border: '1px solid var(--border)',
            borderRadius: 7, color: 'var(--text-secondary)', cursor: 'pointer',
            padding: '5px 10px', fontSize: 12, flexShrink: 0,
          }}>✕ Close</button>
        </div>

        {/* Source toggles */}
        {allSources.length > 0 && (
          <div style={{
            padding: '10px 16px', background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, ...MONO, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', flexShrink: 0 }}>
              Sources
            </span>
            {allSources.map(s => (
              <SourceChip key={s.source_id} source={s} active={activeSources.has(s.source_id)} onToggle={() => toggleSource(s.source_id)} />
            ))}
            {activeSources.size === 0 && (
              <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontStyle: 'italic' }}>No sources active</span>
            )}
          </div>
        )}

        {/* Message thread */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '24px 20px',
          display: 'flex', flexDirection: 'column', gap: 18,
          background: 'var(--bg-page)',
        }}>
          {messages.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 60,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'var(--accent-soft)', border: '1px solid var(--blue-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="var(--blue)" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 5 }}>Start a conversation</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 300, lineHeight: 1.6 }}>
                  {agent.system_prompt
                    ? `System: "${agent.system_prompt.slice(0, 80)}${agent.system_prompt.length > 80 ? '…' : ''}"`
                    : 'Send a message to test this agent.'}
                </div>
              </div>
              {agent.tool_names.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 320 }}>
                  {agent.tool_names.map(t => (
                    <span key={t} style={{
                      fontSize: 11, ...MONO, padding: '2px 8px', borderRadius: 4,
                      background: 'var(--blue-dim)', border: '1px solid var(--blue-border)', color: 'var(--blue)',
                    }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map(msg =>
            msg.role === 'user'
              ? <UserBubble key={msg.id} content={msg.content} />
              : <AssistantBubble key={msg.id} msg={msg} />
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{
          padding: '12px 16px', background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-end',
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '8px 12px',
            boxShadow: 'var(--shadow-card)',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
            onFocus={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--blue)'
              el.style.boxShadow = '0 0 0 3px var(--blue-dim)'
            }}
            onBlur={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--border)'
              el.style.boxShadow = 'var(--shadow-card)'
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message the agent… (Enter to send, Shift+Enter for newline)"
              rows={1}
              style={{
                flex: 1, border: 'none', outline: 'none', resize: 'none',
                fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-heading)',
                background: 'transparent', lineHeight: 1.5, maxHeight: 160, overflowY: 'auto',
                colorScheme: 'dark light',
              }}
              onInput={e => {
                const el = e.target as HTMLTextAreaElement
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 160)}px`
              }}
              disabled={running}
            />
            {running ? (
              <button onClick={stopStream} style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 7,
                background: 'var(--invalid-dim)', border: '1px solid rgba(239,68,68,0.25)',
                color: 'var(--invalid)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}>
                ◼ Stop
              </button>
            ) : (
              <button
                onClick={send}
                disabled={!input.trim()}
                style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: 7,
                  background: input.trim() ? 'var(--accent-soft)' : 'var(--bg-hover)',
                  color: input.trim() ? 'var(--accent-text)' : 'var(--text-tertiary)',
                  cursor: input.trim() ? 'pointer' : 'default',
                  fontSize: 13, fontWeight: 600, transition: 'all 0.13s',
                  border: input.trim() ? '1px solid var(--blue-border)' : '1px solid transparent',
                }}>
                Send ↑
              </button>
            )}
          </div>
          <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--text-tertiary)', textAlign: 'center', ...MONO }}>
            {activeSources.size > 0
              ? `${activeSources.size} source${activeSources.size > 1 ? 's' : ''} active · `
              : ''
            }
            {agent.tool_names.length > 0 ? `${agent.tool_names.length} tool${agent.tool_names.length > 1 ? 's' : ''} available` : 'No tools configured'}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </>
  )
}

