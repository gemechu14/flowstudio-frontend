import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ToolRecord,
  type ToolStatus,
  listTools,
  approveTool,
  rejectTool,
  deleteTool,
  getToolSource,
} from '../api/tools.api'
import ConfirmModal from '../../../shared/components/ui/ConfirmModal'
import { invalidateDashboardStats } from '../../../shared/api/queryClient'
import { queryKeys } from '../../../shared/api/queryKeys'
import { ToolRow } from '../components/ToolRow'
import { ToolEditorPanel } from '../components/ToolEditorPanel'
import { ToolUploadPanel } from '../components/ToolUploadPanel'
import { ToolSourcePanel } from '../components/ToolSourcePanel'
import { ToolTestPanel } from '../components/ToolTestPanel'
import { RejectToolModal } from '../components/RejectToolModal'
import { ToolsListSkeleton } from '../components/ToolsListSkeleton'
import { ToolsEmptyState } from '../components/ToolsEmptyState'
import { MONO, SANS, TAB_LABELS, type EditMode } from '../lib/toolsUi'

export default function ToolsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<ToolStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState<'upload' | 'editor' | 'edit' | false>(false)
  const [editTarget, setEditTarget] = useState<EditMode | null>(null)
  const [viewSourceId, setViewSourceId] = useState<string | null>(null)
  const [testTool_, setTestTool] = useState<ToolRecord | null>(null)
  const [rejectTarget, setRejectTarget] = useState<ToolRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ToolRecord | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [listCollapsed, setListCollapsed] = useState(false)

  const { data: tools = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.tools,
    queryFn: () => listTools().catch(() => [] as ToolRecord[]),
  })

  const reload = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tools })
    invalidateDashboardStats()
  }

  useEffect(() => {
    if (!showAdd) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAdd(false)
        setEditTarget(null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showAdd])

  const closeAddPanel = () => {
    setShowAdd(false)
    setEditTarget(null)
    setListCollapsed(false)
  }

  const panelMode = showAdd === 'edit' ? 'editor' : showAdd || false
  const panelTitle =
    showAdd === 'upload' ? 'Upload Custom Tool'
    : showAdd === 'edit' ? 'Edit Tool'
    : showAdd === 'editor' ? 'Write Code'
    : ''

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

  const handleEdit = async (tool: ToolRecord) => {
    const source = await getToolSource(tool.tool_id)
    setEditTarget({ tool_id: tool.tool_id, display_name: tool.display_name || `${tool.name}.py`, initial_code: source, initial_requirements: tool.requirements })
    setShowAdd('edit')
    setListCollapsed(false)
  }

  const handleDelete = async (tool: ToolRecord) => {
    setDeleteTarget(tool)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError('')
    try {
      await deleteTool(deleteTarget.tool_id)
      setDeleteTarget(null)
      reload()
    } catch (e: any) {
      const detail = e?.detail || e?.message || 'Failed to delete tool.'
      setDeleteError(typeof detail === 'string' ? detail : JSON.stringify(detail))
    }
  }

  const counts: Record<string, number> = {
    all: tools.length,
    pending: tools.filter(t => t.status === 'pending').length,
    approved: tools.filter(t => t.status === 'approved').length,
    rejected: tools.filter(t => t.status === 'rejected').length,
  }

  const byTab = activeTab === 'all' ? tools : tools.filter(t => t.status === activeTab)
  const filtered = search.trim()
    ? byTab.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : byTab

  return (
    <div className="tools-page" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-surface)' }}>

      {/* ── Top header ── */}
      <div className="tools-header" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', borderBottom: '1px solid var(--border)',
        flexShrink: 0, background: 'var(--bg-surface)', gap: 12,
      }}>
        <div className="tools-header-copy" style={{ minWidth: 0 }}>
          <div style={{ ...MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--accent)', marginBottom: 4 }}>
            CONFIGURATION
          </div>
          <h2 style={{ ...SANS, fontSize: 16, fontWeight: 500, color: 'var(--text-heading)', margin: 0 }}>
            Tool Management
          </h2>
        </div>
        <div className="tools-header-actions" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            className="tools-action-btn"
            onClick={() => { setEditTarget(null); setShowAdd(showAdd === 'editor' ? false : 'editor') }}
            style={{
              ...SANS, fontSize: 12, padding: '8px 14px',
              background: showAdd === 'editor' ? 'var(--accent-soft)' : 'var(--bg-hover)',
              color: showAdd === 'editor' ? 'var(--accent-text)' : 'var(--text-secondary)',
              border: `1px solid ${showAdd === 'editor' ? 'var(--blue-border)' : 'var(--border)'}`,
              borderRadius: 10, cursor: 'pointer', fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 7,
            }}
          >
            {showAdd === 'editor' ? '✕ Cancel' : (
              <>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{'</>'}</span>
                Write Code
              </>
            )}
          </button>
          <button
            className="tools-action-btn tools-action-btn--primary"
            onClick={() => { setEditTarget(null); setShowAdd(showAdd === 'upload' ? false : 'upload') }}
            style={{
              ...SANS, fontSize: 12, padding: '8px 14px',
              background: showAdd === 'upload' ? 'var(--bg-hover)' : 'var(--accent-soft)',
              color: showAdd === 'upload' ? 'var(--text-secondary)' : 'var(--accent-text)',
              border: `1px solid ${showAdd === 'upload' ? 'var(--border)' : 'var(--blue-border)'}`,
              borderRadius: 10, cursor: 'pointer', fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 7,
              boxShadow: 'none',
            }}
          >
            {showAdd === 'upload' ? '✕ Cancel' : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload File
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="tools-split" style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', position: 'relative' }}>

        {/* Left: tabs + tool list */}
        <div
          className={`tools-list-pane${listCollapsed ? ' is-collapsed' : ''}`}
          style={{
          flex: listCollapsed ? '0 0 0' : '0 0 54%',
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid var(--border)', overflow: 'hidden',
          background: 'var(--bg-surface)',
          transition: 'flex 0.2s ease',
        }}>
          {/* Tabs */}
          <div className="tools-tabs" style={{
            display: 'flex', gap: 0, paddingLeft: 20,
            borderBottom: '1px solid var(--border)', flexShrink: 0,
            background: 'var(--bg-surface)', overflowX: 'auto',
          }}>
            {TAB_LABELS.map(tab => {
              const active = activeTab === tab.key
              const cnt = counts[tab.key] ?? 0
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    ...SANS, fontSize: 12, padding: '11px 14px',
                    background: 'none', border: 'none',
                    borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontWeight: active ? 600 : 500,
                    marginBottom: -1, whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                  {cnt > 0 && (
                    <span style={{
                      marginLeft: 6, fontSize: 10, padding: '1px 6px',
                      background: active ? 'var(--accent-soft)' : 'var(--bg-hover)',
                      color: active ? 'var(--accent)' : 'var(--text-tertiary)',
                      borderRadius: 8, fontWeight: 600,
                    }}>{cnt}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="tools-search" style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-surface)' }}>
            <div style={{ position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tools by name or description…"
                style={{
                  width: '100%', fontSize: 13, padding: '8px 10px 8px 32px',
                  background: 'var(--card-bg)', color: 'var(--text-primary)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  boxSizing: 'border-box', outline: 'none', fontFamily: 'var(--font-sans)',
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0,
                }}>×</button>
              )}
            </div>
          </div>

          {/* Tool list (scrollable) */}
          <div className="tools-list-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {loading ? (
              <ToolsListSkeleton count={5} />
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                {search.trim()
                  ? `No tools match "${search}"`
                  : activeTab === 'pending' ? 'No tools pending review.'
                  : activeTab === 'approved' ? 'No approved tools yet.'
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
                  onEdit={() => handleEdit(tool)}
                />
              ))
            )}

            {!showAdd && (
              <div className="tools-empty-mobile">
                <ToolsEmptyState
                  compact
                  onEditor={() => setShowAdd('editor')}
                  onUpload={() => setShowAdd('upload')}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: editor / upload / empty — overlay on mobile/tablet */}
        <div
          className={`tools-side-pane${showAdd ? ' is-open' : ''}${panelMode === 'upload' ? ' is-upload' : ''}${panelMode === 'editor' ? ' is-editor' : ''}`}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-surface)', position: 'relative' }}
        >
          {showAdd && (
            <button
              type="button"
              className="tools-side-backdrop"
              aria-label="Close panel"
              onClick={closeAddPanel}
            />
          )}

          <div className="tools-side-sheet">
            {showAdd && (
              <div className="tools-side-sheet-header">
                <h3>{panelTitle}</h3>
                <button type="button" className="tools-side-close" onClick={closeAddPanel} aria-label="Close">
                  ×
                </button>
              </div>
            )}

            <div className="tools-side-sheet-body">
              <button
                className="tools-collapse-btn"
                onClick={() => setListCollapsed(c => !c)}
                title={listCollapsed ? 'Show tool list' : 'Hide tool list'}
                style={{
                  position: 'absolute', top: '50%', left: 0,
                  transform: 'translateY(-50%)',
                  zIndex: 10, width: 18, height: 48,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderLeft: 'none',
                  borderRadius: '0 6px 6px 0',
                  cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)', fontSize: 10,
                  boxShadow: '2px 0 6px rgba(0,0,0,0.06)',
                }}
              >{listCollapsed ? '›' : '‹'}</button>
              {showAdd === 'editor' && (
                <ToolEditorPanel onUploaded={_t => {
                  reload(); setShowAdd(false); setActiveTab('pending'); setListCollapsed(false)
                }} />
              )}
              {showAdd === 'edit' && editTarget && (
                <ToolEditorPanel
                  editMode={editTarget}
                  onUploaded={_t => {
                    reload(); setShowAdd(false); setEditTarget(null); setActiveTab('pending'); setListCollapsed(false)
                  }}
                  onCancel={() => { setShowAdd(false); setEditTarget(null) }}
                />
              )}
              {showAdd === 'upload' && (
                <div className="tools-upload-wrap" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                  <ToolUploadPanel onUploaded={_t => {
                    reload(); setShowAdd(false); setActiveTab('pending')
                  }} />
                </div>
              )}
              {!showAdd && (
                <div className="tools-empty-desktop">
                  <ToolsEmptyState
                    onEditor={() => setShowAdd('editor')}
                    onUpload={() => setShowAdd('upload')}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals / panels */}
      {viewSourceId && (
        <ToolSourcePanel toolId={viewSourceId} onClose={() => setViewSourceId(null)} />
      )}
      {testTool_ && (
        <ToolTestPanel tool={testTool_} onClose={() => setTestTool(null)} />
      )}
      {rejectTarget && (
        <RejectToolModal
          tool={rejectTarget}
          onConfirm={handleReject}
          onClose={() => setRejectTarget(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          message={`Delete tool "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete Tool"
          error={deleteError}
          onConfirm={confirmDelete}
          onClose={() => { setDeleteTarget(null); setDeleteError('') }}
        />
      )}
    </div>
  )
}
