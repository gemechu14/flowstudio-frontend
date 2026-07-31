import { useState, useEffect, useCallback } from 'react'
import { TIMEZONES } from '../constants'
import ConfirmModal from '../components/ui/ConfirmModal'
import {
  McpServer, McpTool,
  listMcpServers, createMcpServer, deleteMcpServer,
  syncMcpServer, getMcpServerTools, updateMcpServer,
} from '../api/mcpServers'
import { type KeyStatus, listApiKeys, saveApiKey, deleteApiKey } from '../api/apiKeys'
import {
  WorkflowRecord, WorkflowNode, ScheduleTrigger, WebhookTrigger,
  listWorkflows, listSchedules, createSchedule, deleteSchedule,
  listWebhooks, createWebhook, deleteWebhook, rotateWebhookSecret,
} from '../api/workflows'
import { AgentRecord, listAgents } from '../api/agents'
import { DataSourceRecord, listDataSources } from '../api/dataSources'
import { BASE_URL } from '../api/client'

// ─── design tokens ────────────────────────────────────────────────────────────

const MONO = { fontFamily: 'var(--font-mono)' }
const SANS = { fontFamily: 'var(--font-sans)' }

// ─── small helpers ────────────────────────────────────────────────────────────

const fmtDate = (iso: string | null) => {
  if (!iso) return 'Never'
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

// ─── section heading ──────────────────────────────────────────────────────────

function SectionHeading({ label, title, subtitle }: {
  label: string
  title: string
  subtitle: string
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        ...MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
        color: 'var(--accent)', marginBottom: 6,
      }}>
        {label}
      </div>
      <h2 style={{ ...SANS, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
        {title}
      </h2>
      <p style={{ ...SANS, fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>
        {subtitle}
      </p>
    </div>
  )
}

// ─── auth picker (Postman-style) ──────────────────────────────────────────────

type AuthType = 'none' | 'bearer' | 'apikey' | 'basic'

function authToHeaders(type: AuthType, fields: Record<string, string>): Record<string, string> {
  if (type === 'bearer' && fields.token) {
    return { Authorization: `Bearer ${fields.token}` }
  }
  if (type === 'apikey' && fields.key && fields.value) {
    return { [fields.key]: fields.value }
  }
  if (type === 'basic' && fields.username) {
    const encoded = btoa(`${fields.username}:${fields.password ?? ''}`)
    return { Authorization: `Basic ${encoded}` }
  }
  return {}
}

function headersToAuth(headers: Record<string, string>): { type: AuthType; fields: Record<string, string> } {
  const auth = headers['Authorization'] ?? headers['authorization'] ?? ''
  if (auth.startsWith('Bearer ')) return { type: 'bearer', fields: { token: auth.slice(7) } }
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6))
      const sep = decoded.indexOf(':')
      return { type: 'basic', fields: { username: decoded.slice(0, sep), password: decoded.slice(sep + 1) } }
    } catch { /* fall through */ }
  }
  // custom API key header
  const entries = Object.entries(headers)
  if (entries.length === 1) return { type: 'apikey', fields: { key: entries[0][0], value: entries[0][1] } }
  return { type: 'none', fields: {} }
}

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: 'none',   label: 'No Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'apikey', label: 'API Key' },
  { value: 'basic',  label: 'Basic Auth' },
]

function AuthPicker({
  initialHeaders,
  onChange,
  inputStyle,
}: {
  initialHeaders: Record<string, string>
  onChange: (headers: Record<string, string>) => void
  inputStyle: React.CSSProperties
}) {
  const parsed = headersToAuth(initialHeaders)
  const [authType, setAuthType] = useState<AuthType>(parsed.type)
  const [fields, setFields] = useState<Record<string, string>>(parsed.fields)

  const update = (type: AuthType, newFields: Record<string, string>) => {
    setAuthType(type)
    setFields(newFields)
    onChange(authToHeaders(type, newFields))
  }

  const setField = (key: string, val: string) => {
    const next = { ...fields, [key]: val }
    setFields(next)
    onChange(authToHeaders(authType, next))
  }

  const SEL: React.CSSProperties = {
    ...SANS, fontSize: 14, padding: '8px 12px',
    backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)',
    border: '1px solid var(--border)', borderRadius: 8,
    cursor: 'pointer', outline: 'none',
    colorScheme: 'dark light',
  }

  const FIELD_LABEL: React.CSSProperties = {
    ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4,
  }

  return (
    <div>
      {/* Row 1: dropdown */}
      <div style={{ marginBottom: authType === 'none' ? 0 : 10 }}>
        <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>AUTH TYPE</div>
        <select
          value={authType}
          onChange={e => update(e.target.value as AuthType, {})}
          style={{ ...SEL, width: 180 }}
        >
          {AUTH_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        {authType === 'none' && (
          <span style={{ ...MONO, fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 10 }}>
            No authentication header will be sent.
          </span>
        )}
      </div>

      {/* Row 2: type-specific fields, full width */}
      {authType !== 'none' && (
        <div style={{ display: 'flex', gap: 10 }}>

        {authType === 'bearer' && (
          <div style={{ flex: 1 }}>
            <div style={FIELD_LABEL}>TOKEN</div>
            <input
              type="password"
              value={fields.token ?? ''}
              onChange={e => setField('token', e.target.value)}
              placeholder="Enter token"
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
            {fields.token && (
              <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
                Sends: Authorization: Bearer ••••••
              </div>
            )}
          </div>
        )}

        {authType === 'apikey' && (
          <>
            <div style={{ flex: '0 0 200px' }}>
              <div style={FIELD_LABEL}>HEADER NAME</div>
              <input
                value={fields.key ?? ''}
                onChange={e => setField('key', e.target.value)}
                placeholder="X-API-Key"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={FIELD_LABEL}>VALUE</div>
              <input
                type="password"
                value={fields.value ?? ''}
                onChange={e => setField('value', e.target.value)}
                placeholder="Your API key"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </>
        )}

        {authType === 'basic' && (
          <>
            <div style={{ flex: 1 }}>
              <div style={FIELD_LABEL}>USERNAME</div>
              <input
                value={fields.username ?? ''}
                onChange={e => setField('username', e.target.value)}
                placeholder="username"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={FIELD_LABEL}>PASSWORD</div>
              <input
                type="password"
                value={fields.password ?? ''}
                onChange={e => setField('password', e.target.value)}
                placeholder="password"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </>
        )}

        </div>
      )}
    </div>
  )
}

