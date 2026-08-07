import { useState, type CSSProperties } from 'react'
import {
  MONO, SANS,
  AUTH_TYPES, authToHeaders, headersToAuth,
  type AuthType,
} from '../lib/settingsUi'

export function AuthPicker({
  initialHeaders,
  onChange,
  inputStyle,
}: {
  initialHeaders: Record<string, string>
  onChange: (headers: Record<string, string>) => void
  inputStyle: CSSProperties
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

  const SEL: CSSProperties = {
    ...SANS, fontSize: 14, padding: '8px 12px',
    backgroundColor: 'var(--bg-page)', color: 'var(--text-heading)',
    border: '1px solid var(--border)', borderRadius: 8,
    cursor: 'pointer', outline: 'none',
    colorScheme: 'dark light',
  }

  const FIELD_LABEL: CSSProperties = {
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
        <div className="settings-auth-fields" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>

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

