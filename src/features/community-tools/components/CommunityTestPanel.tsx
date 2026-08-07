import { useState } from 'react'
import type { CommunityToolCard } from '../api/communityTools.api'
import { testTool, type TestResult } from '../../tools/api/tools.api'
import { MONO, SANS } from '../lib/communityToolsUi'

export function CommunityTestPanel({ tool, onClose }: { tool: CommunityToolCard; onClose: () => void }) {
  const [params, setParams] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  async function run() {
    setRunning(true); setResult(null)
    try {
      const r = await testTool(tool.tool_id, params)
      setResult(r)
    } catch (e: unknown) {
      setResult({ success: false, output: null, error: String((e as { message?: string })?.message ?? e), elapsed_seconds: 0 })
    } finally { setRunning(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
    }} onClick={onClose}>
      <div
        className="ct-test-panel"
        onClick={e => e.stopPropagation()}
        style={{
        width: 460, height: '100%', background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-panel)', ...SANS,
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ ...MONO, fontSize: 13, fontWeight: 600, color: 'var(--text-heading)' }}>{tool.name}</div>
            <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>Test run</div>
          </div>
          <button onClick={onClose} style={{
            ...SANS, background: 'var(--bg-hover)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12,
            borderRadius: 8, padding: '5px 10px',
          }}>✕ Close</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {tool.parameters.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              {tool.parameters.map(p => (
                <div key={p.name} style={{ marginBottom: 12 }}>
                  <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                    {p.name} <span style={{ color: 'var(--accent)' }}>{p.type}</span>
                    {tool.required.includes(p.name) && <span style={{ color: 'var(--invalid)' }}> *</span>}
                  </div>
                  <input
                    value={params[p.name] || ''}
                    onChange={e => setParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                    placeholder={p.description || `Enter ${p.name}`}
                    style={{
                      width: '100%', ...MONO, fontSize: 12, padding: '8px 12px',
                      backgroundColor: 'var(--card-bg)', color: 'var(--text-heading)',
                      border: '1px solid var(--border)', borderRadius: 8, boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...MONO, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 16 }}>
              No parameters required.
            </div>
          )}
          <button onClick={run} disabled={running} style={{
            width: '100%', padding: '10px',
            background: 'var(--accent)', color: 'var(--btn-upload-text)',
            border: '1px solid var(--accent)', borderRadius: 999, cursor: running ? 'wait' : 'pointer',
            fontWeight: 600, fontSize: 13, ...SANS,
            opacity: running ? 0.7 : 1,
          }}>{running ? 'Running…' : 'Run'}</button>
          {result && (
            <div style={{
              marginTop: 16, padding: 14, borderRadius: 8,
              background: result.success ? 'var(--verified-dim)' : 'var(--invalid-dim)',
              border: `1px solid ${result.success ? 'rgba(34,197,94,0.28)' : 'rgba(239,68,68,0.28)'}`,
            }}>
              <div style={{ ...MONO, fontSize: 10, color: result.success ? 'var(--verified)' : 'var(--invalid)', marginBottom: 6 }}>
                {result.success ? '✓ Success' : '✗ Error'} · {result.elapsed_seconds.toFixed(2)}s
              </div>
              <pre style={{ ...MONO, fontSize: 11, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {result.output ?? result.error}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
