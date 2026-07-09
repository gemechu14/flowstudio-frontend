import { useState, useEffect, useCallback } from 'react'
import {
  ToolRecord, ToolStatus,
  listTools, uploadTool, approveTool, rejectTool, deleteTool,
  testTool, getToolSource,
} from '../api/tools'

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
  useEffect(() => {
    getToolSource(toolId).then(s => { setSource(s); setLoading(false) }).catch(() => setLoading(false))
  }, [toolId])
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
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 18, lineHeight: 1,
          }}>×</button>
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
      borderRadius: 10, padding: 20, marginBottom: 24,
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

  const handleApprove = async () => {
    setApproving(true)
    try { await onApprove() } finally { setApproving(false) }
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
          {tool.status === 'approved' && (
            <Btn onClick={e => { e.stopPropagation(); onTest() }} color="#1D5FFA">
              ▶ Test
            </Btn>
          )}
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

// ─── main page ───────────────────────────────────────────────────────────────

export default function Tools() {
  const [tools, setTools] = useState<ToolRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ToolStatus | 'all'>('all')
  const [showUpload, setShowUpload] = useState(false)
  const [viewSourceId, setViewSourceId] = useState<string | null>(null)
  const [testTool_, setTestTool] = useState<ToolRecord | null>(null)
  const [rejectTarget, setRejectTarget] = useState<ToolRecord | null>(null)

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
    if (!confirm(`Delete tool "${tool.name}"?`)) return
    await deleteTool(tool.tool_id)
    reload()
  }

  const counts: Record<string, number> = {
    all: tools.length,
    pending: tools.filter(t => t.status === 'pending').length,
    approved: tools.filter(t => t.status === 'approved').length,
    rejected: tools.filter(t => t.status === 'rejected').length,
  }

  const filtered = activeTab === 'all' ? tools : tools.filter(t => t.status === activeTab)

  return (
    <div style={{ padding: '36px 48px', width: '100%', maxWidth: 980 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ ...MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: '#1D5FFA', marginBottom: 6 }}>
            CONFIGURATION
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
            Tool Management
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Upload custom tools, review risk flags, approve for agent use.
          </p>
        </div>
        <button
          onClick={() => setShowUpload(v => !v)}
          style={{
            ...MONO, fontSize: 12, padding: '8px 16px',
            background: showUpload ? '#1D5FFA33' : '#1D5FFA',
            color: '#fff', border: 'none', borderRadius: 7,
            cursor: 'pointer', fontWeight: 700,
          }}
        >
          {showUpload ? '✕ Cancel' : '+ Upload Tool'}
        </button>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <UploadPanel onUploaded={_t => {
          reload()
          setShowUpload(false)
          setActiveTab('pending')
        }} />
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TAB_LABELS.map(tab => {
          const active = activeTab === tab.key
          const cnt = counts[tab.key] ?? 0
          const isAlert = tab.key === 'pending' && cnt > 0
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...MONO, fontSize: 12, padding: '8px 16px',
                background: 'none', border: 'none',
                borderBottom: `2px solid ${active ? '#1D5FFA' : 'transparent'}`,
                color: active ? '#1D5FFA' : isAlert ? '#F59E0B' : 'var(--text-muted)',
                cursor: 'pointer', fontWeight: active ? 700 : 500,
                marginBottom: -1,
              }}
            >
              {tab.label}
              {cnt > 0 && (
                <span style={{
                  marginLeft: 6, fontSize: 10, padding: '1px 5px',
                  background: isAlert ? '#F59E0B33' : '#1D5FFA22',
                  color: isAlert ? '#F59E0B' : '#1D5FFA',
                  borderRadius: 10, fontWeight: 700,
                }}>{cnt}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tool list */}
      {loading ? (
        <div style={{ ...MONO, fontSize: 12, color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>
          Loading tools…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '56px 0',
          color: 'var(--text-muted)', fontSize: 13,
        }}>
          {activeTab === 'pending'
            ? 'No tools pending review.'
            : activeTab === 'approved'
              ? 'No approved tools yet. Upload and approve a tool to get started.'
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
    </div>
  )
}
