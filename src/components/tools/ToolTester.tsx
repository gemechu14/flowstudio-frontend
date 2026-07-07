import { useState, useEffect } from 'react'
import { Tool } from './ToolCard'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { testTool } from '../../api/tools'
import { ApiError } from '../../api/client'

interface ToolTesterProps {
  tool: Tool | null
  onClose: () => void
}

type RunState = 'idle' | 'running' | 'success' | 'error'

// Mock results for built-in tools (they need real API keys to run for real)
const BUILTIN_MOCK: Record<string, { output: string; executionMs: number }> = {
  web_search: {
    output: `[\n  { "title": "Anthropic launches Claude Sonnet 5", "url": "https://anthropic.com/...", "snippet": "..." },\n  { "title": "AI agent frameworks compared 2026", "url": "https://example.com/...", "snippet": "..." }\n]`,
    executionMs: 842,
  },
  run_sql: {
    output: `[\n  { "id": 1, "name": "Acme Corp", "revenue": 1240000 },\n  { "id": 2, "name": "Beta Inc",  "revenue":  980000 }\n]`,
    executionMs: 213,
  },
  send_slack: {
    output: `{ "ok": true, "ts": "1720281600.123456", "channel": "C012AB3CD" }`,
    executionMs: 157,
  },
  get_schema: {
    output: `{\n  "tables": ["users", "agents", "workflows", "runs", "tools"],\n  "version": "2.1.0",\n  "dialect": "PostgreSQL 16"\n}`,
    executionMs: 89,
  },
}

export default function ToolTester({ tool, onClose }: ToolTesterProps) {
  const [params, setParams] = useState<Record<string, string>>({})
  const [runState, setRunState] = useState<RunState>('idle')
  const [result, setResult] = useState<{ output: string; executionMs: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [visible, setVisible] = useState(false)

  // Animate in
  useEffect(() => {
    if (tool) {
      setVisible(false)
      setTimeout(() => setVisible(true), 10)
      setParams({})
      setRunState('idle')
      setResult(null)
    }
  }, [tool])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 220)
  }

  const handleRun = async () => {
    if (!tool) return
    setRunState('running')
    setResult(null)
    setErrorMsg('')

    if (tool.source === 'custom') {
      try {
        const res = await testTool(tool.id, params)
        if (res.success) {
          setResult({ output: res.output ?? '', executionMs: Math.round(res.elapsed_seconds * 1000) })
          setRunState('success')
        } else {
          setErrorMsg(res.error ?? 'Unknown error')
          setRunState('error')
        }
      } catch (err) {
        setErrorMsg(err instanceof ApiError ? String(err.detail) : String(err))
        setRunState('error')
      }
    } else {
      // Built-in tools use mock results (need real API keys to run live)
      setTimeout(() => {
        const mock = BUILTIN_MOCK[tool.id]
        if (mock) {
          setResult(mock)
          setRunState('success')
        } else {
          setErrorMsg(`No mock result for built-in tool '${tool.id}'. Configure API keys to run live.`)
          setRunState('error')
        }
      }, 600 + Math.random() * 300)
    }
  }

  if (!tool) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(8,12,24,0.35)',
          zIndex: 100,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.22s ease',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 460,
          maxWidth: '92vw',
          background: '#ffffff',
          zIndex: 101,
          boxShadow: 'var(--shadow-panel)',
          display: 'flex',
          flexDirection: 'column',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Panel header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-light)',
            background: 'var(--bg-dark)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#ffffff',
                }}
              >
                {tool.name}
              </span>
              <Badge status={tool.status} size="sm" />
            </div>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
              {tool.description}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              padding: '5px 10px',
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Panel body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Parameters form */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-body)',
                marginBottom: 12,
              }}
            >
              Parameters
            </div>

            {tool.params.length === 0 ? (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 8,
                  background: 'rgba(11,16,32,0.04)',
                  border: '1px solid var(--border-light)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--text-body)',
                }}
              >
                No parameters — this tool runs without inputs.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {tool.params.map((p) => (
                  <div key={p.name}>
                    <label
                      style={{
                        display: 'block',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-dark)',
                        marginBottom: 5,
                      }}
                    >
                      {p.name}
                      <span style={{ color: 'var(--blue-muted)', marginLeft: 5, fontWeight: 400 }}>:{p.type}</span>
                    </label>
                    <input
                      type="text"
                      placeholder={`Enter ${p.name}…`}
                      value={params[p.name] ?? ''}
                      onChange={(e) => setParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border-light)',
                        fontFamily: p.type === 'str' ? 'var(--font-sans)' : 'var(--font-mono)',
                        fontSize: 13,
                        color: 'var(--text-dark)',
                        outline: 'none',
                        transition: 'border-color 0.15s',
                        background: '#fff',
                      }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px var(--blue-dim)' }}
                      onBlur={(e) => { e.target.style.borderColor = 'var(--border-light)'; e.target.style.boxShadow = 'none' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Run button */}
          <Button
            variant="primary"
            size="md"
            onClick={handleRun}
            loading={runState === 'running'}
            style={{ alignSelf: 'flex-start' }}
          >
            {runState === 'running' ? 'Running…' : 'Run Test'}
          </Button>

          {/* Results */}
          {runState === 'success' && result && (
            <div
              style={{
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(34,197,94,0.25)',
                background: 'rgba(34,197,94,0.04)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(34,197,94,0.08)',
                  borderBottom: '1px solid rgba(34,197,94,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--verified)', fontSize: 14 }}>✓</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--verified)',
                    }}
                  >
                    Success
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--text-body)',
                  }}
                >
                  {result.executionMs}ms
                </span>
              </div>
              <pre
                style={{
                  padding: '14px 16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--text-dark)',
                  lineHeight: 1.7,
                  overflowX: 'auto',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {result.output}
              </pre>
            </div>
          )}

          {runState === 'error' && (
            <div
              style={{
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(239,68,68,0.25)',
                background: 'rgba(239,68,68,0.04)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(239,68,68,0.08)',
                  borderBottom: '1px solid rgba(239,68,68,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ color: 'var(--invalid)', fontSize: 14 }}>✗</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--invalid)',
                  }}
                >
                  Error
                </span>
              </div>
              <pre
                style={{
                  padding: '14px 16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11.5,
                  color: 'var(--invalid)',
                  lineHeight: 1.7,
                  overflowX: 'auto',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {errorMsg}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
