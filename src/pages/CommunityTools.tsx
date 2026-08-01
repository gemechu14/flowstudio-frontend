import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getCatalog, getSubmissions, enableTool, disableTool,
  approveSubmission, rejectSubmission, removeFromCatalog,
  CommunityToolCard, CATEGORIES,
} from '../api/communityTools'
import { updateTool, testTool, TestResult } from '../api/tools'
import { ToolEnvVarsEditor } from '../components/tools/ToolEnvVarsEditor'

const MONO = { fontFamily: 'var(--font-mono)' }
const SANS = { fontFamily: 'var(--font-sans)' }

const FIELD: React.CSSProperties = {
  ...SANS,
  fontSize: 13,
  padding: '10px 14px',
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-heading)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  colorScheme: 'dark light',
}

const SELECT: React.CSSProperties = {
  ...FIELD,
  fontSize: 14,
  paddingRight: 32,
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  cursor: 'pointer',
  minWidth: 160,
  backgroundColor: 'var(--card-bg)',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8L9.5 4.5' stroke='%2371717A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
}

function focusField(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--accent)'
  e.target.style.boxShadow = '0 0 0 3px var(--accent-soft)'
}
function blurField(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--border)'
  e.target.style.boxShadow = 'none'
}

function Chip({
  label,
  tone = 'neutral',
}: {
  label: string
  tone?: 'neutral' | 'accent' | 'muted' | 'danger'
}) {
  const tones = {
    neutral: { color: 'var(--text-secondary)', bg: 'var(--bg-hover)', border: 'var(--border)' },
    accent:  { color: 'var(--accent)', bg: 'var(--accent-soft)', border: 'var(--blue-border)' },
    muted:   { color: 'var(--text-tertiary)', bg: 'var(--bg-hover)', border: 'var(--border)' },
    danger:  { color: 'var(--invalid)', bg: 'var(--invalid-dim)', border: 'rgba(239,68,68,0.28)' },
  }[tone]
  return (
    <span style={{
      ...MONO, fontSize: 10, padding: '2px 8px', borderRadius: 4,
      background: tones.bg, color: tones.color, border: `1px solid ${tones.border}`,
      fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap', textTransform: 'uppercase',
    }}>{label}</span>
  )
}

function ActionBtn({
  children,
  onClick,
  variant = 'neutral',
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  variant?: 'neutral' | 'accent' | 'primary' | 'danger'
  disabled?: boolean
}) {
  const styles = {
    neutral: { bg: 'var(--bg-hover)', border: 'var(--border)', color: 'var(--text-secondary)' },
    accent:  { bg: 'var(--bg-hover)', border: 'var(--border)', color: 'var(--text-secondary)' },
    primary: { bg: 'var(--accent-soft)', border: 'var(--blue-border)', color: 'var(--accent-text)' },
    danger:  { bg: 'var(--bg-hover)', border: 'var(--border)', color: 'var(--btn-danger-text)' },
  }[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...SANS, fontSize: 12,
        padding: '6px 12px',
        minHeight: 32,
        background: disabled ? 'var(--bg-hover)' : styles.bg,
        border: `1px solid ${disabled ? 'var(--border)' : styles.border}`,
        color: disabled ? 'var(--text-tertiary)' : styles.color,
        borderRadius: 999,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        lineHeight: 1,
        opacity: disabled ? 0.55 : 1,
      }}
    >{children}</button>
  )
}

function Bone({
  h, w, r = 6, delay = 0, style,
}: {
  h: number | string
  w: number | string
  r?: number
  delay?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      className="skeleton-bone"
      style={{
        height: h,
        width: w,
        borderRadius: r,
        ['--skel-delay' as string]: `${delay}s`,
        ...style,
      }}
    />
  )
}

