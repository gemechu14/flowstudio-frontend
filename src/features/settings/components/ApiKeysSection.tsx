import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ConfirmModal from '../../../shared/components/ui/ConfirmModal'
import { type KeyStatus, listApiKeys, saveApiKey, deleteApiKey } from '../api/apiKeys.api'
import { queryKeys } from '../../../shared/api/queryKeys'
import { SectionHeading } from './SectionHeading'
import { MONO, SANS, PROVIDER_META } from '../lib/settingsUi'

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
    <div className="settings-apikey-row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
      <div className="settings-apikey-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ ...MONO, fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 3 }}>
            {meta.label}
          </div>
          {meta.envVar && (
            <div style={{ ...MONO, fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>
              {meta.envVar}
            </div>
          )}
        </div>

        <div className="settings-apikey-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                  border: '1px solid var(--border)', background: 'var(--bg-hover)',
                  color: 'var(--text-secondary)', cursor: 'pointer',
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
                  border: '1px solid var(--accent)', background: 'var(--accent)',
                  color: 'var(--btn-upload-text)', cursor: 'pointer', fontWeight: 600,
                }}>
                Set Key
              </button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
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
                  outline: 'none', background: 'var(--bg-page)', color: 'var(--text-heading)',
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
                border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--btn-upload-text)',
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

export function ApiKeysSection() {
  const queryClient = useQueryClient()

  const { data: statuses = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.apiKeys,
    queryFn: () => listApiKeys().catch(() => [] as KeyStatus[]),
  })

  const reload = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys })
  }

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

