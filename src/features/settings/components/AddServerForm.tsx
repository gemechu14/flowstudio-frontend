import { useState } from 'react'
import { createMcpServer, type McpServer } from '../api/mcpServers.api'
import { AuthPicker } from './AuthPicker'
import { MONO, SANS } from '../lib/settingsUi'

export function AddServerForm({ onCreated, onCancel }: {
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
    color: 'var(--text-heading)',
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
      <div className="settings-add-fields" style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div className="settings-add-name" style={{ flex: '0 0 200px' }}>
          <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>NAME</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="my-mcp-server"
            style={{ ...inputStyle, width: '100%' }}
            autoFocus
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
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
            background: 'var(--accent)',
            color: 'var(--btn-upload-text)', border: '1px solid var(--accent)', borderRadius: 999,
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

