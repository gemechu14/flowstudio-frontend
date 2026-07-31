import { useEffect, useState } from 'react'
import { listEnvVars, saveEnvVar, deleteEnvVar } from '../../api/toolEnvVars'

const MONO = { fontFamily: 'var(--font-mono)' }
const SANS = { fontFamily: 'var(--font-sans)' }

function SavedKeyRow({ keyName, toolId, onDelete }: {
  keyName: string
  toolId: string
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleUpdate() {
    if (!newValue.trim()) return
    setSaving(true); setError('')
    try {
      await saveEnvVar(toolId, keyName, newValue.trim())
      setEditing(false)
      setNewValue('')
    } catch {
      setError('Failed to update.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      ...MONO, fontSize: 11,
      background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 6,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 10px',
      }}>
        <span style={{ color: 'var(--text-primary)' }}>{keyName}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!editing && (
            <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>••••••••</span>
          )}
          <button
            onClick={() => { setEditing(v => !v); setNewValue(''); setError('') }}
            style={{
              background: 'none', border: 'none',
              color: editing ? 'var(--text-tertiary)' : 'var(--accent)',
              cursor: 'pointer', fontSize: 11, padding: '0 2px', ...SANS,
            }}
          >
            {editing ? 'cancel' : 'edit'}
          </button>
          <button
            onClick={onDelete}
            style={{
              background: 'none', border: 'none', color: 'var(--invalid)',
              cursor: 'pointer', fontSize: 12, padding: '0 2px',
            }}
          >✕</button>
        </span>
      </div>

      {editing && (
        <div style={{ padding: '0 8px 8px', display: 'flex', gap: 6 }}>
          <input
            autoFocus
            type="password"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUpdate()}
            placeholder="new value"
            style={{
              flex: 1, ...MONO, fontSize: 11, padding: '5px 8px',
              background: 'var(--card-bg)', color: 'var(--text-primary)',
              border: '1px solid var(--border)', borderRadius: 6, outline: 'none',
            }}
          />
          <button
            onClick={handleUpdate}
            disabled={saving || !newValue.trim()}
            style={{
              background: 'var(--accent)', border: 'none', color: '#fff',
              borderRadius: 6, padding: '5px 12px', cursor: saving ? 'wait' : 'pointer',
              ...SANS, fontSize: 12, fontWeight: 600,
              opacity: !newValue.trim() ? 0.4 : 1,
            }}
          >
            {saving ? '...' : 'Update'}
          </button>
        </div>
      )}

      {error && (
        <div style={{ ...SANS, fontSize: 11, color: 'var(--invalid)', padding: '0 8px 6px' }}>{error}</div>
      )}
    </div>
  )
}

export function ToolEnvVarsEditor({ toolId }: { toolId: string }) {
  const [keys, setKeys] = useState<string[]>([])
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listEnvVars(toolId).then(rows => setKeys(rows.map(r => r.key_name))).catch(() => {})
  }, [toolId])

  async function handleSave() {
    if (!newKey.trim() || !newValue.trim()) return
    setSaving(true); setError('')
    try {
      await saveEnvVar(toolId, newKey.trim(), newValue.trim())
      setKeys(prev => prev.includes(newKey.trim()) ? prev : [...prev, newKey.trim()])
      setNewKey('')
      setNewValue('')
    } catch {
      setError('Failed to save variable.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(key: string) {
    try {
      await deleteEnvVar(toolId, key)
      setKeys(prev => prev.filter(k => k !== key))
    } catch {
      setError('Failed to delete variable.')
    }
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 8, letterSpacing: '0.1em' }}>
        ENV VARIABLES
      </div>

      {keys.length > 0 && (
        <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {keys.map(k => (
            <SavedKeyRow
              key={k}
              keyName={k}
              toolId={toolId}
              onDelete={() => handleDelete(k)}
            />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          placeholder="KEY_NAME"
          style={{
            ...MONO, fontSize: 11, flex: 1,
            background: 'var(--card-bg)', color: 'var(--text-primary)',
            border: '1px solid var(--border)', borderRadius: 6,
            padding: '6px 8px', outline: 'none',
          }}
        />
        <input
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          placeholder="value"
          type="password"
          style={{
            ...MONO, fontSize: 11, flex: 2,
            background: 'var(--card-bg)', color: 'var(--text-primary)',
            border: '1px solid var(--border)', borderRadius: 6,
            padding: '6px 8px', outline: 'none',
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving || !newKey.trim() || !newValue.trim()}
          style={{
            background: 'var(--btn-accent-bg)', border: '1px solid var(--btn-accent-border)',
            color: 'var(--btn-accent-text)',
            borderRadius: 6, padding: '6px 12px', cursor: saving ? 'wait' : 'pointer',
            ...SANS, fontSize: 12, fontWeight: 600,
            opacity: !newKey.trim() || !newValue.trim() ? 0.4 : 1,
          }}
        >
          {saving ? '...' : 'Save'}
        </button>
      </div>

      {error && (
        <div style={{ ...SANS, fontSize: 11, color: 'var(--invalid)', marginTop: 4 }}>{error}</div>
      )}
    </div>
  )
}