function CommunityListSkeleton({ count = 5 }: { count?: number }) {
  const layouts = [
    { title: 180, badges: [72, 56], desc: '70%' },
    { title: 200, badges: [80, 48], desc: '58%' },
    { title: 160, badges: [64, 60], desc: '74%' },
    { title: 210, badges: [76, 52], desc: '62%' },
    { title: 170, badges: [68, 54], desc: '66%' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-busy="true" aria-label="Loading community tools">
      {Array.from({ length: count }).map((_, i) => {
        const layout = layouts[i % layouts.length]
        const base = i * 0.07
        return (
          <div
            key={i}
            style={{
              background: 'var(--skeleton-card)',
              border: '1px solid var(--skeleton-border)',
              borderLeft: '3px solid var(--skeleton-accent)',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Bone h={14} w={layout.title} delay={base} />
                  {layout.badges.map((bw, bi) => (
                    <Bone key={bi} h={18} w={bw} r={4} delay={base + 0.04 + bi * 0.03} />
                  ))}
                </div>
                <Bone
                  h={12}
                  w={layout.desc}
                  delay={base + 0.14}
                  style={{ marginTop: 10, maxWidth: 420 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <Bone h={32} w={72} r={999} delay={base + 0.1} />
                <Bone h={32} w={58} r={999} delay={base + 0.14} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CommunityTestPanel({ tool, onClose }: { tool: CommunityToolCard; onClose: () => void }) {
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
            background: 'var(--accent-soft)', color: 'var(--accent-text)',
            border: '1px solid var(--blue-border)', borderRadius: 999, cursor: running ? 'wait' : 'pointer',
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

function ToolCardItem({
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
            <Chip label={tool.category || 'other'} tone="accent" />
            {!isSubmission && tool.is_enabled && <Chip label="Enabled" tone="accent" />}
            {!isSubmission && (
              <Chip
                label={`${tool.enabled_count} workspace${tool.enabled_count !== 1 ? 's' : ''}`}
                tone="muted"
              />
            )}
            {isSubmission && <Chip label="Pending" tone="muted" />}
          </div>
        </div>

        <div className="ct-card-actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {isSuperAdmin && isSubmission && (
            <>
              <ActionBtn onClick={handleApprove} disabled={loading} variant="primary">
                {loading ? '…' : 'Approve'}
              </ActionBtn>
              <ActionBtn onClick={() => setShowReject(v => !v)} disabled={loading} variant="danger">
                Reject
              </ActionBtn>
            </>
          )}
          {!isSubmission && (
            tool.is_enabled ? (
              <>
                <ActionBtn onClick={() => setExpanded(v => !v)} variant="accent">
                  {expanded ? 'Hide config' : 'Configure'}
                </ActionBtn>
                <ActionBtn onClick={handleDisable} disabled={loading} variant="danger">
                  {loading ? '…' : 'Disable'}
                </ActionBtn>
              </>
            ) : (
              <ActionBtn onClick={handleEnable} disabled={loading} variant="primary">
                {loading ? '…' : 'Enable'}
              </ActionBtn>
            )
          )}

          {!isSubmission && (tool.is_enabled || isSuperAdmin) && (
            <ActionBtn onClick={() => setShowTest(true)} variant="accent">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              Test
            </ActionBtn>
          )}

          {isSuperAdmin && !isSubmission && (
            <>
              <ActionBtn onClick={() => setShowEdit(v => !v)} disabled={loading} variant="neutral">
                {showEdit ? 'Cancel' : 'Edit'}
              </ActionBtn>
              <ActionBtn onClick={handleRemove} disabled={loading} variant="danger">
                Remove
              </ActionBtn>
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
          <ActionBtn onClick={handleReject} disabled={loading || !rejectReason.trim()} variant="danger">
            Send
          </ActionBtn>
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
              <ActionBtn onClick={handleEdit} disabled={loading || !editFile} variant="primary">
                {loading ? '…' : 'Upload new version'}
              </ActionBtn>
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

export default function CommunityTools() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const [tab, setTab] = useState<'catalog' | 'submissions'>('catalog')
  const [catalog, setCatalog] = useState<CommunityToolCard[]>([])
  const [submissions, setSubmissions] = useState<CommunityToolCard[]>([])
  const [filterCategory, setFilterCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [cat, subs] = await Promise.all([
        getCatalog(),
        isSuperAdmin ? getSubmissions() : Promise.resolve([]),
      ])
      setCatalog(cat)
      setSubmissions(subs)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const displayed = (tab === 'catalog' ? catalog : submissions).filter(t => {
    const matchCat = filterCategory === 'all' || t.category === filterCategory
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div
      className="ct-page"
      style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-surface)', ...SANS,
    }}>
      <div
        className="ct-header"
        style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 28px 16px', borderBottom: '1px solid var(--border)',
        flexShrink: 0, background: 'var(--bg-surface)',
      }}>
        <div>
          <div style={{ ...MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--accent)', marginBottom: 6 }}>
            TOOL LIBRARY
          </div>
          <h2 style={{ ...SANS, fontSize: 20, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
            Community Tools
          </h2>
          <p style={{ ...SANS, fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>
            Browse and enable tools built by the community.
          </p>
        </div>
      </div>

      <div className="ct-body" style={{ flex: 1, overflowY: 'auto', padding: '16px 28px 32px' }}>
        <div
          className="ct-tabs"
          style={{
          display: 'flex', gap: 0, marginBottom: 16,
          borderBottom: '1px solid var(--border)', overflowX: 'auto',
        }}>
          {(['catalog', ...(isSuperAdmin ? ['submissions'] as const : [])] as const).map(t => {
            const active = tab === t
            const count = t === 'catalog' ? catalog.length : submissions.length
            return (
              <button
                key={t}
                onClick={() => setTab(t as 'catalog' | 'submissions')}
                style={{
                  ...SANS, fontSize: 12, padding: '11px 14px',
                  background: 'none', border: 'none',
                  borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontWeight: active ? 600 : 500,
                  marginBottom: -1, whiteSpace: 'nowrap',
                }}
              >
                {t === 'catalog' ? 'Catalog' : 'Submissions'}
                <span style={{
                  marginLeft: 6, fontSize: 10, padding: '1px 6px',
                  background: active ? 'var(--accent-soft)' : 'var(--bg-hover)',
                  color: active ? 'var(--accent)' : 'var(--text-tertiary)',
                  borderRadius: 8, fontWeight: 600,
                }}>{count}</span>
              </button>
            )
          })}
        </div>

        <div className="ct-filters" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="ct-search" style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tools by name or description…"
              style={{ ...FIELD, width: '100%', paddingLeft: 38, minHeight: 42 }}
              onFocus={focusField}
              onBlur={blurField}
            />
          </div>
          <select
            className="ct-category"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={{ ...SELECT, minHeight: 42 }}
            onFocus={focusField}
            onBlur={blurField}
          >
            <option value="all">ALL CATEGORIES</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
        </div>

        {loading ? (
          <CommunityListSkeleton count={5} />
        ) : displayed.length === 0 ? (
          <div style={{
            ...SANS, fontSize: 13, color: 'var(--text-secondary)',
            padding: '48px 0', textAlign: 'center',
          }}>
            {tab === 'catalog' ? 'No community tools yet.' : 'No pending submissions.'}
          </div>
        ) : (
          displayed.map(tool => (
            <ToolCardItem
              key={tool.tool_id}
              tool={tool}
              isSuperAdmin={isSuperAdmin}
              onAction={load}
            />
          ))
        )}
      </div>
    </div>
  )
}
