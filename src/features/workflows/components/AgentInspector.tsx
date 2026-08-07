import { useState, useEffect } from 'react'
import type { NodeRunResult } from '../api/workflows.api'
import { StatusPill } from './StatusPill'
import { MONO, SANS, elapsedSec, formatTokens } from '../lib/workflowsUi'

export function AgentInspector({
  nr, tab, onTabChange, onClose, onExpand,
}: {
  nr: NodeRunResult
  tab: 'system' | 'input' | 'output'
  onTabChange: (t: 'system' | 'input' | 'output') => void
  onClose: () => void
  onExpand: (label: string, value: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVisible(false)
        setTimeout(onClose, 220)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // intentionally only bind once; onClose clears inspect state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 220)
  }

  const content =
    tab === 'system' ? (nr.system_prompt_used || '')
    : tab === 'input' ? (nr.input_text || '')
    : (nr.output_text || '')
  const lineCount = content ? content.split('\n').length : 0
  const duration = elapsedSec(nr.started_at, nr.completed_at)
  const tokens = nr.input_tokens + nr.output_tokens

  const tabs: Array<{ id: 'system' | 'input' | 'output'; label: string }> = [
    { id: 'system', label: 'System' },
    { id: 'input', label: 'Input' },
    { id: 'output', label: 'Output' },
  ]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch { /* ignore */ }
  }

  return (
    <>
      <div
        className="wf-agent-inspector-backdrop"
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
        className="wf-agent-inspector"
        role="dialog"
        aria-label="Agent Inspector"
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
        {/* Header — matches New Agent panel */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-page)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              ...MONO, fontSize: 10, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--text-tertiary)', marginBottom: 4,
            }}>
              Agent Inspector
            </div>
            <div style={{
              ...MONO, fontSize: 15, fontWeight: 700, color: 'var(--text-heading)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {nr.node_label || nr.node_id}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <StatusPill status={nr.status} />
              <span style={{ ...SANS, fontSize: 12, color: 'var(--text-tertiary)' }}>{duration}</span>
              <span style={{ ...SANS, fontSize: 12, color: 'var(--text-tertiary)' }}>
                {formatTokens(tokens)} tok
              </span>
            </div>
          </div>
          <button
            type="button"
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

        {/* Tabs */}
        <div style={{
          padding: '0 24px', display: 'flex', gap: 0, flexShrink: 0,
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-page)',
        }}>
          {tabs.map(t => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                style={{
                  ...SANS, fontSize: 13, fontWeight: active ? 600 : 500,
                  padding: '12px 14px', cursor: 'pointer',
                  border: 'none',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -1,
                  background: 'transparent',
                  color: active ? 'var(--accent-text)' : 'var(--text-tertiary)',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div style={{
          flex: 1, minHeight: 0, overflow: 'auto',
          padding: '20px 24px 24px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              ...MONO, fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              {lineCount} lines
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={copy}
                title={copied ? 'Copied' : 'Copy'}
                aria-label={copied ? 'Copied' : 'Copy'}
                style={{
                  width: 32, height: 32, padding: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: copied ? 'var(--accent-soft)' : 'var(--bg-hover)',
                  border: `1px solid ${copied ? 'var(--blue-border)' : 'var(--border)'}`,
                  borderRadius: 8, cursor: 'pointer',
                  color: copied ? 'var(--accent-text)' : 'var(--text-secondary)',
                }}
              >
                {copied ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                    <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                    <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => onExpand(
                  `${nr.node_label || nr.node_id} — ${tab[0].toUpperCase()}${tab.slice(1)}`,
                  content,
                )}
                title="Expand"
                aria-label="Expand"
                style={{
                  width: 32, height: 32, padding: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: 8, cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {nr.error_message && tab === 'output' && (
            <div style={{
              padding: '8px 10px',
              background: 'var(--invalid-dim)', border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8, color: 'var(--invalid)', fontSize: 12, ...SANS,
            }}>
              {nr.error_message}
            </div>
          )}

          <pre style={{
            ...MONO, fontSize: 12, lineHeight: 1.55, color: 'var(--text-primary)',
            margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            background: 'var(--bg-page)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '14px 16px', flex: 1,
          }}>
            {content || '—'}
          </pre>
        </div>
      </div>
    </>
  )
}
