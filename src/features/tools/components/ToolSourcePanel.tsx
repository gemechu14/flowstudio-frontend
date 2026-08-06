import { useState, useEffect } from 'react'
import { getToolSource } from '../api/tools.api'
import { MONO } from '../lib/toolsUi'

export function ToolSourcePanel({ toolId, onClose }: { toolId: string; onClose: () => void }) {
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
