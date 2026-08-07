import { useState } from 'react'
import type { ToolRecord } from '../api/tools.api'
import { ToolEnvVarsEditor } from './ToolEnvVarsEditor'
import { submitTool, CATEGORIES } from '../../community-tools/api/communityTools.api'
import { Chip } from './Chip'
import { STATUS_COLOR, MONO, SANS, fmt } from '../lib/toolsUi'

export function ToolRow({ tool, onApprove, onRejectClick, onDelete, onTest, onViewSource, onEdit }: {
  tool: ToolRecord
  onApprove: () => void
  onRejectClick: () => void
  onDelete: () => void
  onTest: () => void
  onViewSource: () => void
  onEdit: () => void
}) {
  const [approving, setApproving] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)
  const [submitCategory, setSubmitCategory] = useState('utilities')
  const [submitNote, setSubmitNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitDone, setSubmitDone] = useState(false)
  const color = STATUS_COLOR[tool.status]
  const statusTone = tool.status === 'approved' ? 'accent' : tool.status === 'pending' ? 'neutral' : 'muted'

  async function handleSubmitCommunity() {
    setSubmitting(true); setSubmitError('')
    try {
      await submitTool(tool.tool_id, submitCategory, submitNote)
      setSubmitDone(true)
      setShowSubmit(false)
    } catch (e: any) {
      setSubmitError(e?.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = () => {
    setApproving(true)
    try { onApprove() } finally { setApproving(false) }
  }

  return (
    <div
      className="tools-card"
      style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderLeft: `3px solid ${color}`,
      borderRadius: 10, overflow: 'hidden',
      marginBottom: 10,
    }}>
      {/* Main row */}
      <div
        className="tools-card-main"
        style={{
        padding: '14px 18px', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12,
        cursor: 'pointer',
      }} onClick={() => setExpanded(v => !v)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="tools-card-title" style={{
              ...MONO, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)',
            }}>
              {tool.name}
            </span>
            <Chip label={tool.status} tone={statusTone} />
            {tool.display_name && tool.display_name !== tool.name && (
              <Chip label={tool.display_name} tone="muted" />
            )}
            {tool.risk_flags.length > 0 && (
              <Chip label={`${tool.risk_flags.length} flag${tool.risk_flags.length > 1 ? 's' : ''}`} tone="neutral" />
            )}
          </div>
          <div style={{
            ...MONO, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6,
            display: 'inline-block', padding: '2px 8px', maxWidth: '100%',
            background: 'var(--bg-hover)', borderRadius: 4, border: '1px solid var(--border)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', boxSizing: 'border-box',
          }}>
            {tool.name}.py
          </div>
          <div
            className="tools-card-desc"
            style={{
            ...SANS, fontSize: 13, color: 'var(--text-secondary)', marginTop: 8,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: 1.45,
          }}>
            {tool.description || '—'}
          </div>
        </div>
        <div className="tools-card-footer" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <div
            className="tools-card-actions"
            style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', rowGap: 8, flex: 1, minWidth: 0 }}
          >
            {tool.status === 'pending' && (
              <>
                <Btn onClick={e => { e.stopPropagation(); handleApprove() }} variant="approve" disabled={approving}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  {approving ? '…' : 'Approve'}
                </Btn>
                <Btn onClick={e => { e.stopPropagation(); onRejectClick() }} variant="danger" iconOnly={false}>
                  Reject
                </Btn>
              </>
            )}
            {tool.status === 'approved' && !submitDone && (
              <Btn onClick={e => { e.stopPropagation(); setShowSubmit(v => !v) }} variant="accent">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>
                </svg>
                Contribute
              </Btn>
            )}
            {submitDone && (
              <span style={{ ...MONO, fontSize: 10, color: 'var(--text-secondary)' }}>Submitted</span>
            )}
            <Btn onClick={e => { e.stopPropagation(); onTest() }} variant="accent">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              Test
            </Btn>
            <Btn onClick={e => { e.stopPropagation(); onEdit() }} variant="accent">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
              </svg>
              Edit
            </Btn>
            <Btn onClick={e => { e.stopPropagation(); onViewSource() }} variant="neutral" iconOnly>
              {'</>'}
            </Btn>
            <Btn onClick={e => { e.stopPropagation(); onDelete() }} variant="danger" iconOnly>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                <path d="M10 11v6M14 11v6"/>
              </svg>
            </Btn>
          </div>
          <span
            className="tools-card-expand"
            style={{
              ...MONO, fontSize: 11, color: 'var(--text-tertiary)',
              flexShrink: 0, alignSelf: 'flex-end', lineHeight: 1, paddingBottom: 2,
            }}
          >
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Submit to community panel */}
      {showSubmit && (
        <div style={{
          borderTop: '1px solid var(--border)', padding: '14px 18px',
          background: 'var(--card-bg)',
        }}>
          <div style={{ ...MONO, fontSize: 10, color: 'var(--accent)', marginBottom: 10, letterSpacing: '0.1em' }}>
            CONTRIBUTE TO COMMUNITY
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>Category</div>
              <select
                value={submitCategory}
                onChange={e => setSubmitCategory(e.target.value)}
                style={{
                  ...MONO, fontSize: 11,
                  background: 'var(--bg-hover)', color: 'var(--text-primary)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  padding: '6px 10px', cursor: 'pointer', outline: 'none',
                }}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>Note (optional)</div>
              <input
                value={submitNote}
                onChange={e => setSubmitNote(e.target.value)}
                placeholder="What does this tool do for others?"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  ...SANS, fontSize: 12, padding: '6px 10px',
                  background: 'var(--bg-hover)', color: 'var(--text-primary)',
                  border: '1px solid var(--border)', borderRadius: 6, outline: 'none',
                }}
              />
            </div>
            <button
              onClick={handleSubmitCommunity}
              disabled={submitting}
              style={{
                background: 'var(--btn-upload-bg)', border: '1px solid var(--btn-upload-border)', color: 'var(--btn-upload-text)',
                borderRadius: 6, padding: '7px 16px', cursor: submitting ? 'not-allowed' : 'pointer',
                ...SANS, fontSize: 12, fontWeight: 600, flexShrink: 0,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? '...' : 'Submit'}
            </button>
          </div>
          {submitError && (
            <div style={{ ...SANS, fontSize: 12, color: 'var(--invalid)', marginTop: 8 }}>{submitError}</div>
          )}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--border)', padding: '16px 18px',
          background: 'var(--card-bg)',
        }}>
          {tool.risk_flags.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 6, letterSpacing: '0.1em' }}>
                RISK FLAGS
              </div>
              {tool.risk_flags.map((f, i) => (
                <div key={i} style={{
                  ...SANS, fontSize: 12, color: 'var(--text-secondary)',
                  padding: '6px 10px', background: 'var(--bg-hover)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  marginBottom: 4,
                }}>{f}</div>
              ))}
            </div>
          )}

          {tool.requirements && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 6, letterSpacing: '0.1em' }}>
                REQUIREMENTS
              </div>
              <div style={{
                ...MONO, fontSize: 12, color: 'var(--text-secondary)',
                padding: '8px 10px', background: 'var(--bg-hover)',
                border: '1px solid var(--border)', borderRadius: 6,
              }}>{tool.requirements}</div>
            </div>
          )}

          {(tool.status === 'approved' || tool.status === 'pending') && (
            <ToolEnvVarsEditor toolId={tool.tool_id} />
          )}

          {tool.parameters.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 8, letterSpacing: '0.1em' }}>
                PARAMETERS
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tool.parameters.map(p => (
                  <span key={p.name} style={{
                    ...MONO, fontSize: 11, padding: '4px 9px',
                    background: 'var(--btn-accent-bg)', color: 'var(--btn-accent-text)',
                    border: '1px solid var(--btn-accent-border)', borderRadius: 6,
                  }}>
                    {p.name}: <span style={{ color: 'var(--text-secondary)' }}>{p.type}</span>
                    {tool.required.includes(p.name) && <span style={{ color: 'var(--btn-accent-text)' }}> *</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {tool.status === 'rejected' && tool.rejection_reason && (
            <div style={{
              ...SANS, fontSize: 12, color: 'var(--text-secondary)',
              padding: '8px 10px', background: 'var(--bg-hover)',
              border: '1px solid var(--border)', borderRadius: 6,
            }}>
              Rejected: {tool.rejection_reason}
            </div>
          )}

          <div style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 10 }}>
            Uploaded {fmt(tool.created_at)}
            {tool.updated_at !== tool.created_at && ` · Updated ${fmt(tool.updated_at)}`}
          </div>
        </div>
      )}
    </div>
  )
}

