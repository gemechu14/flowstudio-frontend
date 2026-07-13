import { useState, useEffect, useCallback } from 'react'
import ConfirmModal from '../components/ui/ConfirmModal'
import {
  McpServer, McpTool,
  listMcpServers, createMcpServer, deleteMcpServer,
  syncMcpServer, getMcpServerTools,
} from '../api/mcpServers'
import { type KeyStatus, listApiKeys, saveApiKey, deleteApiKey } from '../api/apiKeys'

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
        color: '#1D5FFA', marginBottom: 6,
      }}>
        {label}
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>
        {title}
      </h2>
      <p style={{ ...SANS, fontSize: 13, color: 'var(--text-body)', marginTop: 4, marginBottom: 0 }}>
        {subtitle}
      </p>
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const inputStyle: React.CSSProperties = {
    ...MONO,
    fontSize: 12,
    padding: '7px 10px',
    background: 'var(--bg-light)',
    color: 'var(--text-dark)',
    border: '1px solid var(--border-light)',
    borderRadius: 6,
    boxSizing: 'border-box',
    width: '100%',
    outline: 'none',
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimName = name.trim()
    const trimUrl = url.trim()
    if (!trimName || !trimUrl) { setError('Name and URL are required.'); return }
    setSaving(true); setError('')
    try {
      const server = await createMcpServer(trimName, trimUrl)
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
        background: '#F0F5FF',
        border: '1px solid #C7D9FF',
        borderRadius: 8,
        padding: '16px 18px',
        marginBottom: 12,
      }}
    >
      <div style={{
        ...MONO, fontSize: 10, fontWeight: 600,
        letterSpacing: '0.1em', color: '#1D5FFA', marginBottom: 12,
      }}>
        NEW MCP SERVER
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: '0 0 200px' }}>
          <div style={{ ...MONO, fontSize: 10, color: '#6B7280', marginBottom: 4 }}>NAME</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="my-mcp-server"
            style={inputStyle}
            autoFocus
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...MONO, fontSize: 10, color: '#6B7280', marginBottom: 4 }}>URL</div>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="http://localhost:3001/mcp"
            style={inputStyle}
          />
        </div>
      </div>

      {error && (
        <div style={{
          ...MONO, fontSize: 11, color: '#EF4444', marginBottom: 10,
          padding: '7px 10px', background: '#EF444418',
          border: '1px solid #EF444440', borderRadius: 6,
        }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            ...MONO, fontSize: 12, padding: '7px 16px',
            background: saving ? '#1D5FFA88' : '#1D5FFA',
            color: '#fff', border: 'none', borderRadius: 6,
            cursor: saving ? 'wait' : 'pointer', fontWeight: 700,
          }}
        >
          {saving ? 'Adding…' : 'Add Server'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            ...MONO, fontSize: 12, padding: '7px 14px',
            background: 'transparent',
            border: '1px solid var(--border-light)',
            color: '#6B7280', borderRadius: 6, cursor: 'pointer',
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
    <div style={{ ...MONO, fontSize: 11, color: '#6B7280', padding: '10px 18px' }}>
      Loading tools…
    </div>
  )

  if (error) return (
    <div style={{ ...MONO, fontSize: 11, color: '#EF4444', padding: '10px 18px' }}>
      {error}
    </div>
  )

  if (tools.length === 0) return (
    <div style={{ ...MONO, fontSize: 11, color: '#6B7280', padding: '10px 18px' }}>
      No tools reported by this server.
    </div>
  )

  return (
    <div style={{
      borderTop: '1px solid var(--border-light)',
      padding: '12px 18px',
      background: 'var(--bg-light)',
    }}>
      <div style={{
        ...MONO, fontSize: 10, fontWeight: 600,
        letterSpacing: '0.1em', color: '#6B7280', marginBottom: 10,
      }}>
        AVAILABLE TOOLS ({tools.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tools.map(tool => (
          <div key={tool.name} style={{
            padding: '8px 12px',
            background: '#fff',
            border: '1px solid var(--border-light)',
            borderRadius: 6,
          }}>
            <div style={{ ...MONO, fontSize: 12, color: '#1D5FFA', fontWeight: 600 }}>
              {tool.name}
            </div>
            {tool.description && (
              <div style={{ ...SANS, fontSize: 11, color: '#6B7280', marginTop: 2 }}>
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
      background: '#fff',
      border: '1px solid var(--border-light)',
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
          background: server.enabled ? '#10B981' : '#D1D5DB',
        }} />

        {/* Name + URL */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            ...MONO, fontSize: 13, fontWeight: 700,
            color: 'var(--text-dark)', marginBottom: 2,
          }}>
            {server.name}
          </div>
          <div style={{
            ...MONO, fontSize: 11, color: '#6B7280',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {server.url}
          </div>
        </div>

        {/* Last synced */}
        <div style={{
          ...MONO, fontSize: 10, color: '#9CA3AF',
          flexShrink: 0, textAlign: 'right', minWidth: 120,
        }}>
          <div style={{ marginBottom: 1, letterSpacing: '0.05em' }}>LAST SYNCED</div>
          <div style={{ color: '#6B7280' }}>{fmtDate(server.last_synced_at)}</div>
        </div>

        {/* Enabled toggle label */}
        <div style={{
          ...MONO, fontSize: 10, fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 12,
          background: server.enabled ? '#10B98118' : '#F3F4F6',
          color: server.enabled ? '#10B981' : '#9CA3AF',
          border: `1px solid ${server.enabled ? '#10B98140' : '#E5E7EB'}`,
          flexShrink: 0,
        }}>
          {server.enabled ? 'ENABLED' : 'DISABLED'}
        </div>

        {/* Sync button */}
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            ...MONO, fontSize: 11, padding: '5px 12px',
            background: syncing ? '#1D5FFA18' : '#1D5FFA18',
            border: '1px solid #1D5FFA44',
            color: syncing ? '#9CA3AF' : '#1D5FFA',
            borderRadius: 5, cursor: syncing ? 'wait' : 'pointer',
            fontWeight: 600, flexShrink: 0,
          }}
        >
          {syncing ? 'Syncing…' : 'Sync'}
        </button>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          style={{
            ...MONO, fontSize: 11, padding: '5px 10px',
            background: '#EF444418',
            border: '1px solid #EF444440',
            color: '#EF4444',
            borderRadius: 5, cursor: 'pointer',
            fontWeight: 600, flexShrink: 0,
          }}
        >
          Delete
        </button>

        {/* Expand chevron */}
        <span style={{ ...MONO, fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>
          {showTools ? '▲' : '▼'}
        </span>
      </div>

      {/* Sync error */}
      {syncError && (
        <div style={{
          ...MONO, fontSize: 11, color: '#EF4444',
          padding: '6px 18px',
          background: '#EF444408',
          borderTop: '1px solid #EF444425',
        }}>
          Sync error: {syncError}
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
  openai:    { label: 'OpenAI API Key',    color: '#10A37F', envVar: 'OPENAI_API_KEY' },
  anthropic: { label: 'Anthropic API Key', color: '#D97706', envVar: 'ANTHROPIC_API_KEY' },
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
  const meta = PROVIDER_META[status.provider] ?? { label: status.provider, color: '#6B7280', envVar: '' }
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
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ ...MONO, fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 3 }}>
            {meta.label}
          </div>
          {meta.envVar && (
            <div style={{ ...MONO, fontSize: 10, color: '#9CA3AF', letterSpacing: '0.06em' }}>
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
                background: `${meta.color}18`, color: meta.color,
                border: `1px solid ${meta.color}40`,
              }}>CONFIGURED</span>
              <button
                onClick={() => setEditing(true)}
                style={{
                  ...SANS, fontSize: 12, padding: '4px 12px', borderRadius: 6,
                  border: '1px solid var(--border-light)', background: 'var(--bg-light)',
                  color: 'var(--text-secondary)', cursor: 'pointer',
                }}>
                Update
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  ...SANS, fontSize: 12, padding: '4px 10px', borderRadius: 6,
                  border: '1px solid #FCA5A5', background: '#FEF2F2',
                  color: '#DC2626', cursor: 'pointer', opacity: deleting ? 0.6 : 1,
                }}>
                {deleting ? '…' : 'Remove'}
              </button>
            </>
          ) : (
            <>
              <span style={{
                ...MONO, fontSize: 11, fontWeight: 600,
                padding: '3px 10px', borderRadius: 12,
                background: '#F3F4F6', color: '#9CA3AF',
                border: '1px solid #E5E7EB',
              }}>NOT SET</span>
              <button
                onClick={() => setEditing(true)}
                style={{
                  ...SANS, fontSize: 12, padding: '4px 12px', borderRadius: 6,
                  border: `1px solid ${meta.color}60`, background: `${meta.color}10`,
                  color: meta.color, cursor: 'pointer', fontWeight: 600,
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
                  border: error ? '1px solid #EF4444' : '1px solid var(--border-light)',
                  outline: 'none', background: 'var(--bg-page)', color: 'var(--text-dark)',
                }}
              />
              <button
                tabIndex={-1}
                onClick={() => setShowValue(v => !v)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                  color: '#9CA3AF',
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
                border: '1px solid var(--border-light)', background: 'var(--bg-light)',
                color: 'var(--text-secondary)', cursor: 'pointer',
              }}>
              Cancel
            </button>
          </div>
          {error && (
            <div style={{ ...SANS, fontSize: 12, color: '#EF4444', marginTop: 6 }}>{error}</div>
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
        background: '#fff',
        border: '1px solid var(--border-light)',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 16,
      }}>
        {loading ? (
          <div style={{ ...SANS, fontSize: 13, color: '#9CA3AF', padding: '20px 24px' }}>
            Loading…
          </div>
        ) : statuses.length === 0 ? (
          <div style={{ ...SANS, fontSize: 13, color: '#9CA3AF', padding: '20px 24px' }}>
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
        ...SANS, fontSize: 12, color: '#9CA3AF',
        padding: '10px 14px',
        background: 'var(--bg-light)',
        border: '1px solid var(--border-light)',
        borderRadius: 7,
        lineHeight: 1.5,
      }}>
        Keys are encrypted with AES-256 and stored per organisation. They are never returned to the
        browser after saving. If no key is configured here, the server falls back to its environment variable.
      </div>
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
      padding: '36px 48px',
      width: '100%',
      boxSizing: 'border-box',
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
              ...MONO, fontSize: 12, padding: '8px 16px',
              background: showAddForm ? '#1D5FFA33' : '#1D5FFA',
              color: '#fff', border: 'none', borderRadius: 7,
              cursor: 'pointer', fontWeight: 700, flexShrink: 0, marginTop: 2,
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
            ...MONO, fontSize: 12, color: '#EF4444',
            padding: '10px 14px', background: '#EF444415',
            border: '1px solid #EF444440', borderRadius: 7, marginBottom: 12,
          }}>
            {loadError}
          </div>
        )}

        {loading ? (
          <div style={{
            ...MONO, fontSize: 12, color: '#9CA3AF',
            padding: '40px 0', textAlign: 'center',
          }}>
            Loading servers…
          </div>
        ) : servers.length === 0 && !showAddForm ? (
          <div style={{
            textAlign: 'center', padding: '48px 0',
            background: '#fff', border: '1px solid var(--border-light)',
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🔌</div>
            <div style={{ ...MONO, fontSize: 13, color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>
              No MCP servers configured
            </div>
            <div style={{ ...SANS, fontSize: 12, color: '#9CA3AF' }}>
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
      <div style={{
        borderTop: '1px solid var(--border-light)',
        marginBottom: 40,
      }} />

      {/* ── Section 2: API Keys ─────────────────────────────────────────── */}
      <ApiKeysSection />
    </div>
  )
}
