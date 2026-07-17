import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ToolRecord, ToolStatus,
  listTools, uploadTool, approveTool, rejectTool, deleteTool,
  testTool, getToolSource,
  generateToolWithAi, AiChatMessage,
} from '../api/tools'
import ConfirmModal from '../components/ui/ConfirmModal'

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

// ─── design tokens (inline, no dep on component system) ──────────────────────

const MONO = { fontFamily: 'var(--font-mono)' }

const STATUS_COLOR: Record<ToolStatus, string> = {
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
}
const STATUS_ICON: Record<ToolStatus, string> = {
  pending: '◌', approved: '✓', rejected: '✗',
}

const TAB_LABELS: { key: ToolStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

// ─── small helpers ────────────────────────────────────────────────────────────

const fmt = (iso: string) => {
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}

function Chip({ label, color = '#1D5FFA' }: { label: string; color?: string }) {
  return (
    <span style={{
      ...MONO, fontSize: 10, padding: '2px 7px', borderRadius: 4,
      background: `${color}22`, color, border: `1px solid ${color}44`,
      fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

// ─── code viewer panel ────────────────────────────────────────────────────────

function CodePanel({ toolId, onClose }: { toolId: string; onClose: () => void }) {
  const [source, setSource] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getToolSource(toolId).then(s => { setSource(s); setLoading(false) }).catch(() => setLoading(false))
  }, [toolId])

  const handleCopy = () => {
    if (!source) return
    navigator.clipboard.writeText(source).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 760, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          background: 'var(--bg-card)', borderRadius: 12,
          border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-heading)' }}>Source Code</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleCopy}
              disabled={!source || loading}
              style={{
                ...MONO, fontSize: 11, padding: '4px 12px',
                background: copied ? '#10B98120' : 'var(--bg-page)',
                border: `1px solid ${copied ? '#10B98144' : 'var(--border)'}`,
                color: copied ? '#10B981' : 'var(--text-muted)',
                borderRadius: 6, cursor: !source || loading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
              }}
            >
              {copied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy
                </>
              )}
            </button>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: 18, lineHeight: 1,
            }}>×</button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', ...MONO, fontSize: 12 }}>Loading…</div>
          ) : (
            <pre style={{
              ...MONO, fontSize: 12, color: 'var(--text-body)',
              margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              lineHeight: 1.6,
            }}>{source || '(empty)'}</pre>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── test panel ───────────────────────────────────────────────────────────────

function TestPanel({ tool, onClose }: { tool: ToolRecord; onClose: () => void }) {
  const [params, setParams] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ success: boolean; output: string | null; error: string | null; elapsed: number } | null>(null)

  const run = async () => {
    setRunning(true); setResult(null)
    try {
      const r = await testTool(tool.tool_id, params)
      setResult({ success: r.success, output: r.output, error: r.error, elapsed: r.elapsed_seconds })
    } catch (e: any) {
      setResult({ success: false, output: null, error: e.message || String(e), elapsed: 0 })
    } finally { setRunning(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 460, height: '100%', background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        boxShadow: '-12px 0 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          background: '#1D5FFA', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{tool.name}</div>
            <div style={{ ...MONO, fontSize: 10, color: '#ffffff99', marginTop: 2 }}>Test run</div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18,
          }}>×</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {tool.parameters.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              {tool.parameters.map(p => (
                <div key={p.name} style={{ marginBottom: 12 }}>
                  <div style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                    {p.name} <span style={{ color: '#F59E0B' }}>{p.type}</span>
                    {tool.required.includes(p.name) && <span style={{ color: '#EF4444' }}> *</span>}
                  </div>
                  <input
                    value={params[p.name] || ''}
                    onChange={e => setParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                    placeholder={p.description || `Enter ${p.name}`}
                    style={{
                      width: '100%', fontSize: 12, padding: '7px 10px',
                      background: 'var(--bg-page)', color: 'var(--text-body)',
                      border: '1px solid var(--border)', borderRadius: 6, ...MONO,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...MONO, fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
              No parameters required.
            </div>
          )}
          <button
            onClick={run} disabled={running}
            style={{
              width: '100%', padding: '9px', background: running ? '#10B98144' : '#1D5FFA',
              color: '#fff', border: 'none', borderRadius: 7, cursor: running ? 'wait' : 'pointer',
              fontWeight: 700, fontSize: 13, ...MONO,
            }}
          >{running ? '⟳ Running…' : '▶ Run'}</button>

          {result && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                ...MONO, fontSize: 10, color: result.success ? '#10B981' : '#EF4444',
                marginBottom: 6,
              }}>
                {result.success ? '✓ success' : '✗ failed'} · {result.elapsed.toFixed(2)}s
              </div>
              <pre style={{
                ...MONO, fontSize: 11, color: 'var(--text-body)',
                background: 'var(--bg-page)', padding: '10px 12px',
                borderRadius: 6, border: `1px solid ${result.success ? '#10B98140' : '#EF444440'}`,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 280, overflow: 'auto',
                margin: 0,
              }}>
                {result.output || result.error || '(no output)'}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── reject modal ─────────────────────────────────────────────────────────────

function RejectModal({ tool, onConfirm, onClose }: {
  tool: ToolRecord
  onConfirm: (reason: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 420, background: 'var(--bg-card)', borderRadius: 12,
        border: '1px solid var(--border)', padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 8 }}>
          Reject "{tool.name}"
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          Optionally explain why this tool was rejected.
        </div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason (optional)…"
          rows={3}
          style={{
            width: '100%', fontSize: 12, padding: '8px 10px',
            background: 'var(--bg-page)', color: 'var(--text-body)',
            border: '1px solid var(--border)', borderRadius: 6, resize: 'vertical',
            boxSizing: 'border-box', ...MONO,
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            ...MONO, fontSize: 12, padding: '7px 14px',
            background: 'var(--bg-page)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', borderRadius: 6, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={() => onConfirm(reason)} style={{
            ...MONO, fontSize: 12, padding: '7px 14px',
            background: '#EF4444', border: 'none', color: '#fff',
            borderRadius: 6, cursor: 'pointer', fontWeight: 700,
          }}>Reject Tool</button>
        </div>
      </div>
    </div>
  )
}

// ─── Python syntax highlighter ────────────────────────────────────────────────

const PY_KEYWORDS = new Set(['def','class','return','import','from','if','else','elif','for','while','in','not','and','or','True','False','None','with','as','try','except','finally','raise','pass','break','continue','lambda','yield','async','await','is','global','nonlocal','del','assert'])
const PY_BUILTINS = new Set(['str','int','float','bool','list','dict','set','tuple','print','len','range','type','object','isinstance','hasattr','getattr','setattr','enumerate','zip','map','filter','sorted','reversed','any','all','min','max','sum','abs','round','open','super'])

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightPython(code: string): string {
  let out = ''
  let i = 0
  const n = code.length

  while (i < n) {
    // Comment — bright enough to read, muted enough to not distract
    if (code[i] === '#') {
      const end = code.indexOf('\n', i)
      const seg = end === -1 ? code.slice(i) : code.slice(i, end)
      out += `<span style="color:#6272a4;font-style:italic">${esc(seg)}</span>`
      i += seg.length
      continue
    }
    // Triple-quoted string
    if ((code[i] === '"' || code[i] === "'") && code.slice(i, i + 3) === code[i].repeat(3)) {
      const q = code[i].repeat(3)
      const end = code.indexOf(q, i + 3)
      const seg = end === -1 ? code.slice(i) : code.slice(i, end + 3)
      out += `<span style="color:#f1fa8c">${esc(seg)}</span>`
      i += seg.length
      continue
    }
    // Single-quoted string
    if (code[i] === '"' || code[i] === "'") {
      const q = code[i]; let j = i + 1
      while (j < n && code[j] !== q && code[j] !== '\n') { if (code[j] === '\\') j++; j++ }
      const seg = code.slice(i, Math.min(j + 1, n))
      out += `<span style="color:#f1fa8c">${esc(seg)}</span>`
      i = Math.min(j + 1, n)
      continue
    }
    // Decorator
    if (code[i] === '@') {
      let j = i + 1
      while (j < n && /[\w.]/.test(code[j])) j++
      out += `<span style="color:#ff79c6">${esc(code.slice(i, j))}</span>`
      i = j; continue
    }
    // Number
    if (/\d/.test(code[i]) && (i === 0 || !/\w/.test(code[i - 1]))) {
      let j = i
      while (j < n && /[\d._xXbBoOeEaAbBcCdDfF]/.test(code[j])) j++
      out += `<span style="color:#ffb86c">${esc(code.slice(i, j))}</span>`
      i = j; continue
    }
    // Word
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i
      while (j < n && /\w/.test(code[j])) j++
      const word = code.slice(i, j)
      const after = code[j]
      if (word === 'self' || word === 'cls') {
        out += `<span style="color:#ff79c6;font-style:italic">${word}</span>`
      } else if (PY_KEYWORDS.has(word)) {
        out += `<span style="color:#bd93f9;font-weight:700">${word}</span>`
      } else if (PY_BUILTINS.has(word)) {
        out += `<span style="color:#8be9fd">${word}</span>`
      } else if (after === '(') {
        out += `<span style="color:#50fa7b">${esc(word)}</span>`
      } else if (/^[A-Z]/.test(word)) {
        out += `<span style="color:#ffb86c">${esc(word)}</span>`
      } else {
        out += esc(word)
      }
      i = j; continue
    }
    // Operators
    if (/[+\-*/%=<>!&|^~]/.test(code[i])) {
      out += `<span style="color:#ff79c6">${esc(code[i])}</span>`
      i++; continue
    }
    // Brackets
    if (/[()[\]{}]/.test(code[i])) {
      const depth = '([{'.includes(code[i]) ? 0 : 1
      const colors = ['#f8f8f2', '#ff79c6', '#50fa7b']
      out += `<span style="color:${colors[depth % 3]}">${esc(code[i])}</span>`
      i++; continue
    }
    // Colon
    if (code[i] === ':') {
      out += `<span style="color:#ff79c6">:</span>`
      i++; continue
    }
    out += esc(code[i]); i++
  }
  return out
}

// ─── AI assistant panel ───────────────────────────────────────────────────────

function AiPanel({ code, onCodeUpdate, onRequirementsUpdate, onFilenameUpdate, provider, setProvider, modelId, setModelId, messages, setMessages }: {
  code: string; onCodeUpdate: (c: string) => void; onRequirementsUpdate: (r: string) => void; onFilenameUpdate: (f: string) => void
  provider: 'anthropic' | 'openai'; setProvider: (p: 'anthropic' | 'openai') => void
  modelId: string; setModelId: (m: string) => void
  messages: AiChatMessage[]; setMessages: React.Dispatch<React.SetStateAction<AiChatMessage[]>>
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
      if (res.code) {
        onCodeUpdate(res.code)
        const nameMatch = res.code.match(/name\s*=\s*["']([a-z_][a-z0-9_]*)["']/)
        if (nameMatch) onFilenameUpdate(`${nameMatch[1]}.py`)
      }
      if (res.requirements) onRequirementsUpdate(res.requirements)
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

// ─── editor panel ────────────────────────────────────────────────────────────

const TOOL_TEMPLATE = `from agentcore.object_model.tool import Tool, Parameter


class MyTool(Tool):
    def __init__(self):
        super().__init__(
            # 'name' is how agents call this tool — use snake_case, no spaces
            name="my_tool",
            # 'description' is shown to the LLM — be specific so it knows when to use this tool
            description="Describe exactly what this tool does and when to use it",
            parameters=[
                # Required parameter — type can be "string", "integer", "number", "boolean"
                Parameter(name="input", type="string", description="The input text to process"),
                # Optional parameter example (not listed in 'required' below)
                # Parameter(name="max_results", type="integer", description="Max items to return (default: 10)"),
            ],
            # List only the parameter names that are mandatory
            required={"input"},
        )

    def run(self, **kwargs) -> str:
        input_text = kwargs.get("input", "")
        # max_results = int(kwargs.get("max_results", 10))

        # Your logic here — return a plain string the LLM can read
        return f"Result: {input_text}"
`

// IDE color palette
const IDE = {
  bg:       '#282a36',
  gutter:   '#21222c',
  lineNum:  '#6272a4',
  text:     '#f8f8f2',
  border:   '#44475a',
  cursor:   '#f8f8f2',
  inputBg:  '#21222c',
  inputBdr: '#6272a4',
}

function EditorPanel({ onUploaded }: { onUploaded: (t: ToolRecord) => void }) {
  const [code, setCode] = useState(TOOL_TEMPLATE)
  const [filename, setFilename] = useState('my_tool.py')
  const [requirements, setRequirements] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [aiOpen, setAiOpen] = useState(false)
  const [aiProvider, setAiProvider] = useState<'anthropic' | 'openai'>('anthropic')
  const [aiModelId, setAiModelId] = useState('claude-sonnet-5')
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([])
  const lines = code.split('\n')

  const submit = async () => {
    if (!code.trim()) return
    setUploading(true); setError(''); setWarnings([])
    try {
      const blob = new Blob([code], { type: 'text/x-python' })
      const fname = filename.endsWith('.py') ? filename : `${filename}.py`
      const file = new File([blob], fname, { type: 'text/x-python' })
      const res = await uploadTool(file, requirements)
      setWarnings(res.warnings)
      onUploaded(res.tool)
      setCode(TOOL_TEMPLATE); setFilename('my_tool.py'); setRequirements('')
    } catch (e: any) {
      const detail = e.detail
      if (detail?.errors) setError(detail.errors.join(' · '))
      else setError(e.message || String(e))
    } finally { setUploading(false) }
  }

  // Shared font/spacing so pre and textarea pixels align perfectly
  const FONT: React.CSSProperties = {
    ...MONO, fontSize: 13, lineHeight: '1.65',
    whiteSpace: 'pre', overflowWrap: 'normal', tabSize: 4,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: IDE.bg, overflow: 'hidden' }}>

      {/* Title bar */}
      <div style={{ background: IDE.gutter, padding: '9px 16px', borderBottom: `1px solid ${IDE.border}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#ff5f57','#febc2e','#28c840'].map(c => (
            <span key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c, display: 'inline-block' }} />
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <span style={{ ...MONO, fontSize: 11, color: '#6e7191', background: `${IDE.border}aa`, padding: '2px 14px', borderRadius: 4 }}>
            {filename}
          </span>
        </div>
        <button
          onClick={() => setAiOpen(o => !o)}
          style={{
            ...MONO, fontSize: 11, padding: '3px 12px', borderRadius: 5, cursor: 'pointer',
            border: `1px solid ${aiOpen ? '#a78bfa' : IDE.border}`,
            background: aiOpen ? '#a78bfa22' : 'transparent',
            color: aiOpen ? '#a78bfa' : IDE.lineNum,
            transition: 'all 0.15s',
          }}
        >✨ AI</button>
        <span style={{ ...MONO, fontSize: 10, color: IDE.lineNum }}>{lines.length} lines</span>
      </div>

      {/* Filename + requirements */}
      <div style={{ display: 'flex', gap: 10, padding: '10px 16px', background: IDE.gutter, borderBottom: `1px solid ${IDE.border}`, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...MONO, fontSize: 9, color: '#6e7191', marginBottom: 3, letterSpacing: '0.1em' }}>FILENAME</div>
          <input value={filename} onChange={e => setFilename(e.target.value)} placeholder="my_tool.py"
            style={{ width: '100%', fontSize: 12, padding: '5px 10px', background: IDE.inputBg, color: IDE.text, border: `1px solid ${IDE.inputBdr}`, borderRadius: 5, ...MONO, boxSizing: 'border-box', outline: 'none' }} />
        </div>
        <div style={{ flex: 2 }}>
          <div style={{ ...MONO, fontSize: 9, color: '#6e7191', marginBottom: 3, letterSpacing: '0.1em' }}>
            REQUIREMENTS <span style={{ color: '#45475a' }}>(optional — pip packages)</span>
          </div>
          <input value={requirements} onChange={e => setRequirements(e.target.value)} placeholder="e.g. requests, pandas>=2.0"
            style={{ width: '100%', fontSize: 12, padding: '5px 10px', background: IDE.inputBg, color: IDE.text, border: `1px solid ${IDE.inputBdr}`, borderRadius: 5, ...MONO, boxSizing: 'border-box', outline: 'none' }} />
        </div>
      </div>

      {/*
        Code area — single scroll container handles BOTH axes.
        Line numbers are `position: sticky; left: 0` so they stay visible
        during horizontal scroll without any JS sync.
        The code content is `min-width: max-content` so the container grows
        to fit long lines and the native scrollbar appears automatically.
      */}
      {/*
        Single scroll container for BOTH axes.
        overflow: auto creates the scrollable viewport.
        Line numbers use position: sticky left: 0 — they pin during H scroll.
        Code content uses minWidth: 100% (fills container when code is short)
        and width: max-content (grows wider than container when lines are long),
        which is what makes the H scrollbar appear.
      */}
      {/* Editor + AI panel side by side */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Editor column */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>

          {/* Code area */}
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0, background: IDE.bg }}>
            <div style={{ display: 'inline-flex', minWidth: '100%', minHeight: '100%' }}>
              <div style={{
                ...FONT,
                position: 'sticky', left: 0, zIndex: 3,
                padding: '14px 12px 14px 14px',
                color: IDE.lineNum, background: IDE.gutter,
                borderRight: `1px solid ${IDE.border}`,
                userSelect: 'none', flexShrink: 0,
                minWidth: 48, textAlign: 'right',
              }}>
                {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <div style={{ position: 'relative', flex: 1 }}>
                <pre
                  aria-hidden
                  style={{
                    ...FONT,
                    padding: '14px 32px 14px 16px',
                    margin: 0, color: IDE.text,
                    background: 'transparent',
                    pointerEvents: 'none',
                    width: 'max-content',
                    minWidth: '100%',
                  }}
                  dangerouslySetInnerHTML={{ __html: highlightPython(code) + '\n' }}
                />
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  spellCheck={false}
                  style={{
                    ...FONT,
                    padding: '14px 32px 14px 16px',
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    color: 'transparent', caretColor: IDE.text,
                    background: 'transparent',
                    border: 'none', outline: 'none', resize: 'none',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Tab') {
                      e.preventDefault()
                      const el = e.currentTarget
                      const start = el.selectionStart; const end = el.selectionEnd
                      const next = code.slice(0, start) + '    ' + code.slice(end)
                      setCode(next)
                      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 4 })
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div style={{ background: '#1D5FFA', padding: '3px 16px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            <span style={{ ...MONO, fontSize: 10, color: '#ffffffcc' }}>Python</span>
            <span style={{ ...MONO, fontSize: 10, color: '#ffffff77' }}>UTF-8</span>
            <span style={{ ...MONO, fontSize: 10, color: '#ffffff77' }}>Tab: 4 spaces</span>
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 16px', background: IDE.gutter, borderTop: `1px solid ${IDE.border}`, flexShrink: 0 }}>
            {error && (
              <div style={{ ...MONO, fontSize: 11, color: '#EF4444', marginBottom: 8, padding: '7px 10px', background: '#EF444420', border: '1px solid #EF444440', borderRadius: 6 }}>
                {error}
              </div>
            )}
            {warnings.length > 0 && (
              <div style={{ ...MONO, fontSize: 11, color: '#F59E0B', marginBottom: 8, padding: '7px 10px', background: '#F59E0B20', border: '1px solid #F59E0B40', borderRadius: 6 }}>
                ⚠ {warnings.join(' · ')}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={submit} disabled={!code.trim() || uploading}
                style={{
                  ...MONO, fontSize: 12, padding: '7px 22px',
                  background: !code.trim() || uploading ? '#313244' : '#1D5FFA',
                  color: !code.trim() || uploading ? IDE.lineNum : '#fff',
                  border: 'none', borderRadius: 6,
                  cursor: !code.trim() || uploading ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                }}
              >{uploading ? 'Uploading…' : 'Submit for Review'}</button>
              <span style={{ ...MONO, fontSize: 10, color: IDE.lineNum }}>{lines.length} lines · Tab = 4 spaces</span>
            </div>
          </div>

        </div>

        {/* AI panel */}
        {aiOpen && (
          <div style={{ width: 400, flexShrink: 0 }}>
            <AiPanel
              code={code} onCodeUpdate={setCode} onRequirementsUpdate={setRequirements} onFilenameUpdate={setFilename}
              provider={aiProvider} setProvider={setAiProvider}
              modelId={aiModelId} setModelId={setAiModelId}
              messages={aiMessages} setMessages={setAiMessages}
            />
          </div>
        )}

      </div>
    </div>
  )
}

// ─── upload panel ─────────────────────────────────────────────────────────────

function UploadPanel({ onUploaded }: { onUploaded: (t: ToolRecord) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [requirements, setRequirements] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.py')) setFile(f)
    else setError('Only .py files are accepted.')
  }

  const submit = async () => {
    if (!file) return
    setUploading(true); setError(''); setWarnings([])
    try {
      const res = await uploadTool(file, requirements)
      setWarnings(res.warnings)
      onUploaded(res.tool)
      setFile(null); setRequirements('')
    } catch (e: any) {
      const detail = e.detail
      if (detail?.errors) setError(detail.errors.join(' · '))
      else setError(e.message || String(e))
    } finally { setUploading(false) }
  }

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 20,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 14 }}>
        Upload Custom Tool
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.py'; i.onchange = (e: any) => setFile(e.target.files[0]); i.click() }}
        style={{
          border: `2px dashed ${dragging ? '#1D5FFA' : 'var(--border)'}`,
          borderRadius: 8, padding: '20px', textAlign: 'center',
          cursor: 'pointer', marginBottom: 12,
          background: dragging ? '#1D5FFA0A' : 'var(--bg-page)',
          transition: 'all 0.15s',
        }}
      >
        {file ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ ...MONO, fontSize: 12, color: '#1D5FFA' }}>📄 {file.name}</span>
            <button
              onClick={e => { e.stopPropagation(); setFile(null) }}
              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 14 }}
            >×</button>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Drop a <span style={{ ...MONO, color: '#1D5FFA' }}>.py</span> file here or click to browse
          </div>
        )}
      </div>

      {/* Requirements */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
          REQUIREMENTS <span style={{ color: '#6B7280' }}>(optional — pip packages)</span>
        </div>
        <input
          value={requirements}
          onChange={e => setRequirements(e.target.value)}
          placeholder="e.g. requests, pandas>=2.0, httpx"
          style={{
            width: '100%', fontSize: 12, padding: '7px 10px',
            background: 'var(--bg-page)', color: 'var(--text-body)',
            border: '1px solid var(--border)', borderRadius: 6, ...MONO,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {error && (
        <div style={{
          ...MONO, fontSize: 11, color: '#EF4444', marginBottom: 10,
          padding: '8px 10px', background: '#EF444420',
          border: '1px solid #EF444440', borderRadius: 6,
        }}>{error}</div>
      )}

      {warnings.length > 0 && (
        <div style={{
          ...MONO, fontSize: 11, color: '#F59E0B', marginBottom: 10,
          padding: '8px 10px', background: '#F59E0B20',
          border: '1px solid #F59E0B40', borderRadius: 6,
        }}>
          ⚠ {warnings.join(' · ')}
        </div>
      )}

      <button
        onClick={submit} disabled={!file || uploading}
        style={{
          ...MONO, fontSize: 12, padding: '8px 20px',
          background: !file || uploading ? 'var(--border)' : '#1D5FFA',
          color: !file || uploading ? 'var(--text-muted)' : '#fff',
          border: 'none', borderRadius: 6, cursor: !file || uploading ? 'not-allowed' : 'pointer',
          fontWeight: 700,
        }}
      >{uploading ? 'Uploading…' : 'Submit for Review'}</button>
    </div>
  )
}

// ─── tool row ─────────────────────────────────────────────────────────────────

function ToolRow({ tool, onApprove, onRejectClick, onDelete, onTest, onViewSource }: {
  tool: ToolRecord
  onApprove: () => void
  onRejectClick: () => void
  onDelete: () => void
  onTest: () => void
  onViewSource: () => void
}) {
  const [approving, setApproving] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const color = STATUS_COLOR[tool.status]

  const handleApprove = () => {
    setApproving(true)
    try { onApprove() } finally { setApproving(false) }
  }

  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid var(--border)`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 8, overflow: 'hidden',
      marginBottom: 10,
    }}>
      {/* Main row */}
      <div style={{
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer',
      }} onClick={() => setExpanded(v => !v)}>
        <span style={{ ...MONO, fontSize: 12, color, minWidth: 20 }}>
          {STATUS_ICON[tool.status]}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)' }}>
              {tool.name}
            </span>
            <Chip label={tool.status} color={color} />
            {tool.display_name && tool.display_name !== tool.name && (
              <Chip label={tool.display_name} color="#6B7280" />
            )}
            {tool.risk_flags.length > 0 && (
              <Chip label={`⚠ ${tool.risk_flags.length} flag${tool.risk_flags.length > 1 ? 's' : ''}`} color="#F59E0B" />
            )}
            {tool.requirements && (
              <Chip label="has requirements" color="#7C3AED" />
            )}
          </div>
          <div style={{
            fontSize: 12, color: 'var(--text-muted)', marginTop: 3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {tool.description || '—'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {/* Action buttons */}
          {tool.status === 'pending' && (
            <>
              <Btn onClick={e => { e.stopPropagation(); handleApprove() }} color="#10B981" disabled={approving}>
                {approving ? '…' : '✓ Approve'}
              </Btn>
              <Btn onClick={e => { e.stopPropagation(); onRejectClick() }} color="#EF4444">
                ✗ Reject
              </Btn>
            </>
          )}
          <Btn onClick={e => { e.stopPropagation(); onTest() }} color="#1D5FFA">
            ▶ Test
          </Btn>
          <Btn onClick={e => { e.stopPropagation(); onViewSource() }} color="#6B7280">
            {'</>'}
          </Btn>
          <Btn onClick={e => { e.stopPropagation(); onDelete() }} color="#EF4444">
            🗑
          </Btn>
          <span style={{ ...MONO, fontSize: 11, color: 'var(--text-muted)' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--border)', padding: '14px 18px',
          background: 'var(--bg-page)',
        }}>
          {/* Risk flags */}
          {tool.risk_flags.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ ...MONO, fontSize: 10, color: '#F59E0B', marginBottom: 6, letterSpacing: '0.1em' }}>
                RISK FLAGS
              </div>
              {tool.risk_flags.map((f, i) => (
                <div key={i} style={{
                  ...MONO, fontSize: 11, color: '#F59E0B',
                  padding: '4px 8px', background: '#F59E0B15',
                  border: '1px solid #F59E0B30', borderRadius: 4,
                  marginBottom: 4,
                }}>⚠ {f}</div>
              ))}
            </div>
          )}

          {/* Requirements */}
          {tool.requirements && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ ...MONO, fontSize: 10, color: '#7C3AED', marginBottom: 6, letterSpacing: '0.1em' }}>
                REQUIREMENTS
              </div>
              <div style={{
                ...MONO, fontSize: 11, color: 'var(--text-body)',
                padding: '6px 10px', background: '#7C3AED15',
                border: '1px solid #7C3AED30', borderRadius: 4,
              }}>{tool.requirements}</div>
            </div>
          )}

          {/* Parameters */}
          {tool.parameters.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.1em' }}>
                PARAMETERS
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tool.parameters.map(p => (
                  <span key={p.name} style={{
                    ...MONO, fontSize: 11, padding: '3px 8px',
                    background: '#1D5FFA15', color: '#1D5FFA',
                    border: '1px solid #1D5FFA30', borderRadius: 4,
                  }}>
                    {p.name}: <span style={{ color: '#F59E0B' }}>{p.type}</span>
                    {tool.required.includes(p.name) && <span style={{ color: '#EF4444' }}>*</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rejection reason */}
          {tool.status === 'rejected' && tool.rejection_reason && (
            <div style={{
              ...MONO, fontSize: 11, color: '#EF4444',
              padding: '8px 10px', background: '#EF444415',
              border: '1px solid #EF444430', borderRadius: 4,
            }}>
              Rejected: {tool.rejection_reason}
            </div>
          )}

          {/* Timestamps */}
          <div style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
            Uploaded {fmt(tool.created_at)}
            {tool.updated_at !== tool.created_at && ` · Updated ${fmt(tool.updated_at)}`}
          </div>
        </div>
      )}
    </div>
  )
}

function Btn({ children, onClick, color, disabled }: {
  children: React.ReactNode
  onClick: React.MouseEventHandler
  color: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...MONO, fontSize: 11, padding: '4px 10px',
        background: disabled ? 'var(--bg-page)' : `${color}20`,
        border: `1px solid ${color}44`,
        color: disabled ? 'var(--text-muted)' : color,
        borderRadius: 5, cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 600,
      }}
    >{children}</button>
  )
}

// ─── right-panel empty state ──────────────────────────────────────────────────

function RightEmptyState({ onEditor, onUpload }: { onEditor: () => void; onUpload: () => void }) {
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start', gap: 20, padding: '28px 32px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, background: '#1D5FFA12',
          border: '1px solid #1D5FFA28', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1D5FFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 6 }}>
          Add a Custom Tool
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 280 }}>
          Write Python code directly in the editor, or upload an existing <span style={{ ...MONO, color: '#1D5FFA' }}>.py</span> file. Tools go through a review process before agents can use them.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexDirection: 'column', width: '100%', maxWidth: 260 }}>
        <button onClick={onEditor} style={{
          ...MONO, fontSize: 12, padding: '10px 0', width: '100%',
          background: '#7C3AED', color: '#fff', border: 'none',
          borderRadius: 8, cursor: 'pointer', fontWeight: 700,
        }}>✎ Write Code</button>
        <button onClick={onUpload} style={{
          ...MONO, fontSize: 12, padding: '10px 0', width: '100%',
          background: 'var(--bg-card)', color: '#1D5FFA',
          border: '1px solid #1D5FFA44', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
        }}>↑ Upload .py File</button>
      </div>

      <div style={{
        width: '100%', maxWidth: 320, background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px',
      }}>
        <div style={{ ...MONO, fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 10 }}>
          TOOL LIFECYCLE
        </div>
        {[
          { step: '1', label: 'Upload or write a .py tool', color: '#1D5FFA' },
          { step: '2', label: 'Review risk flags & approve', color: '#F59E0B' },
          { step: '3', label: 'Test before deploying', color: '#7C3AED' },
          { step: '4', label: 'Agents can now use it', color: '#10B981' },
        ].map(({ step, label, color }) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%', background: `${color}18`,
              border: `1px solid ${color}40`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
              ...MONO, fontSize: 9, fontWeight: 700, color,
            }}>{step}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function Tools() {
  const [tools, setTools] = useState<ToolRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ToolStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState<'upload' | 'editor' | false>(false)
  const [viewSourceId, setViewSourceId] = useState<string | null>(null)
  const [testTool_, setTestTool] = useState<ToolRecord | null>(null)
  const [rejectTarget, setRejectTarget] = useState<ToolRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ToolRecord | null>(null)
  const [listCollapsed, setListCollapsed] = useState(false)

  const reload = useCallback(() => {
    listTools().then(setTools).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { reload() }, [reload])

  const handleApprove = async (tool: ToolRecord) => {
    await approveTool(tool.tool_id)
    reload()
  }

  const handleReject = async (reason: string) => {
    if (!rejectTarget) return
    await rejectTool(rejectTarget.tool_id, reason)
    setRejectTarget(null)
    reload()
  }

  const handleDelete = async (tool: ToolRecord) => {
    setDeleteTarget(tool)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await deleteTool(deleteTarget.tool_id)
    setDeleteTarget(null)
    reload()
  }

  const counts: Record<string, number> = {
    all: tools.length,
    pending: tools.filter(t => t.status === 'pending').length,
    approved: tools.filter(t => t.status === 'approved').length,
    rejected: tools.filter(t => t.status === 'rejected').length,
  }

  const byTab = activeTab === 'all' ? tools : tools.filter(t => t.status === activeTab)
  const filtered = search.trim()
    ? byTab.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : byTab

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Top header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', borderBottom: '1px solid var(--border)',
        flexShrink: 0, background: 'var(--bg-card)',
      }}>
        <div>
          <div style={{ ...MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#1D5FFA', marginBottom: 4 }}>
            CONFIGURATION
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
            Tool Management
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowAdd(showAdd === 'editor' ? false : 'editor')}
            style={{
              ...MONO, fontSize: 12, padding: '7px 14px',
              background: showAdd === 'editor' ? '#7C3AED22' : '#7C3AED',
              color: showAdd === 'editor' ? '#7C3AED' : '#fff',
              border: showAdd === 'editor' ? '1px solid #7C3AED44' : 'none',
              borderRadius: 7, cursor: 'pointer', fontWeight: 700,
            }}
          >{showAdd === 'editor' ? '✕ Cancel' : '✎ Write Code'}</button>
          <button
            onClick={() => setShowAdd(showAdd === 'upload' ? false : 'upload')}
            style={{
              ...MONO, fontSize: 12, padding: '7px 14px',
              background: showAdd === 'upload' ? '#1D5FFA22' : '#1D5FFA',
              color: showAdd === 'upload' ? '#1D5FFA' : '#fff',
              border: showAdd === 'upload' ? '1px solid #1D5FFA44' : 'none',
              borderRadius: 7, cursor: 'pointer', fontWeight: 700,
            }}
          >{showAdd === 'upload' ? '✕ Cancel' : '↑ Upload File'}</button>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', position: 'relative' }}>

        {/* Left: tabs + tool list */}
        <div style={{
          flex: listCollapsed ? '0 0 0' : '0 0 54%',
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid var(--border)', overflow: 'hidden',
          background: 'var(--bg-page)',
          transition: 'flex 0.2s ease',
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 0, paddingLeft: 20,
            borderBottom: '1px solid var(--border)', flexShrink: 0,
            background: 'var(--bg-card)',
          }}>
            {TAB_LABELS.map(tab => {
              const active = activeTab === tab.key
              const cnt = counts[tab.key] ?? 0
              const isAlert = tab.key === 'pending' && cnt > 0
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    ...MONO, fontSize: 11, padding: '10px 14px',
                    background: 'none', border: 'none',
                    borderBottom: `2px solid ${active ? '#1D5FFA' : 'transparent'}`,
                    color: active ? '#1D5FFA' : isAlert ? '#F59E0B' : 'var(--text-muted)',
                    cursor: 'pointer', fontWeight: active ? 700 : 500,
                    marginBottom: -1, whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                  {cnt > 0 && (
                    <span style={{
                      marginLeft: 5, fontSize: 9, padding: '1px 5px',
                      background: isAlert ? '#F59E0B22' : '#1D5FFA18',
                      color: isAlert ? '#F59E0B' : '#1D5FFA',
                      borderRadius: 10, fontWeight: 700,
                    }}>{cnt}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-card)' }}>
            <div style={{ position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tools by name or description…"
                style={{
                  width: '100%', fontSize: 12, padding: '7px 10px 7px 32px',
                  background: 'var(--bg-page)', color: 'var(--text-body)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  boxSizing: 'border-box', outline: 'none', ...MONO,
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0,
                }}>×</button>
              )}
            </div>
          </div>

          {/* Tool list (scrollable) */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {loading ? (
              <div style={{ ...MONO, fontSize: 12, color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>
                Loading tools…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                {search.trim()
                  ? `No tools match "${search}"`
                  : activeTab === 'pending' ? 'No tools pending review.'
                  : activeTab === 'approved' ? 'No approved tools yet.'
                  : 'No tools in this category.'}
              </div>
            ) : (
              filtered.map(tool => (
                <ToolRow
                  key={tool.tool_id}
                  tool={tool}
                  onApprove={() => handleApprove(tool)}
                  onRejectClick={() => setRejectTarget(tool)}
                  onDelete={() => handleDelete(tool)}
                  onTest={() => setTestTool(tool)}
                  onViewSource={() => setViewSourceId(tool.tool_id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: editor / upload / empty state — flex column so children can fill height */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fafafb', position: 'relative' }}>
          {/* Collapse/expand toggle */}
          <button
            onClick={() => setListCollapsed(c => !c)}
            title={listCollapsed ? 'Show tool list' : 'Hide tool list'}
            style={{
              position: 'absolute', top: '50%', left: 0,
              transform: 'translateY(-50%)',
              zIndex: 10, width: 18, height: 48,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderLeft: 'none',
              borderRadius: '0 6px 6px 0',
              cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: 10,
              boxShadow: '2px 0 6px rgba(0,0,0,0.06)',
            }}
          >{listCollapsed ? '›' : '‹'}</button>
          {showAdd === 'editor' && (
            // no padding wrapper — editor fills 100%
            <EditorPanel onUploaded={_t => {
              reload(); setShowAdd(false); setActiveTab('pending'); setListCollapsed(false)
            }} />
          )}
          {showAdd === 'upload' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <UploadPanel onUploaded={_t => {
                reload(); setShowAdd(false); setActiveTab('pending')
              }} />
            </div>
          )}
          {!showAdd && (
            <RightEmptyState
              onEditor={() => setShowAdd('editor')}
              onUpload={() => setShowAdd('upload')}
            />
          )}
        </div>
      </div>

      {/* Modals / panels */}
      {viewSourceId && (
        <CodePanel toolId={viewSourceId} onClose={() => setViewSourceId(null)} />
      )}
      {testTool_ && (
        <TestPanel tool={testTool_} onClose={() => setTestTool(null)} />
      )}
      {rejectTarget && (
        <RejectModal
          tool={rejectTarget}
          onConfirm={handleReject}
          onClose={() => setRejectTarget(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          message={`Delete tool "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete Tool"
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
