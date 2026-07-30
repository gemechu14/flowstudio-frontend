import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getCatalog, getSubmissions, enableTool, disableTool,
  approveSubmission, rejectSubmission, removeFromCatalog,
  CommunityToolCard, CATEGORIES,
} from '../api/communityTools'
import { updateTool, testTool, TestResult } from '../api/tools'
import { ToolEnvVarsEditor } from '../components/tools/ToolEnvVarsEditor'

const MONO = { fontFamily: 'monospace' }

const CATEGORY_COLORS: Record<string, string> = {
  messaging: '#3B82F6',
  productivity: '#10B981',
  data: '#F59E0B',
  ai: '#8B5CF6',
  crm: '#EF4444',
  utilities: '#6B7280',
  other: '#6B7280',
}

function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] || '#6B7280'
  return (
    <span style={{
      ...MONO, fontSize: 10, padding: '2px 7px', borderRadius: 4,
      background: `${color}22`, color, border: `1px solid ${color}44`,
      letterSpacing: '0.05em', textTransform: 'uppercase',
    }}>
      {category}
    </span>
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
      <div onClick={e => e.stopPropagation()} style={{
        width: 460, height: '100%', background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        boxShadow: '-12px 0 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ ...MONO, fontSize: 13, fontWeight: 700, color: '#fff' }}>{tool.name}</div>
            <div style={{ ...MONO, fontSize: 10, color: '#ffffff99', marginTop: 2 }}>Test run</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>×</button>
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
                      width: '100%', ...MONO, fontSize: 12, padding: '7px 10px',
                      background: 'var(--bg-page)', color: 'var(--text-body)',
                      border: '1px solid var(--border)', borderRadius: 6, boxSizing: 'border-box',
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
          <button onClick={run} disabled={running} style={{
            width: '100%', padding: '9px', background: running ? '#10B98144' : '#10B981',
            color: '#fff', border: 'none', borderRadius: 7, cursor: running ? 'wait' : 'pointer',
            fontWeight: 700, fontSize: 13, ...MONO,
          }}>{running ? '⟳ Running…' : '▶ Run'}</button>
          {result && (
            <div style={{
              marginTop: 16, padding: 14, borderRadius: 8,
              background: result.success ? '#10B98110' : '#EF444410',
              border: `1px solid ${result.success ? '#10B98130' : '#EF444430'}`,
            }}>
              <div style={{ ...MONO, fontSize: 10, color: result.success ? '#10B981' : '#EF4444', marginBottom: 6 }}>
                {result.success ? '✓ Success' : '✗ Error'} · {result.elapsed_seconds.toFixed(2)}s
              </div>
              <pre style={{ ...MONO, fontSize: 11, color: 'var(--text-body)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
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

  return (
    <>
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, marginBottom: 10, overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ ...MONO, fontSize: 13, fontWeight: 700, color: 'var(--text-heading)' }}>
              {tool.display_name || tool.name}
            </span>
            <span style={{ ...MONO, fontSize: 11, color: 'var(--text-muted)' }}>{tool.name}</span>
            <CategoryBadge category={tool.category || 'other'} />
            {!isSubmission && (
              <span style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)' }}>
                {tool.enabled_count} workspace{tool.enabled_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-body)', lineHeight: 1.5 }}>
            {tool.description || 'No description.'}
          </div>
          {tool.requirements && (
            <div style={{ ...MONO, fontSize: 10, color: '#7C3AED', marginTop: 4 }}>
              requires: {tool.requirements}
            </div>
          )}
          {tool.submission_note && (
            <div style={{
              marginTop: 6, ...MONO, fontSize: 11, color: 'var(--text-muted)',
              padding: '4px 8px', background: '#ffffff08', borderRadius: 4,
              border: '1px solid var(--border)',
            }}>
              Note: {tool.submission_note}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          {/* Super admin actions */}
          {isSuperAdmin && isSubmission && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleApprove} disabled={loading} style={{
                background: '#10B981', border: 'none', color: '#fff',
                borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
                ...MONO, fontSize: 11, fontWeight: 700,
              }}>Approve</button>
              <button onClick={() => setShowReject(v => !v)} disabled={loading} style={{
                background: '#EF444420', border: '1px solid #EF444440', color: '#EF4444',
                borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
                ...MONO, fontSize: 11, fontWeight: 700,
              }}>Reject</button>
            </div>
          )}
          {/* Enable/Disable — all users including super admin */}
          {!isSubmission && (
            tool.is_enabled ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => setExpanded(v => !v)} style={{
                  background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
                  borderRadius: 6, padding: '4px 10px', cursor: 'pointer', ...MONO, fontSize: 10,
                }}>
                  {expanded ? 'Hide config' : 'Configure'}
                </button>
                <button onClick={handleDisable} disabled={loading} style={{
                  background: '#EF444420', border: '1px solid #EF444440', color: '#EF4444',
                  borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
                  ...MONO, fontSize: 11, fontWeight: 700,
                }}>
                  {loading ? '...' : 'Disable'}
                </button>
              </div>
            ) : (
              <button onClick={handleEnable} disabled={loading} style={{
                background: '#10B981', border: 'none', color: '#fff',
                borderRadius: 6, padding: '5px 14px', cursor: 'pointer',
                ...MONO, fontSize: 11, fontWeight: 700,
              }}>
                {loading ? '...' : 'Enable'}
              </button>
            )
          )}

          {/* Test — available for enabled tools (all users) or any catalog tool for super admin */}
          {!isSubmission && (tool.is_enabled || isSuperAdmin) && (
            <button onClick={() => setShowTest(true)} style={{
              background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
              borderRadius: 6, padding: '4px 10px', cursor: 'pointer', ...MONO, fontSize: 10,
            }}>▶ Test</button>
          )}

          {/* Edit + Remove — super admin only */}
          {isSuperAdmin && !isSubmission && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setShowEdit(v => !v)} disabled={loading} style={{
                background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
                borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                ...MONO, fontSize: 10,
              }}>{showEdit ? 'Cancel' : 'Edit'}</button>
              <button onClick={handleRemove} disabled={loading} style={{
                background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
                borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                ...MONO, fontSize: 10,
              }}>Remove</button>
            </div>
          )}
        </div>
      </div>

      {/* Reject reason input */}
      {showReject && (
        <div style={{ padding: '0 18px 14px', display: 'flex', gap: 8 }}>
          <input
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            style={{
              flex: 1, ...MONO, fontSize: 11, padding: '6px 10px',
              background: 'var(--bg-page)', color: 'var(--text-body)',
              border: '1px solid var(--border)', borderRadius: 6, outline: 'none',
            }}
          />
          <button onClick={handleReject} disabled={loading || !rejectReason.trim()} style={{
            background: '#EF4444', border: 'none', color: '#fff',
            borderRadius: 6, padding: '6px 14px', cursor: 'pointer',
            ...MONO, fontSize: 11, fontWeight: 700,
          }}>Send</button>
        </div>
      )}

      {/* Edit form — super admin only */}
      {showEdit && (
        <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ height: 10 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".py"
              onChange={e => setEditFile(e.target.files?.[0] ?? null)}
              style={{ ...MONO, fontSize: 11, color: 'var(--text-body)' }}
            />
            <input
              value={editRequirements}
              onChange={e => setEditRequirements(e.target.value)}
              placeholder="Requirements (e.g. requests==2.31.0)"
              style={{
                ...MONO, fontSize: 11, padding: '6px 10px',
                background: 'var(--bg-page)', color: 'var(--text-body)',
                border: '1px solid var(--border)', borderRadius: 6, outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleEdit}
                disabled={loading || !editFile}
                style={{
                  background: '#1D5FFA', border: 'none', color: '#fff',
                  borderRadius: 6, padding: '6px 16px', cursor: editFile ? 'pointer' : 'default',
                  opacity: editFile ? 1 : 0.5,
                  ...MONO, fontSize: 11, fontWeight: 700,
                }}
              >{loading ? '...' : 'Upload new version'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Env vars editor for enabled tools */}
      {expanded && tool.is_enabled && (
        <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ height: 10 }} />
          <ToolEnvVarsEditor toolId={tool.tool_id} />
        </div>
      )}

      {error && (
        <div style={{ padding: '0 18px 10px', ...MONO, fontSize: 11, color: '#EF4444' }}>{error}</div>
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header — matches Tools page style */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 32px 20px', borderBottom: '1px solid var(--border)',
        flexShrink: 0, background: 'var(--bg-card)',
      }}>
        <div>
          <div style={{ ...MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#1D5FFA', marginBottom: 4 }}>
            TOOL LIBRARY
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
            Community Tools
          </h2>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
          {(['catalog', ...(isSuperAdmin ? ['submissions'] : [])] as const).map(t => (
            <button key={t} onClick={() => setTab(t as any)} style={{
              background: 'none', border: 'none', borderBottom: tab === t ? '2px solid #7C3AED' : '2px solid transparent',
              color: tab === t ? '#7C3AED' : 'var(--text-muted)', cursor: 'pointer',
              padding: '8px 14px', ...MONO, fontSize: 12, fontWeight: tab === t ? 700 : 400,
              marginBottom: -1,
            }}>
              {t === 'catalog' ? `Catalog (${catalog.length})` : `Submissions (${submissions.length})`}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tools..."
            style={{
              ...MONO, fontSize: 12, flex: 1, minWidth: 180,
              background: 'var(--bg-page)', color: 'var(--text-body)',
              border: '1px solid var(--border)', borderRadius: 6,
              padding: '6px 10px', outline: 'none',
            }}
          />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={{
              ...MONO, fontSize: 12,
              background: 'var(--bg-page)', color: 'var(--text-body)',
              border: '1px solid var(--border)', borderRadius: 6,
              padding: '6px 10px', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="all">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ ...MONO, fontSize: 12, color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>
            Loading...
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ ...MONO, fontSize: 12, color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>
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