// ─── inline add-server form ───────────────────────────────────────────────────

function AddServerForm({ onCreated, onCancel }: {
  onCreated: (server: McpServer) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const inputStyle: React.CSSProperties = {
    ...MONO,
    fontSize: 12,
    padding: '8px 12px',
    backgroundColor: 'var(--bg-page)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    boxSizing: 'border-box',
    outline: 'none',
    colorScheme: 'dark light',
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimName = name.trim()
    const trimUrl = url.trim()
    if (!trimName || !trimUrl) { setError('Name and URL are required.'); return }
    setSaving(true); setError('')
    try {
      const server = await createMcpServer(trimName, trimUrl, headers)
      onCreated(server)
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderLeft: '3px solid var(--accent)',
        borderRadius: 10,
        padding: '16px 18px',
        marginBottom: 12,
      }}
    >
      <div style={{
        ...MONO, fontSize: 10, fontWeight: 600,
        letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: 12,
      }}>
        NEW MCP SERVER
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: '0 0 200px' }}>
          <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>NAME</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="my-mcp-server"
            style={{ ...inputStyle, width: '100%' }}
            autoFocus
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>URL</div>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="http://localhost:3001/mcp"
            style={{ ...inputStyle, width: '100%' }}
          />
        </div>
      </div>

      {/* Auth picker */}
      <div style={{ marginBottom: 12 }}>
        <AuthPicker initialHeaders={{}} onChange={setHeaders} inputStyle={inputStyle} />
      </div>

      {error && (
        <div style={{
          ...MONO, fontSize: 11, color: 'var(--invalid)', marginBottom: 10,
          padding: '7px 10px', background: 'var(--invalid-dim)',
          border: '1px solid rgba(239,68,68,0.28)', borderRadius: 6,
        }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            ...SANS, fontSize: 13, padding: '8px 16px',
            background: 'var(--btn-upload-bg)',
            color: 'var(--btn-upload-text)', border: 'none', borderRadius: 999,
            cursor: saving ? 'wait' : 'pointer', fontWeight: 600,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Adding…' : 'Add Server'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            ...SANS, fontSize: 13, padding: '8px 14px',
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)', borderRadius: 999, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── tools list (expandable) ──────────────────────────────────────────────────

function ToolsList({ serverId }: { serverId: string }) {
  const [tools, setTools] = useState<McpTool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getMcpServerTools(serverId)
      .then(res => setTools(res.tools))
      .catch(err => setError(err.message || 'Failed to load tools'))
      .finally(() => setLoading(false))
  }, [serverId])

  if (loading) return (
    <div style={{ ...MONO, fontSize: 11, color: 'var(--text-tertiary)', padding: '10px 18px' }}>
      Loading tools…
    </div>
  )

  if (error) return (
    <div style={{ ...MONO, fontSize: 11, color: 'var(--invalid)', padding: '10px 18px' }}>
      {error}
    </div>
  )

  if (tools.length === 0) return (
    <div style={{ ...MONO, fontSize: 11, color: 'var(--text-tertiary)', padding: '10px 18px' }}>
      No tools reported by this server.
    </div>
  )

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      padding: '12px 18px',
      background: 'var(--bg-surface)',
    }}>
      <div style={{
        ...MONO, fontSize: 10, fontWeight: 600,
        letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 10,
      }}>
        AVAILABLE TOOLS ({tools.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tools.map(tool => (
          <div key={tool.name} style={{
            padding: '8px 12px',
            background: 'var(--bg-page)',
            border: '1px solid var(--border)',
            borderRadius: 6,
          }}>
            <div style={{ ...MONO, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
              {tool.name}
            </div>
            {tool.description && (
              <div style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {tool.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── server row ───────────────────────────────────────────────────────────────

function ServerRow({ server, onDeleted, onSynced }: {
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
    color: 'var(--text-primary)',
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
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
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
            color: 'var(--text-primary)', marginBottom: 2,
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
        <div style={{
          ...MONO, fontSize: 10, color: 'var(--text-tertiary)',
          flexShrink: 0, textAlign: 'right', minWidth: 120,
        }}>
          <div style={{ marginBottom: 1, letterSpacing: '0.05em' }}>LAST SYNCED</div>
          <div style={{ color: 'var(--text-tertiary)' }}>{fmtDate(server.last_synced_at)}</div>
        </div>

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
            background: syncing ? 'var(--accent-soft)' : 'var(--accent-soft)',
            border: '1px solid var(--blue-border)',
            color: syncing ? 'var(--text-tertiary)' : 'var(--accent)',
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
            background: 'var(--btn-accent-bg)',
            border: '1px solid var(--btn-accent-border)',
            color: 'var(--btn-accent-text)',
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
        <span style={{ ...MONO, fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
          {showTools ? '▲' : '▼'}
        </span>
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
                background: 'var(--btn-upload-bg)', color: 'var(--btn-upload-text)',
                border: 'none', borderRadius: 999,
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
      {showTools && <ToolsList key={toolsKey} serverId={server.server_id} />}

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

// ─── Section 2: API Keys ──────────────────────────────────────────────────────

const PROVIDER_META: Record<string, { label: string; color: string; envVar: string }> = {
  openai:    { label: 'OpenAI API Key',    color: 'var(--accent)', envVar: 'OPENAI_API_KEY' },
  anthropic: { label: 'Anthropic API Key', color: 'var(--accent)', envVar: 'ANTHROPIC_API_KEY' },
}

function ApiKeyRow({
  status,
  onSaved,
  onDeleted,
}: {
  status: KeyStatus
  onSaved: () => void
  onDeleted: () => void
}) {
  const meta = PROVIDER_META[status.provider] ?? { label: status.provider, color: 'var(--text-tertiary)', envVar: '' }
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [showValue, setShowValue] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!value.trim()) { setError('Key cannot be empty'); return }
    setSaving(true); setError('')
    try {
      await saveApiKey(status.provider, value.trim())
      setValue(''); setEditing(false); onSaved()
    } catch (e: any) {
      setError(e.message ?? 'Failed to save')
    } finally { setSaving(false) }
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = () => setShowDeleteConfirm(true)

  const confirmDelete = async () => {
    setShowDeleteConfirm(false)
    setDeleting(true); setError('')
    try {
      await deleteApiKey(status.provider)
      onDeleted()
    } catch (e: any) {
      setError(e.message ?? 'Failed to delete')
    } finally { setDeleting(false) }
  }

  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ ...MONO, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
            {meta.label}
          </div>
          {meta.envVar && (
            <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>
              {meta.envVar}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {status.configured ? (
            <>
              <span style={{
                ...MONO, fontSize: 11, fontWeight: 600,
                padding: '3px 10px', borderRadius: 12,
                background: 'var(--accent-soft)', color: 'var(--accent)',
                border: '1px solid var(--blue-border)',
              }}>CONFIGURED</span>
              <button
                onClick={() => setEditing(true)}
                style={{
                  ...SANS, fontSize: 12, padding: '5px 12px', borderRadius: 999,
                  border: '1px solid var(--border)', background: 'var(--btn-neutral-bg)',
                  color: 'var(--btn-neutral-text)', cursor: 'pointer',
                }}>
                Update
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  ...SANS, fontSize: 12, padding: '5px 12px', borderRadius: 999,
                  border: '1px solid var(--btn-danger-border)', background: 'var(--btn-danger-bg)',
                  color: 'var(--btn-danger-text)', cursor: 'pointer', opacity: deleting ? 0.6 : 1,
                }}>
                {deleting ? '…' : 'Remove'}
              </button>
            </>
          ) : (
            <>
              <span style={{
                ...MONO, fontSize: 11, fontWeight: 600,
                padding: '3px 10px', borderRadius: 12,
                background: 'var(--bg-hover)', color: 'var(--text-tertiary)',
                border: '1px solid var(--border)',
              }}>NOT SET</span>
              <button
                onClick={() => setEditing(true)}
                style={{
                  ...SANS, fontSize: 12, padding: '5px 12px', borderRadius: 999,
                  border: '1px solid var(--blue-border)', background: 'var(--accent-soft)',
                  color: 'var(--accent)', cursor: 'pointer', fontWeight: 600,
                }}>
                Set Key
              </button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type={showValue ? 'text' : 'password'}
                placeholder={`Paste your ${meta.label}…`}
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                autoFocus
                style={{
                  ...MONO, fontSize: 13, width: '100%', boxSizing: 'border-box',
                  padding: '8px 36px 8px 12px', borderRadius: 7,
                  border: error ? '1px solid var(--invalid)' : '1px solid var(--border)',
                  outline: 'none', background: 'var(--bg-page)', color: 'var(--text-primary)',
                }}
              />
              <button
                tabIndex={-1}
                onClick={() => setShowValue(v => !v)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                  color: 'var(--text-tertiary)',
                }}>
                {showValue ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                ...SANS, fontSize: 13, padding: '8px 16px', borderRadius: 7,
                border: 'none', background: meta.color, color: '#fff',
                cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1,
                whiteSpace: 'nowrap',
              }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setValue(''); setError('') }}
              style={{
                ...SANS, fontSize: 13, padding: '8px 12px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'var(--bg-surface)',
                color: 'var(--text-secondary)', cursor: 'pointer',
              }}>
              Cancel
            </button>
          </div>
          {error && (
            <div style={{ ...SANS, fontSize: 12, color: 'var(--invalid)', marginTop: 6 }}>{error}</div>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          message={`Remove the ${meta.label}? Agents using this provider will need a key reconfigured.`}
          confirmLabel="Remove Key"
          onConfirm={confirmDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}

function ApiKeysSection() {
  const [statuses, setStatuses] = useState<KeyStatus[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    listApiKeys()
      .then(setStatuses)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { reload() }, [reload])

  return (
    <div>
      <SectionHeading
        label="INTEGRATIONS"
        title="API Keys"
        subtitle="Set API keys for each provider. Keys are stored encrypted and scoped to your organisation."
      />

      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 16,
      }}>
        {loading ? (
          <div style={{ ...SANS, fontSize: 13, color: 'var(--text-tertiary)', padding: '20px 24px' }}>
            Loading…
          </div>
        ) : statuses.length === 0 ? (
          <div style={{ ...SANS, fontSize: 13, color: 'var(--text-tertiary)', padding: '20px 24px' }}>
            No providers available.
          </div>
        ) : (
          statuses.map(s => (
            <ApiKeyRow key={s.provider} status={s} onSaved={reload} onDeleted={reload} />
          ))
        )}
        {/* remove the bottom border from the last row */}
        <style>{`.api-key-last { border-bottom: none !important; }`}</style>
      </div>

      <div style={{
        ...SANS, fontSize: 12, color: 'var(--text-tertiary)',
        padding: '10px 14px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 7,
        lineHeight: 1.5,
      }}>
        Keys are encrypted with AES-256 and stored per organisation. They are never returned to the
        browser after saving. If no key is configured here, the server falls back to its environment variable.
      </div>
    </div>
  )
}

// ─── triggers section ─────────────────────────────────────────────────────────

interface AgentDbInfo {
  agent_id: string
  agent_name: string
  tables: string[]
  row_filter_keys: string[]   // existing configured filter column names on the datasource
}

function WebhookApiDocs({
  webhook,
  secret,
  agentDbInfo,
  onDismissSecret,
}: {
  webhook: WebhookTrigger
  secret: string | null
  agentDbInfo: AgentDbInfo[]
  onDismissSecret: () => void
}) {
  const [copied, setCopied] = useState<string | null>(null)
  const [docsOpen, setDocsOpen] = useState(!!secret)
  const [lang, setLang] = useState<'curl' | 'json'>('curl')

  const sec = secret ?? '<your-secret>'
  const fireUrl = `${BASE_URL}/triggers/webhooks/${webhook.webhook_id}/trigger`
  const pollUrl = `${BASE_URL}/triggers/webhooks/${webhook.webhook_id}/runs/{run_id}`
  const resumeUrl = `${BASE_URL}/triggers/webhooks/${webhook.webhook_id}/runs/{run_id}/resume`

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1800)
    }).catch(() => {})
  }

  const hasDb = agentDbInfo.length > 0

  // agent_filters body fragment (shared between curl and json)
  const filterBody = hasDb
    ? agentDbInfo.slice(0, 2).reduce<Record<string, Record<string, unknown>>>((acc, info) => {
        const col = info.row_filter_keys[0] ?? 'user_id'
        acc[info.agent_id] = { [col]: { op: '=', value: 'your_value' } }
        return acc
      }, {})
    : { 'agent-uuid': { user_id: { op: '=', value: 'u_123' } } }

  // ── curl strings ──
  const filterExampleLines = hasDb
    ? agentDbInfo.slice(0, 2).map(info => {
        const col = info.row_filter_keys[0] ?? 'user_id'
        return `    // ${info.agent_name}\n    "${info.agent_id}": {\n      "${col}": {"op": "=", "value": "your_value"}\n    }`
      }).join(',\n')
    : `    "agent-uuid": {\n      "user_id": {"op": "=", "value": "u_123"}\n    }`

  const asyncCurl = `# Step 1 — fire the workflow
curl -X POST "${fireUrl}" \\
  -H "X-Webhook-Secret: ${sec}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "initial_input": "your prompt here"${hasDb ? `,
    "agent_filters": {
${filterExampleLines}
    }` : ''}
  }'

# Response: {"status": "accepted", "run_id": "abc-123"}`

  const pollCurl = `# Step 2 — poll until status changes
curl "${pollUrl}" \\
  -H "X-Webhook-Secret: ${sec}"

# While running:    {"status": "running"}
# On checkpoint:    {"status": "awaiting_checkpoint", "checkpoint": {...}}
# When done:        {"status": "completed", "final_output": "..."}`

  const resumeCurl = `# Step 3 (only if awaiting_checkpoint)
curl -X POST "${resumeUrl}" \\
  -H "X-Webhook-Secret: ${sec}" \\
  -H "Content-Type: application/json" \\
  -d '{"human_input": "APPROVE"}'`

  const syncCurl = `# Sync — wait for result inline (max 300s)
curl -X POST "${fireUrl}?mode=sync&timeout=120" \\
  -H "X-Webhook-Secret: ${sec}" \\
  -H "Content-Type: application/json" \\
  -d '{"initial_input": "your prompt here"}'

# Response: {"status": "completed", "final_output": "..."}`

  // ── JSON / REST strings ──
  const asyncJson = JSON.stringify({
    method: 'POST',
    url: fireUrl,
    headers: { 'X-Webhook-Secret': sec, 'Content-Type': 'application/json' },
    body: {
      initial_input: 'your prompt here',
      ...(hasDb ? { agent_filters: filterBody } : {}),
    },
    response: { status: 'accepted', run_id: 'abc-123' },
  }, null, 2)

  const pollJson = JSON.stringify({
    method: 'GET',
    url: pollUrl,
    headers: { 'X-Webhook-Secret': sec },
    responses: {
      running: { status: 'running' },
      awaiting_checkpoint: {
        status: 'awaiting_checkpoint',
        checkpoint: {
          checkpoint_id: 'cp_xyz',
          node_label: 'Review step',
          checkpoint_prompt: 'Does this look correct?',
          prior_output: 'the agent output so far...',
        },
      },
      completed: { status: 'completed', final_output: '...' },
    },
  }, null, 2)

  const resumeJson = JSON.stringify({
    method: 'POST',
    url: resumeUrl,
    headers: { 'X-Webhook-Secret': sec, 'Content-Type': 'application/json' },
    body: { human_input: 'APPROVE' },
    note: 'human_input can be any text. "APPROVE" accepts the prior output as-is.',
    response: { run_id: '...', status: 'resumed' },
  }, null, 2)

  const syncJson = JSON.stringify({
    method: 'POST',
    url: `${fireUrl}?mode=sync&timeout=120`,
    headers: { 'X-Webhook-Secret': sec, 'Content-Type': 'application/json' },
    body: { initial_input: 'your prompt here' },
    note: 'Not recommended if workflow has human checkpoint nodes.',
    response: { status: 'completed', final_output: '...' },
  }, null, 2)

  const CODE: React.CSSProperties = {
    ...MONO, fontSize: 10, whiteSpace: 'pre', overflowX: 'auto',
    background: 'var(--bg-hover)', color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    padding: '10px 12px', borderRadius: 6, lineHeight: 1.55,
    display: 'block',
  }

  const copyBtn = (curlText: string, jsonText: string, key: string) => (
    <button
      onClick={() => copy(lang === 'curl' ? curlText : jsonText, key)}
      style={{
        ...MONO, fontSize: 9, padding: '2px 7px', flexShrink: 0,
        background: copied === key ? 'var(--accent-soft)' : 'transparent',
        border: `1px solid ${copied === key ? 'var(--blue-border)' : 'var(--border)'}`,
        color: copied === key ? 'var(--accent)' : 'var(--text-tertiary)',
        borderRadius: 4, cursor: 'pointer',
      }}
    >{copied === key ? 'Copied!' : 'Copy'}</button>
  )

  const agentCopyBtn = (text: string, key: string) => (
    <button
      onClick={() => copy(text, key)}
      style={{
        ...MONO, fontSize: 9, padding: '2px 7px', flexShrink: 0,
        background: copied === key ? 'var(--accent-soft)' : 'transparent',
        border: `1px solid ${copied === key ? 'var(--blue-border)' : 'var(--border)'}`,
        color: copied === key ? 'var(--accent)' : 'var(--text-tertiary)',
        borderRadius: 4, cursor: 'pointer',
      }}
    >{copied === key ? 'Copied!' : 'Copy'}</button>
  )

  const sectionLabel = (label: string, color: string) => (
    <div style={{ ...MONO, fontSize: 10, fontWeight: 700, color, marginBottom: 6 }}>{label}</div>
  )

  const infoBox = (children: React.ReactNode) => (
    <div style={{
      background: 'var(--bg-page)', border: '1px solid var(--border)',
      borderRadius: 6, padding: '10px 12px',
    }}>{children}</div>
  )

  const TAB: React.CSSProperties = {
    ...MONO, fontSize: 10, padding: '3px 10px', cursor: 'pointer',
    border: '1px solid var(--border)', borderRadius: 4,
  }

  return (
    <div>
      {/* Secret reveal — shown only once on creation */}
      {secret && (
        <div style={{
          margin: '8px 0',
          background: 'var(--untested-dim)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: 7, padding: '10px 12px',
        }}>
          <div style={{
            ...MONO, fontSize: 10, color: 'var(--untested)', fontWeight: 700,
            marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            ⚠ Save your secret — shown only once
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <code style={{
              ...MONO, fontSize: 11, flex: 1, background: 'var(--bg-hover)',
              color: 'var(--untested)', padding: '5px 8px', borderRadius: 5,
              border: '1px solid var(--border)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{secret}</code>
            {agentCopyBtn(secret, 'secret')}
          </div>
          <button
            onClick={onDismissSecret}
            style={{
              ...MONO, fontSize: 10, padding: '4px 12px',
              background: 'var(--accent)', color: 'var(--btn-upload-text)', border: 'none',
              borderRadius: 5, cursor: 'pointer', width: '100%',
            }}
          >I've saved it — dismiss</button>
        </div>
      )}

      {/* Toggle docs + lang switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: secret ? 0 : 4 }}>
        <button
          onClick={() => setDocsOpen(o => !o)}
          style={{
            ...MONO, fontSize: 10, padding: '3px 8px',
            background: 'none', border: '1px solid var(--border)',
            color: 'var(--text-tertiary)', borderRadius: 4, cursor: 'pointer',
          }}
        >{docsOpen ? '▾ Hide API docs' : '▸ View API docs'}</button>

        {docsOpen && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setLang('curl')}
              style={{
                ...TAB,
                background: lang === 'curl' ? 'var(--accent)' : 'transparent',
                color: lang === 'curl' ? 'var(--btn-upload-text)' : 'var(--text-tertiary)',
                borderColor: lang === 'curl' ? 'var(--accent)' : 'var(--border)',
              }}
            >curl</button>
            <button
              onClick={() => setLang('json')}
              style={{
                ...TAB,
                background: lang === 'json' ? 'var(--accent)' : 'transparent',
                color: lang === 'json' ? 'var(--btn-upload-text)' : 'var(--text-tertiary)',
                borderColor: lang === 'json' ? 'var(--accent)' : 'var(--border)',
              }}
            >JSON</button>
          </div>
        )}
      </div>

      {docsOpen && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ── Async flow ── */}
          <div>
            {sectionLabel('Async — fire and poll (recommended)', 'var(--accent)')}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)' }}>Step 1: fire the trigger</span>
              {copyBtn(asyncCurl, asyncJson, 'async')}
            </div>
            <code style={CODE}>{lang === 'curl' ? asyncCurl : asyncJson}</code>
          </div>

          {/* ── Poll + checkpoint ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)' }}>Step 2: poll for result (or checkpoint)</span>
              {copyBtn(pollCurl, pollJson, 'poll')}
            </div>
            <code style={CODE}>{lang === 'curl' ? pollCurl : pollJson}</code>
          </div>

          {/* ── Resume checkpoint ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)' }}>Step 3 (optional): answer a human checkpoint</span>
              {copyBtn(resumeCurl, resumeJson, 'resume')}
            </div>
            <code style={CODE}>{lang === 'curl' ? resumeCurl : resumeJson}</code>
            <div style={{ ...SANS, fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.5 }}>
              Human checkpoint nodes are optional — only workflows that include them will ever return <code style={{ ...MONO, fontSize: 10 }}>awaiting_checkpoint</code>. After you answer, poll again until <code style={{ ...MONO, fontSize: 10 }}>status</code> is <code style={{ ...MONO, fontSize: 10 }}>completed</code> or <code style={{ ...MONO, fontSize: 10 }}>failed</code>.
            </div>
          </div>

          {/* ── Sync mode ── */}
          <div>
            {sectionLabel('Sync — wait for result inline', 'var(--accent)')}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)' }}>Single request, result in response</span>
              {copyBtn(syncCurl, syncJson, 'sync')}
            </div>
            <code style={CODE}>{lang === 'curl' ? syncCurl : syncJson}</code>
          </div>

          {/* ── agent_filters (only when DB datasources exist) ── */}
          {hasDb && infoBox(
            <>
              <div style={{ ...MONO, fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                agent_filters — row-level security
              </div>
              <div style={{ ...SANS, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
                Pass per-agent filters so each agent only sees rows matching your criteria.
                Two formats — flat (applies to all allowed tables) or per-table (explicit scoping):
              </div>
              <code style={{ ...CODE, marginBottom: 8 }}>{`// Flat — filter applied across all tables the agent can query
"${agentDbInfo[0].agent_id}": {
  "${agentDbInfo[0].row_filter_keys[0] ?? 'user_id'}": {"op": "=", "value": "u_123"},
  "status": {"op": "!=", "value": "deleted"}
}

// Per-table — scope each filter to a specific table
"${agentDbInfo[0].agent_id}": {
  "${agentDbInfo[0].tables[0] ?? 'orders'}": {
    "${agentDbInfo[0].row_filter_keys[0] ?? 'user_id'}": {"op": "=", "value": "u_123"}
  }${agentDbInfo[0].tables[1] ? `,
  "${agentDbInfo[0].tables[1]}": {
    "account_id": {"op": "=", "value": "acc_456"}
  }` : ''}
}

// Column alias override — use ":alias" as the column key to rename it in SQL
"${agentDbInfo[0].agent_id}": {
  ":uid": {"op": "=", "value": "u_123"}   // maps :uid → user_id in your WHERE clause
}`}</code>
              <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                Supported operators:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'NOT LIKE', 'ILIKE', 'NOT ILIKE', 'IN', 'NOT IN'].map(op => (
                  <span key={op} style={{
                    ...MONO, fontSize: 9, padding: '1px 6px', borderRadius: 3,
                    background: 'var(--accent-soft)', color: 'var(--accent)',
                    border: '1px solid var(--blue-border)',
                  }}>{op}</span>
                ))}
              </div>
              <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                Agents with database access in this workflow:
              </div>
              {agentDbInfo.map(info => (
                <div key={info.agent_id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ ...MONO, fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{info.agent_name}</span>
                    <span style={{ ...MONO, fontSize: 9, color: 'var(--text-tertiary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.agent_id}</span>
                    {agentCopyBtn(info.agent_id, `agent-${info.agent_id}`)}
                  </div>
                  {info.tables.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {info.tables.map(t => (
                        <span key={t} style={{ ...MONO, fontSize: 9, padding: '1px 6px', borderRadius: 3, background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--blue-border)' }}>{t}</span>
                      ))}
                    </div>
                  )}
                  {info.row_filter_keys.length > 0 && (
                    <div style={{ ...SANS, fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      Configured filter columns: <span style={{ ...MONO }}>{info.row_filter_keys.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

        </div>
      )}
    </div>
  )
}

// ─── cron builder ─────────────────────────────────────────────────────────────

type CronFreq = 'hour' | 'day' | 'week' | 'month'

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']
const MONTH_DAYS = Array.from({ length: 28 }, (_, i) => String(i + 1))


function buildCron(freq: CronFreq, minute: string, hour: string, dow: string, dom: string): string {
  const m = minute || '0'
  const h = hour || '9'
  if (freq === 'hour')  return `${m} * * * *`
  if (freq === 'day')   return `${m} ${h} * * *`
  if (freq === 'week')  return `${m} ${h} * * ${dow}`
  if (freq === 'month') return `${m} ${h} ${dom} * *`
  return `${m} ${h} * * *`
}

function humanLabel(freq: CronFreq, minute: string, hour: string, dow: string, dom: string): string {
  const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')} UTC`
  if (freq === 'hour')  return `Every hour at :${minute.padStart(2, '0')}`
  if (freq === 'day')   return `Every day at ${time}`
  if (freq === 'week')  return `Every ${DAYS_OF_WEEK[+dow]} at ${time}`
  if (freq === 'month') return `Day ${dom} of every month at ${time}`
  return ''
}

function CronBuilder({
  value, timezone, onChange, onTimezoneChange,
}: {
  value: string
  timezone: string
  onChange: (cron: string) => void
  onTimezoneChange: (tz: string) => void
}) {
  const [freq, setFreq]     = useState<CronFreq>('day')
  const [hour, setHour]     = useState('09')
  const [minute, setMinute] = useState('00')
  const [dow, setDow]       = useState('1')
  const [dom, setDom]       = useState('1')

  const emit = (f: CronFreq, h: string, m: string, d: string, dm: string) => {
    onChange(buildCron(f, m, h, d, dm))
  }

  const set = (setter: (v: any) => void, val: string, next: Partial<{f: CronFreq; h: string; m: string; d: string; dm: string}>) => {
    setter(val)
    emit(next.f ?? freq, next.h ?? hour, next.m ?? minute, next.d ?? dow, next.dm ?? dom)
  }

  const SEL: React.CSSProperties = {
    ...SANS, fontSize: 14, padding: '6px 10px',
    backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)',
    border: '1px solid var(--border)', borderRadius: 8,
    cursor: 'pointer', colorScheme: 'dark light',
  }

  const tzLabel = TIMEZONES.find(t => t.value === timezone)?.label ?? timezone
  const label = humanLabel(freq, minute, hour, dow, dom)

  return (
    <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>

      {/* Row 1 — frequency + time */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 10 }}>

        <span style={{ ...MONO, fontSize: 12, color: 'var(--text-tertiary)' }}>Run every</span>

        <select style={SEL} value={freq} onChange={e => set(setFreq, e.target.value as CronFreq, { f: e.target.value as CronFreq })}>
          <option value="hour">hour</option>
          <option value="day">day</option>
          <option value="week">week</option>
          <option value="month">month</option>
        </select>

        {freq === 'week' && (
          <>
            <span style={{ ...MONO, fontSize: 12, color: 'var(--text-tertiary)' }}>on</span>
            <select style={SEL} value={dow} onChange={e => set(setDow, e.target.value, { d: e.target.value })}>
              {DAYS_OF_WEEK.map((d, i) => <option key={i} value={String(i)}>{d}</option>)}
            </select>
          </>
        )}

        {freq === 'month' && (
          <>
            <span style={{ ...MONO, fontSize: 12, color: 'var(--text-tertiary)' }}>on day</span>
            <select style={SEL} value={dom} onChange={e => set(setDom, e.target.value, { dm: e.target.value })}>
              {MONTH_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </>
        )}

        {freq !== 'hour' ? (
          <>
            <span style={{ ...MONO, fontSize: 12, color: 'var(--text-tertiary)' }}>at</span>
            <select style={SEL} value={hour} onChange={e => set(setHour, e.target.value, { h: e.target.value })}>
              {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
            </select>
          </>
        ) : (
          <span style={{ ...MONO, fontSize: 12, color: 'var(--text-tertiary)' }}>at minute</span>
        )}

        <select style={SEL} value={minute} onChange={e => set(setMinute, e.target.value, { m: e.target.value })}>
          {MINUTES.map(m => <option key={m} value={m}>:{m}</option>)}
        </select>
      </div>

      {/* Row 2 — timezone */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ ...MONO, fontSize: 12, color: 'var(--text-tertiary)' }}>Timezone</span>
        <select
          style={{ ...SEL, minWidth: 200 }}
          value={timezone}
          onChange={e => onTimezoneChange(e.target.value)}
        >
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ ...SANS, fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
          {label} — {tzLabel}
        </span>
        <span style={{
          ...MONO, fontSize: 10, padding: '2px 8px', borderRadius: 4,
          background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--blue-border)',
        }}>{value || buildCron(freq, minute, hour, dow, dom)}</span>
      </div>
    </div>
  )
}

function TriggersSection() {
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([])
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [datasources, setDatasources] = useState<DataSourceRecord[]>([])
  const [selectedWfId, setSelectedWfId] = useState<string>('')
  const [schedules, setSchedules] = useState<ScheduleTrigger[]>([])
  const [webhooks, setWebhooks] = useState<WebhookTrigger[]>([])
  const [loadingTriggers, setLoadingTriggers] = useState(false)
  const [newCronExpr, setNewCronExpr] = useState('')
  const [newTimezone, setNewTimezone] = useState('UTC')
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [savingWebhook, setSavingWebhook] = useState(false)
  // Map from webhook_id → secret (kept in local state only until dismissed)
  const [pendingSecrets, setPendingSecrets] = useState<Record<string, string>>({})

  useEffect(() => {
    Promise.all([listWorkflows(), listAgents(), listDataSources()])
      .then(([wfs, ags, dss]) => { setWorkflows(wfs); setAgents(ags); setDatasources(dss) })
      .catch(() => {})
  }, [])

  const selectedWf = workflows.find(w => w.workflow_id === selectedWfId) ?? null
  const agentNodes: WorkflowNode[] = selectedWf
    ? (selectedWf.nodes ?? []).filter(n => n.node_type === 'agent' && n.agent_id)
    : []
  const agentsById: Record<string, AgentRecord> = Object.fromEntries(
    agents.map(a => [a.agent_id, a])
  )
  const dbSourcesById: Record<string, DataSourceRecord> = Object.fromEntries(
    datasources.filter(d => d.source_type === 'database').map(d => [d.source_id, d])
  )
  const agentDbInfo: AgentDbInfo[] = agentNodes.reduce<AgentDbInfo[]>((acc, n) => {
    const agent = agentsById[n.agent_id ?? '']
    if (!agent) return acc
    const dbSources = (agent.datasource_ids ?? []).map(id => dbSourcesById[id]).filter(Boolean)
    if (dbSources.length === 0) return acc
    const tables = Array.from(new Set(dbSources.flatMap(ds => ds.allowed_tables ?? [])))
    const row_filter_keys = Array.from(new Set(
      dbSources.flatMap(ds => Object.keys(ds.row_filters ?? {}))
        .map(k => k.startsWith(':') ? k.slice(1) : k)
    ))
    acc.push({ agent_id: agent.agent_id, agent_name: agent.name, tables, row_filter_keys })
    return acc
  }, [])

  const loadTriggers = useCallback((wfId: string) => {
    if (!wfId) return
    setLoadingTriggers(true)
    Promise.all([
      listSchedules(wfId).catch(() => [] as ScheduleTrigger[]),
      listWebhooks(wfId).catch(() => [] as WebhookTrigger[]),
    ]).then(([s, w]) => {
      setSchedules(s)
      setWebhooks(w)
    }).finally(() => setLoadingTriggers(false))
  }, [])

  const handleSelectWf = (wfId: string) => {
    setSelectedWfId(wfId)
    setSchedules([])
    setWebhooks([])
    setShowAddSchedule(false)
    setNewCronExpr('')
    setNewTimezone('UTC')
    setPendingSecrets({})
    if (wfId) loadTriggers(wfId)
  }

  const handleAddSchedule = async () => {
    if (!selectedWfId || !newCronExpr.trim()) return
    setSavingSchedule(true)
    try {
      const s = await createSchedule(selectedWfId, newCronExpr.trim(), newTimezone)
      setSchedules(prev => [...prev, s])
      setNewCronExpr('')
      setNewTimezone('UTC')
      setShowAddSchedule(false)
    } catch { /* ignore */ } finally { setSavingSchedule(false) }
  }

  const handleDeleteSchedule = async (triggerId: string) => {
    await deleteSchedule(triggerId).catch(() => {})
    setSchedules(prev => prev.filter(s => s.trigger_id !== triggerId))
  }

  const handleAddWebhook = async () => {
    if (!selectedWfId) return
    setSavingWebhook(true)
    try {
      const w = await createWebhook(selectedWfId)
      // w.secret is only present on creation — stash it in local state
      if (w.secret) {
        setPendingSecrets(prev => ({ ...prev, [w.webhook_id]: w.secret! }))
      }
      setWebhooks(prev => [...prev, w])
    } catch { /* ignore */ } finally { setSavingWebhook(false) }
  }

  const handleDeleteWebhook = async (webhookId: string) => {
    await deleteWebhook(webhookId).catch(() => {})
    setWebhooks(prev => prev.filter(w => w.webhook_id !== webhookId))
    setPendingSecrets(prev => { const n = { ...prev }; delete n[webhookId]; return n })
  }

  const handleRotateSecret = async (webhookId: string) => {
    try {
      const w = await rotateWebhookSecret(webhookId)
      if (w.secret) setPendingSecrets(prev => ({ ...prev, [webhookId]: w.secret! }))
    } catch { /* ignore */ }
  }

  const dismissSecret = (webhookId: string) => {
    setPendingSecrets(prev => { const n = { ...prev }; delete n[webhookId]; return n })
  }

  const ROW: React.CSSProperties = {
    background: 'var(--card-bg)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '12px 14px', marginBottom: 8,
  }

  return (
    <div>
      <SectionHeading
        label="AUTOMATION"
        title="Triggers"
        subtitle="Schedule workflows on a cron, or fire them via webhook from any external app."
      />

      {/* Workflow selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Select workflow
        </label>
        <select
          value={selectedWfId}
          onChange={e => handleSelectWf(e.target.value)}
          style={{
            ...SANS, fontSize: 14, padding: '10px 14px',
            backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)',
            border: '1px solid var(--border)', borderRadius: 8,
            minWidth: 280, cursor: 'pointer', colorScheme: 'dark light',
          }}
        >
          <option value="">— choose a workflow —</option>
          {workflows.map(w => (
            <option key={w.workflow_id} value={w.workflow_id}>{w.name}</option>
          ))}
        </select>
      </div>

      {!selectedWfId && (
        <div style={{
          textAlign: 'center', padding: '40px 0',
          background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10,
        }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>⚡</div>
          <div style={{ ...MONO, fontSize: 12, color: 'var(--text-tertiary)' }}>Select a workflow to manage its triggers</div>
        </div>
      )}

      {selectedWfId && loadingTriggers && (
        <div style={{ ...MONO, fontSize: 12, color: 'var(--text-tertiary)', padding: '20px 0' }}>Loading…</div>
      )}

      {selectedWfId && !loadingTriggers && (
        <>
          {/* ── Schedules ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ ...MONO, fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Scheduled Runs
              </span>
              <button
                onClick={() => setShowAddSchedule(o => !o)}
                style={{
                  ...MONO, fontSize: 10, padding: '3px 10px',
                  background: 'var(--accent-soft)', border: '1px solid var(--blue-border)',
                  color: 'var(--accent)', borderRadius: 5, cursor: 'pointer',
                }}
              >{showAddSchedule ? 'Cancel' : '+ Add schedule'}</button>
            </div>

            {showAddSchedule && (
              <div style={{ marginBottom: 10 }}>
                <CronBuilder
                  value={newCronExpr}
                  timezone={newTimezone}
                  onChange={setNewCronExpr}
                  onTimezoneChange={setNewTimezone}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleAddSchedule}
                    disabled={savingSchedule || !newCronExpr.trim()}
                    style={{
                      ...MONO, fontSize: 11, padding: '6px 16px',
                      background: 'var(--accent)', color: 'var(--btn-upload-text)', border: 'none',
                      borderRadius: 6, cursor: 'pointer', opacity: savingSchedule ? 0.6 : 1,
                    }}
                  >{savingSchedule ? 'Saving…' : 'Add schedule'}</button>
                  <button
                    onClick={() => { setShowAddSchedule(false); setNewCronExpr(''); setNewTimezone('UTC') }}
                    style={{
                      ...MONO, fontSize: 11, padding: '6px 12px',
                      background: 'none', color: 'var(--text-tertiary)',
                      border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
                    }}
                  >Cancel</button>
                </div>
              </div>
            )}

            {schedules.length === 0 && !showAddSchedule && (
              <div style={{ ...SANS, fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '8px 0' }}>
                No schedules yet.
              </div>
            )}

            {schedules.map(s => (
              <div key={s.trigger_id} style={ROW}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...MONO, fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{s.cron_expr}</span>
                  <span style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)' }}>
                    {TIMEZONES.find(t => t.value === s.timezone)?.label ?? s.timezone ?? 'UTC'}
                  </span>
                  <span style={{
                    ...MONO, fontSize: 9, padding: '2px 6px', borderRadius: 3,
                    background: s.enabled ? 'var(--accent-soft)' : 'var(--text-tertiary)20',
                    color: s.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
                    border: `1px solid ${s.enabled ? 'var(--blue-border)' : 'var(--text-tertiary)40'}`,
                  }}>{s.enabled ? 'on' : 'off'}</span>
                  {s.last_run_at && (
                    <span style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)' }}>
                      last: {fmtDate(s.last_run_at)}
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteSchedule(s.trigger_id)}
                    style={{ background: 'none', border: 'none', color: 'var(--invalid)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
                  >×</button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Webhooks ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ ...MONO, fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Webhook Triggers
              </span>
              <button
                onClick={handleAddWebhook}
                disabled={savingWebhook}
                style={{
                  ...MONO, fontSize: 10, padding: '3px 10px',
                  background: 'var(--accent-soft)', border: '1px solid var(--blue-border)',
                  color: 'var(--accent)', borderRadius: 5, cursor: 'pointer',
                  opacity: savingWebhook ? 0.6 : 1,
                }}
              >{savingWebhook ? '…' : '+ Add webhook'}</button>
            </div>

            {webhooks.length === 0 && (
              <div style={{ ...SANS, fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '8px 0' }}>
                No webhooks yet.
              </div>
            )}

            {webhooks.map(w => (
              <div key={w.webhook_id} style={ROW}>
                {/* Webhook header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    ...MONO, fontSize: 9, padding: '2px 6px', borderRadius: 3,
                    background: w.enabled ? 'var(--accent-soft)' : 'var(--text-tertiary)20',
                    color: w.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
                    border: `1px solid ${w.enabled ? 'var(--blue-border)' : 'var(--text-tertiary)40'}`,
                  }}>{w.enabled ? 'on' : 'off'}</span>
                  {w.last_triggered_at && (
                    <span style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)' }}>
                      last: {fmtDate(w.last_triggered_at)}
                    </span>
                  )}
                  <span style={{
                    ...MONO, fontSize: 9, color: 'var(--text-tertiary)', flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{BASE_URL}/triggers/webhooks/{w.webhook_id}/trigger</span>
                  <button
                    onClick={() => handleRotateSecret(w.webhook_id)}
                    title="Rotate secret"
                    style={{
                      ...MONO, fontSize: 9, padding: '2px 7px',
                      background: 'none', border: '1px solid var(--border)',
                      color: 'var(--text-tertiary)', borderRadius: 4, cursor: 'pointer',
                    }}
                  >↻ Rotate</button>
                  <button
                    onClick={() => handleDeleteWebhook(w.webhook_id)}
                    style={{ background: 'none', border: 'none', color: 'var(--invalid)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
                  >×</button>
                </div>

                {/* API docs + secret reveal */}
                <WebhookApiDocs
                  webhook={w}
                  secret={pendingSecrets[w.webhook_id] ?? null}
                  agentDbInfo={agentDbInfo}
                  onDismissSecret={() => dismissSecret(w.webhook_id)}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── main Settings page ───────────────────────────────────────────────────────

export default function Settings() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const reload = useCallback(() => {
    setLoadError('')
    listMcpServers()
      .then(setServers)
      .catch(err => setLoadError(err.message || 'Failed to load MCP servers'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { reload() }, [reload])

  const handleCreated = (server: McpServer) => {
    setServers(prev => [...prev, server])
    setShowAddForm(false)
  }

  const handleDeleted = (serverId: string) => {
    setServers(prev => prev.filter(s => s.server_id !== serverId))
  }

  const handleSynced = (updated: McpServer) => {
    setServers(prev => prev.map(s => s.server_id === updated.server_id ? updated : s))
  }

  return (
    <div style={{
      padding: '28px 36px',
      width: '100%',
      boxSizing: 'border-box',
      background: 'var(--bg-page)',
      minHeight: '100%',
      ...SANS,
    }}>

      {/* ── Section 1: MCP Tool Servers ─────────────────────────────────── */}
      <div style={{ marginBottom: 48 }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <SectionHeading
            label="CONFIGURATION"
            title="MCP Tool Servers"
            subtitle="Connect remote Model Context Protocol servers to expose their tools to agents."
          />
          <button
            onClick={() => setShowAddForm(v => !v)}
            style={{
              ...SANS, fontSize: 13, padding: '8px 16px',
              background: showAddForm ? 'var(--accent-soft)' : 'var(--btn-upload-bg)',
              color: showAddForm ? 'var(--accent)' : 'var(--btn-upload-text)',
              border: showAddForm ? '1px solid var(--blue-border)' : 'none',
              borderRadius: 999,
              cursor: 'pointer', fontWeight: 600, flexShrink: 0, marginTop: 2,
            }}
          >
            {showAddForm ? 'Cancel' : '+ Add MCP Server'}
          </button>
        </div>

        {showAddForm && (
          <AddServerForm
            onCreated={handleCreated}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {loadError && (
          <div style={{
            ...MONO, fontSize: 12, color: 'var(--invalid)',
            padding: '10px 14px', background: 'var(--invalid-dim)',
            border: '1px solid rgba(239,68,68,0.28)', borderRadius: 7, marginBottom: 12,
          }}>
            {loadError}
          </div>
        )}

        {loading ? (
          <div style={{
            ...MONO, fontSize: 12, color: 'var(--text-tertiary)',
            padding: '40px 0', textAlign: 'center',
          }}>
            Loading servers…
          </div>
        ) : servers.length === 0 && !showAddForm ? (
          <div style={{
            textAlign: 'center', padding: '48px 0',
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🔌</div>
            <div style={{ ...SANS, fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>
              No MCP servers configured
            </div>
            <div style={{ ...SANS, fontSize: 13, color: 'var(--text-tertiary)' }}>
              Add an MCP server to expose its tools to your agents.
            </div>
          </div>
        ) : (
          servers.map(server => (
            <ServerRow
              key={server.server_id}
              server={server}
              onDeleted={() => handleDeleted(server.server_id)}
              onSynced={handleSynced}
            />
          ))
        )}
      </div>

      {/* divider */}
      <div style={{ borderTop: '1px solid var(--border)', marginBottom: 40 }} />

      {/* ── Section 2: API Keys ─────────────────────────────────────────── */}
      <ApiKeysSection />

      {/* divider */}
      <div style={{ borderTop: '1px solid var(--border)', margin: '40px 0' }} />

      {/* ── Section 3: Triggers ─────────────────────────────────────────── */}
      <TriggersSection />

    </div>
  )
}
