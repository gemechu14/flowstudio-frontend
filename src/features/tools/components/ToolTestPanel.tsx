import { useState } from 'react'
import { testTool, type ToolRecord } from '../api/tools.api'
import { MONO } from '../lib/toolsUi'

export function ToolTestPanel({ tool, onClose }: { tool: ToolRecord; onClose: () => void }) {
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