function Btn({ children, onClick, variant = 'neutral', disabled, iconOnly }: {
  children: React.ReactNode
  onClick: React.MouseEventHandler
  variant?: 'neutral' | 'accent' | 'success' | 'danger' | 'approve'
  disabled?: boolean
  iconOnly?: boolean
}) {
  const styles = {
    neutral: { bg: 'var(--btn-neutral-bg)', border: 'var(--btn-neutral-border)', color: 'var(--btn-neutral-text)' },
    accent:  { bg: 'var(--btn-accent-bg)', border: 'var(--btn-accent-border)', color: 'var(--btn-accent-text)' },
    success: { bg: 'var(--btn-success-bg)', border: 'var(--btn-success-border)', color: 'var(--btn-success-text)' },
    danger:  { bg: 'var(--btn-danger-bg)', border: 'var(--btn-danger-border)', color: 'var(--btn-danger-text)' },
    approve: { bg: 'var(--accent-soft)', border: 'var(--blue-border)', color: 'var(--accent)' },
  }[variant]

  return (
    <button
      className={variant === 'approve' ? 'tools-approve-btn' : undefined}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...SANS, fontSize: 12,
        padding: iconOnly ? '6px 8px' : '6px 12px',
        minWidth: iconOnly ? 32 : undefined,
        minHeight: 32,
        background: disabled ? 'var(--bg-hover)' : styles.bg,
        border: `1px solid ${disabled ? 'var(--border)' : styles.border}`,
        color: disabled ? 'var(--text-tertiary)' : styles.color,
        borderRadius: 999,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: variant === 'approve' ? 600 : 500,
        boxShadow: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        lineHeight: 1,
        opacity: disabled ? 0.55 : 1,
        transition: variant === 'approve' ? 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease' : undefined,
      }}
    >{children}</button>
  )
}
