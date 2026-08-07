import { useState, useRef } from 'react'
import {
  enableTool, disableTool,
  approveSubmission, rejectSubmission, removeFromCatalog,
  type CommunityToolCard,
} from '../api/communityTools.api'
import { updateTool } from '../../tools/api/tools.api'
import { ToolEnvVarsEditor } from '../../tools/components/ToolEnvVarsEditor'
import { CommunityChip } from './CommunityChip'
import { CommunityActionBtn } from './CommunityActionBtn'
import { CommunityTestPanel } from './CommunityTestPanel'
import { MONO, SANS } from '../lib/communityToolsUi'

export function CommunityToolCardItem({
  tool, isSuperAdmin, onAction,
}: {
  tool: CommunityToolCard
  isSuperAdmin: boolean
  onAction: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showTest, setShowTest] = useState(false)
  const [editFile, setEditFile] = useState<File | null>(null)
  const [editRequirements, setEditRequirements] = useState(tool.requirements || '')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleEnable() {
    setLoading(true); setError('')
    try {
      await enableTool(tool.tool_id)
      onAction()
    } catch { setError('Failed to enable tool') }
    finally { setLoading(false) }
  }

  async function handleDisable() {
    setLoading(true); setError('')
    try {
      await disableTool(tool.tool_id)
      onAction()
    } catch { setError('Failed to disable tool') }
    finally { setLoading(false) }
  }

  async function handleApprove() {
    setLoading(true); setError('')
    try {
      await approveSubmission(tool.tool_id, tool.category || 'utilities')
      onAction()
    } catch { setError('Failed to approve') }
    finally { setLoading(false) }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return
    setLoading(true); setError('')
    try {
      await rejectSubmission(tool.tool_id, rejectReason)
      setShowReject(false)
      onAction()
    } catch { setError('Failed to reject') }
    finally { setLoading(false) }
  }

  async function handleRemove() {
    setLoading(true); setError('')
    try {
      await removeFromCatalog(tool.tool_id)
      onAction()
    } catch { setError('Failed to remove') }
    finally { setLoading(false) }
  }

  async function handleEdit() {
    if (!editFile) return
    setLoading(true); setError('')
    try {
      await updateTool(tool.tool_id, editFile, editRequirements)
      setShowEdit(false)
      setEditFile(null)
      onAction()
    } catch (e: unknown) {
      const detail = (e as { detail?: unknown })?.detail
      if (detail && typeof detail === 'object' && 'errors' in detail) {
        setError((detail as { errors: string[] }).errors.join(' '))
      } else {
        setError(typeof detail === 'string' ? detail : 'Failed to update tool')
      }
    }
    finally { setLoading(false) }
  }

  const isSubmission = tool.status === 'community_pending'
  const accent = tool.is_enabled ? 'var(--accent)' : isSubmission ? 'var(--text-tertiary)' : 'var(--border-strong)'

  return (
    <>
    <div
      className="ct-card"
      style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderLeft: `3px solid ${accent}`,
        borderRadius: 10, marginBottom: 10, overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-strong)'
        e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--card-border)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div
        className="ct-card-main"
        style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div className="ct-card-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <span className="ct-card-title" style={{ ...MONO, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
              {tool.display_name || tool.name}
            </span>
            {tool.display_name && tool.display_name !== tool.name && (
              <span style={{ ...MONO, fontSize: 11, color: 'var(--text-tertiary)' }}>{tool.name}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <CommunityChip label={tool.category || 'other'} tone="accent" />
            {!isSubmission && tool.is_enabled && <CommunityChip label="Enabled" tone="accent" />}
            {!isSubmission && (
              <CommunityChip
                label={`${tool.enabled_count} workspace${tool.enabled_count !== 1 ? 's' : ''}`}
                tone="muted"
              />
            )}
            {isSubmission && <CommunityChip label="Pending" tone="muted" />}
          </div>
        </div>

        <div className="ct-card-actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {isSuperAdmin && isSubmission && (
            <>
              <CommunityActionBtn onClick={handleApprove} disabled={loading} variant="primary">
                {loading ? '…' : 'Approve'}
              </CommunityActionBtn>
              <CommunityActionBtn onClick={() => setShowReject(v => !v)} disabled={loading} variant="danger">
                Reject
              </CommunityActionBtn>
            </>
          )}
          {!isSubmission && (
            tool.is_enabled ? (
              <>
                <CommunityActionBtn onClick={() => setExpanded(v => !v)} variant="accent">
                  {expanded ? 'Hide config' : 'Configure'}
                </CommunityActionBtn>
                <CommunityActionBtn onClick={handleDisable} disabled={loading} variant="danger">
                  {loading ? '…' : 'Disable'}
                </CommunityActionBtn>
              </>
            ) : (
              <CommunityActionBtn onClick={handleEnable} disabled={loading} variant="primary">
                {loading ? '…' : 'Enable'}
              </CommunityActionBtn>
            )
          )}

          {!isSubmission && (tool.is_enabled || isSuperAdmin) && (
            <CommunityActionBtn onClick={() => setShowTest(true)} variant="accent">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              Test
            </CommunityActionBtn>
          )}

          {isSuperAdmin && !isSubmission && (
            <>
              <CommunityActionBtn onClick={() => setShowEdit(v => !v)} disabled={loading} variant="neutral">
                {showEdit ? 'Cancel' : 'Edit'}
              </CommunityActionBtn>
              <CommunityActionBtn onClick={handleRemove} disabled={loading} variant="danger">
                Remove
              </CommunityActionBtn>
            </>
          )}
        </div>

        <div className="ct-card-desc" style={{ ...SANS, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          {tool.description || 'No description.'}
        </div>

        {tool.requirements && (
          <div style={{
            ...MONO, fontSize: 11, color: 'var(--text-tertiary)',
            display: 'inline-block', padding: '2px 8px', alignSelf: 'flex-start',
            background: 'var(--bg-hover)', borderRadius: 4, border: '1px solid var(--border)',
          }}>
            requires: {tool.requirements}
          </div>
        )}
        {tool.submission_note && (
          <div className="ct-card-note" style={{
            ...SANS, fontSize: 12, color: 'var(--text-tertiary)',
            padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 8,
            border: '1px solid var(--border)', lineHeight: 1.5,
          }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Note:</strong> {tool.submission_note}
          </div>
        )}
      </div>

      {showReject && (
        <div style={{ padding: '0 18px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            style={{
              flex: 1, minWidth: 160, ...MONO, fontSize: 12, padding: '8px 12px',
              backgroundColor: 'var(--bg-page)', color: 'var(--text-heading)',
              border: '1px solid var(--border)', borderRadius: 8, outline: 'none',
            }}
          />
          <CommunityActionBtn onClick={handleReject} disabled={loading || !rejectReason.trim()} variant="danger">
            Send
          </CommunityActionBtn>
        </div>
      )}

      {showEdit && (
        <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ height: 10 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".py"
              onChange={e => setEditFile(e.target.files?.[0] ?? null)}
              style={{ ...MONO, fontSize: 11, color: 'var(--text-secondary)' }}
            />
            <input
              value={editRequirements}
              onChange={e => setEditRequirements(e.target.value)}
              placeholder="Requirements (e.g. requests==2.31.0)"
              style={{
                ...MONO, fontSize: 12, padding: '8px 12px',
                backgroundColor: 'var(--bg-page)', color: 'var(--text-heading)',
                border: '1px solid var(--border)', borderRadius: 8, outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <CommunityActionBtn onClick={handleEdit} disabled={loading || !editFile} variant="primary">
                {loading ? '…' : 'Upload new version'}
              </CommunityActionBtn>
            </div>
          </div>
        </div>
      )}

      {expanded && tool.is_enabled && (
        <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ height: 10 }} />
          <ToolEnvVarsEditor toolId={tool.tool_id} />
        </div>
      )}

      {error && (
        <div style={{ padding: '0 18px 10px', ...MONO, fontSize: 11, color: 'var(--invalid)' }}>{error}</div>
      )}
    </div>
    {showTest && <CommunityTestPanel tool={tool} onClose={() => setShowTest(false)} />}
    </>
  )
}
