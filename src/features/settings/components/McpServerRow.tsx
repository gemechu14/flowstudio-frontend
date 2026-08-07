import { useState } from 'react'
import ConfirmModal from '../../../shared/components/ui/ConfirmModal'
import {
  deleteMcpServer, syncMcpServer, updateMcpServer,
  type McpServer,
} from '../api/mcpServers.api'
import { AuthPicker } from './AuthPicker'
import { McpToolsList } from './McpToolsList'
import { MONO, SANS, fmtDate } from '../lib/settingsUi'

export function McpServerRow({ server, onDeleted, onSynced }: {
  server: McpServer
  onDeleted: () => void
  onSynced: (updated: McpServer) => void
}) {
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [showTools, setShowTools] = useState(false)
  const [toolsKey, setToolsKey] = useState(0)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // ── edit state ──
  const [editing, setEditing] = useState(false)
  const [editUrl, setEditUrl] = useState(server.url)
  const [editHeaders, setEditHeaders] = useState<Record<string, string>>(server.headers ?? {})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const openEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditUrl(server.url)
    setEditHeaders(server.headers ?? {})
    setSaveError('')
    setEditing(true)
  }

  const handleSaveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setSaving(true); setSaveError('')
    try {
      const updated = await updateMcpServer(server.server_id, {
        url: editUrl.trim() || undefined,
        headers: editHeaders,
      })
      onSynced(updated)
      setEditing(false)
    } catch (err: any) {
      setSaveError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    ...MONO,
    fontSize: 12,
    padding: '8px 12px',
    backgroundColor: 'var(--bg-page)',
    color: 'var(--text-heading)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    boxSizing: 'border-box',
    outline: 'none',
    colorScheme: 'dark light',
  }

  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setSyncing(true); setSyncError('')
    try {
      await syncMcpServer(server.server_id)
      // Optimistically update last_synced_at
      onSynced({ ...server, last_synced_at: new Date().toISOString() })
      setToolsKey(k => k + 1)
      setShowTools(true)
    } catch (err: any) {
      setSyncError(err.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    setShowDeleteConfirm(false)
    try {
      await deleteMcpServer(server.server_id)
      onDeleted()
    } catch (err: any) {
      alert(err.message || 'Delete failed')
    }
  }

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 10,
    }}>
      {/* Main row */}
      <div
        className="settings-server-main"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          flexWrap: 'wrap',
        }}
        onClick={() => setShowTools(v => !v)}
      >
        {/* Status dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: server.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
        }} />

        {/* Name + URL */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            ...MONO, fontSize: 13, fontWeight: 700,
            color: 'var(--text-heading)', marginBottom: 2,
          }}>
            {server.name}
          </div>
          <div style={{
            ...MONO, fontSize: 11, color: 'var(--text-tertiary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {server.url}
          </div>
        </div>

        {/* Last synced */}
        <div className="settings-server-synced" style={{
          ...MONO, fontSize: 10, color: 'var(--text-tertiary)',
          flexShrink: 0, textAlign: 'right', minWidth: 120,
        }}>
          <div style={{ marginBottom: 1, letterSpacing: '0.05em' }}>LAST SYNCED</div>
          <div style={{ color: 'var(--text-tertiary)' }}>{fmtDate(server.last_synced_at)}</div>
        </div>

        <div className="settings-server-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Enabled toggle */}
        <button
          onClick={async (e) => {
            e.stopPropagation()
            try {
              const updated = await updateMcpServer(server.server_id, { enabled: !server.enabled })
              onSynced(updated)
            } catch { /* ignore */ }
          }}
          title={server.enabled ? 'Click to disable' : 'Click to enable'}
          style={{
            ...MONO, fontSize: 10, fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 12,
            background: server.enabled ? 'var(--accent-soft)' : 'var(--bg-hover)',
            color: server.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
            border: `1px solid ${server.enabled ? 'var(--blue-border)' : 'var(--border)'}`,
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          {server.enabled ? 'ENABLED' : 'DISABLED'}
        </button>

        {/* Sync button */}
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            ...MONO, fontSize: 11, padding: '5px 12px',
            background: 'var(--accent)',
            border: '1px solid var(--accent)',
            color: syncing ? 'rgba(255,255,255,0.7)' : 'var(--btn-upload-text)',
            borderRadius: 5, cursor: syncing ? 'wait' : 'pointer',
            fontWeight: 600, flexShrink: 0,
          }}
        >
          {syncing ? 'Syncing…' : 'Sync'}
        </button>

        {/* Edit button */}
        <button
          onClick={openEdit}
          style={{
            ...SANS, fontSize: 12, padding: '5px 12px',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            borderRadius: 999, cursor: 'pointer',
            fontWeight: 500, flexShrink: 0,
          }}
        >
          Edit
        </button>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          style={{
            ...SANS, fontSize: 12, padding: '5px 12px',
            background: 'var(--btn-danger-bg)',
            border: '1px solid var(--btn-danger-border)',
            color: 'var(--btn-danger-text)',
            borderRadius: 999, cursor: 'pointer',
            fontWeight: 500, flexShrink: 0,
          }}
        >
          Delete
        </button>

        {/* Expand chevron */}
        <span style={{ ...MONO, fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: 'auto' }}>
          {showTools ? '▲' : '▼'}
        </span>
        </div>
      </div>

      {/* Sync error */}
      {syncError && (
        <div style={{
          ...MONO, fontSize: 11, color: 'var(--invalid)',
          padding: '6px 18px',
          background: 'var(--invalid-dim)',
          borderTop: '1px solid var(--invalid)25',
        }}>
          Sync error: {syncError}
        </div>
      )}

      {/* Edit panel */}
      {editing && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            padding: '14px 18px',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ ...MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: 12 }}>
            EDIT SERVER
          </div>

          {/* URL */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>URL</div>
            <input
              value={editUrl}
              onChange={e => setEditUrl(e.target.value)}
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>

          {/* Auth picker */}
          <div style={{ marginBottom: 10 }}>
            <AuthPicker
              initialHeaders={server.headers ?? {}}
              onChange={setEditHeaders}
              inputStyle={inputStyle}
            />
          </div>

          {saveError && (
            <div style={{ ...MONO, fontSize: 11, color: 'var(--invalid)', marginBottom: 8, padding: '6px 10px', background: 'var(--invalid-dim)', border: '1px solid rgba(239,68,68,0.28)', borderRadius: 6 }}>
              {saveError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              style={{
                ...SANS, fontSize: 13, padding: '8px 16px',
                background: 'var(--accent)', color: 'var(--btn-upload-text)',
                border: '1px solid var(--accent)', borderRadius: 999,
                cursor: saving ? 'wait' : 'pointer', fontWeight: 600,
                opacity: saving ? 0.7 : 1,
              }}
            >{saving ? 'Saving…' : 'Save Changes'}</button>
            <button
              onClick={e => { e.stopPropagation(); setEditing(false); setSaveError('') }}
              style={{ ...MONO, fontSize: 12, padding: '6px 14px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-tertiary)', borderRadius: 6, cursor: 'pointer' }}
            >Cancel</button>
          </div>
        </div>
      )}

      {/* Tools panel */}
      {showTools && <McpToolsList key={toolsKey} serverId={server.server_id} />}

      {showDeleteConfirm && (
        <ConfirmModal
          message={`Delete MCP server "${server.name}"? This cannot be undone.`}
          confirmLabel="Delete Server"
          onConfirm={confirmDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}

