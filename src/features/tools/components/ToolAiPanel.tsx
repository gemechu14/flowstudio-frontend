import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { generateToolWithAi, type AiChatMessage } from '../api/tools.api'
import { ANTHROPIC_MODELS, OPENAI_MODELS, IDE, MONO } from '../lib/toolsUi'

export function ToolAiPanel({ code, onCodeUpdate, onRequirementsUpdate, onFilenameUpdate, provider, setProvider, modelId, setModelId, messages, setMessages }: {
  code: string; onCodeUpdate: (c: string) => void; onRequirementsUpdate: (r: string) => void; onFilenameUpdate: (f: string) => void
  provider: 'anthropic' | 'openai'; setProvider: (p: 'anthropic' | 'openai') => void
  modelId: string; setModelId: (m: string) => void
  messages: AiChatMessage[]; setMessages: Dispatch<SetStateAction<AiChatMessage[]>>
}) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const models = provider === 'anthropic' ? ANTHROPIC_MODELS : OPENAI_MODELS

  useEffect(() => {
    if (provider === 'anthropic') setModelId(ANTHROPIC_MODELS[0].id)
    else setModelId(OPENAI_MODELS[0].id)
  }, [provider])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError('')
    const newMessages: AiChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await generateToolWithAi(provider, modelId, newMessages, code)
      if (res.code && res.code.trim() !== code.trim()) {
        onCodeUpdate(res.code)
        const nameMatch = res.code.match(/name\s*=\s*["']([a-z_][a-z0-9_]*)["']/)
        if (nameMatch) onFilenameUpdate(`${nameMatch[1]}.py`)
        if (res.requirements) onRequirementsUpdate(res.requirements)
      }
      setMessages(prev => [...prev, { role: 'assistant', content: res.message }])
    } catch (e: any) {
      const detail = e.detail || e.message || String(e)
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail))
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e2030', borderLeft: `1px solid ${IDE.border}` }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${IDE.border}`, background: IDE.gutter, flexShrink: 0 }}>
        <div style={{ ...MONO, fontSize: 10, color: '#a78bfa', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>✨ AI ASSISTANT</div>
        {/* Provider toggle */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {(['anthropic', 'openai'] as const).map(p => (
            <button key={p} onClick={() => setProvider(p)} style={{
              ...MONO, fontSize: 10, padding: '3px 10px', borderRadius: 4, cursor: 'pointer',
              border: `1px solid ${provider === p ? '#a78bfa' : IDE.border}`,
              background: provider === p ? '#a78bfa22' : 'transparent',
              color: provider === p ? '#a78bfa' : IDE.lineNum,
            }}>
              {p === 'anthropic' ? 'Anthropic' : 'OpenAI'}
            </button>
          ))}
        </div>
        {/* Model selector */}
        <select
          value={modelId}
          onChange={e => setModelId(e.target.value)}
          style={{
            width: '100%', ...MONO, fontSize: 11, padding: '4px 8px',
            background: IDE.inputBg, color: IDE.text,
            border: `1px solid ${IDE.inputBdr}`, borderRadius: 4, outline: 'none',
          }}
        >
          {models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        {messages.length === 0 && (
          <div style={{ ...MONO, fontSize: 11, color: IDE.lineNum, lineHeight: 1.7 }}>
            <div style={{ marginBottom: 8 }}>Describe the tool you want:</div>
            {[
              '"A tool that fetches the weather for a city"',
              '"Add an optional timeout parameter"',
              '"Make it return JSON instead of plain text"',
            ].map(s => (
              <div key={s} onClick={() => setInput(s.replace(/"/g, ''))} style={{
                cursor: 'pointer', padding: '5px 8px', borderRadius: 5, marginBottom: 4,
                border: `1px solid ${IDE.border}`, color: '#a78bfa',
                transition: 'background 0.1s',
              }} onMouseEnter={e => (e.currentTarget.style.background = '#a78bfa15')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {s}
              </div>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '90%',
            padding: '7px 10px', borderRadius: 8,
            background: m.role === 'user' ? '#7C3AED33' : '#1e2433',
            border: `1px solid ${m.role === 'user' ? '#7C3AED55' : IDE.border}`,
            ...MONO, fontSize: 11, color: m.role === 'user' ? '#c4b5fd' : IDE.text,
            lineHeight: 1.6,
          }}>
            {m.role === 'user' ? m.content : (
              <span dangerouslySetInnerHTML={{ __html:
                m.content
                  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.+?)\*/g, '<em>$1</em>')
                  .replace(/^- (.+)$/gm, '• $1')
                  .replace(/\n/g, '<br/>')
              }} />
            )}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', ...MONO, fontSize: 11, color: '#a78bfa', padding: '6px 10px' }}>
            ✦ Generating…
          </div>
        )}
        {error && (
          <div style={{
            ...MONO, fontSize: 11, color: '#f87171', padding: '8px 10px',
            background: '#f8717115', border: '1px solid #f8717140', borderRadius: 6, lineHeight: 1.6,
          }}>
            ⚠ {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${IDE.border}`, background: IDE.gutter, flexShrink: 0 }}>
          <textarea
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={messages.length === 0 ? 'Describe the tool you want…' : 'Ask to change something…'}
            rows={2}
            style={{
              width: '100%', ...MONO, fontSize: 11, padding: '7px 10px',
              background: IDE.inputBg, color: IDE.text,
              border: `1px solid ${IDE.inputBdr}`, borderRadius: 6,
              resize: 'none', outline: 'none', lineHeight: 1.5,
              overflowY: 'auto', minHeight: 42, maxHeight: 120,
              boxSizing: 'border-box',
            }}
          />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ ...MONO, fontSize: 9, color: IDE.lineNum }}>Enter to send · Shift+Enter for newline</span>
          <button onClick={send} disabled={!input.trim() || loading} style={{
            width: 28, height: 28, borderRadius: 6,
            background: !input.trim() || loading ? '#313244' : '#7C3AED',
            color: !input.trim() || loading ? IDE.lineNum : '#fff',
            border: 'none', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
