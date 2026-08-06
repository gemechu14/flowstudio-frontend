import { useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { apiFetch } from '../../../shared/api/client'

const SANS = { fontFamily: 'var(--font-sans)' }
const MONO = { fontFamily: 'var(--font-mono)' }

// ── tiny helpers ─────────────────────────────────────────────────────────────

function Label({ children }: { children: string }) {
  return (
    <div style={{
      ...SANS, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
      marginBottom: 6, letterSpacing: '0.02em',
    }}>
      {children}
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text', placeholder = '', readOnly = false,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  type?: string
  placeholder?: string
  readOnly?: boolean
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div style={{ marginBottom: 18 }}>
      <Label>{label}</Label>
      <div style={{ position: 'relative' }}>
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          style={{
            ...SANS, fontSize: 14, width: '100%', boxSizing: 'border-box',
            padding: isPassword ? '10px 40px 10px 14px' : '10px 14px',
            minHeight: 40,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: readOnly ? 'var(--bg-hover)' : 'var(--bg-page)',
            color: readOnly ? 'var(--text-secondary)' : 'var(--text-heading)',
            outline: 'none',
            cursor: readOnly ? 'default' : 'text',
            colorScheme: 'dark light',
          }}
          onFocus={e => {
            if (!readOnly) {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)'
            }
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow(s => !s)}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 2,
              color: 'var(--text-tertiary)',
            }}
          >
            {show ? (
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
        )}
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="profile-card" style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      <div className="profile-card-header" style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        ...SANS, fontSize: 14, fontWeight: 600, color: 'var(--text-heading)',
      }}>
        {title}
      </div>
      <div className="profile-card-body" style={{ padding: 24 }}>
        {children}
      </div>
    </div>
  )
}

function SaveButton({ saving, label = 'Save changes' }: { saving: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      style={{
        ...SANS, fontSize: 13, fontWeight: 600,
        padding: '9px 20px', borderRadius: 8,
        border: '1px solid var(--blue-border)',
        background: 'var(--accent-soft)',
        color: 'var(--accent-text)',
        cursor: saving ? 'not-allowed' : 'pointer',
        opacity: saving ? 0.7 : 1,
      }}
    >
      {saving ? 'Saving…' : label}
    </button>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, setUser } = useAuth()

  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName] = useState(user?.last_name ?? '')
  const [infoSaving, setInfoSaving] = useState(false)
  const [infoMsg, setInfoMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleInfoSave(e: React.FormEvent) {
    e.preventDefault()
    setInfoSaving(true); setInfoMsg(null)
    try {
      const updated = await apiFetch<{ first_name: string; last_name: string; email: string; role: string; tenant_id: string; user_id: string; org_name: string }>('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ first_name: firstName, last_name: lastName }),
      })
      setUser({ ...user!, first_name: updated.first_name, last_name: updated.last_name })
      setInfoMsg({ ok: true, text: 'Profile updated.' })
    } catch (e: any) {
      setInfoMsg({ ok: false, text: e.message ?? 'Failed to save.' })
    } finally { setInfoSaving(false) }
  }

  async function handlePwSave(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    if (newPw.length < 8) { setPwMsg({ ok: false, text: 'New password must be at least 8 characters.' }); return }
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: 'Passwords do not match.' }); return }
    setPwSaving(true)
    try {
      await apiFetch('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setPwMsg({ ok: true, text: 'Password changed successfully.' })
    } catch (e: any) {
      setPwMsg({ ok: false, text: e.message ?? 'Failed to change password.' })
    } finally { setPwSaving(false) }
  }

  const initials = (user?.first_name && user?.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`
    : user?.email?.[0] ?? '?').toUpperCase()

  const displayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.email ?? ''

  return (
    <div
      className="profile-page"
      style={{
      padding: '32px 36px',
      background: 'var(--bg-surface)',
      minHeight: '100%',
      boxSizing: 'border-box',
      ...SANS,
    }}>
      <div className="profile-hero" style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--accent-soft)', border: '2px solid var(--blue-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          ...MONO, fontSize: 22, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="profile-hero-name" style={{ ...SANS, fontSize: 22, fontWeight: 700, color: 'var(--text-heading)', wordBreak: 'break-word' }}>
            {displayName}
          </div>
          <div style={{ ...SANS, fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {user?.role?.replace('_', ' ')} · {user?.org_name}
          </div>
        </div>
      </div>

      <Card title="Personal information">
        <form onSubmit={handleInfoSave} style={{ maxWidth: 680 }}>
          <div className="profile-name-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <Field label="First name" value={firstName} onChange={setFirstName} placeholder="First name" />
            <Field label="Last name" value={lastName} onChange={setLastName} placeholder="Last name" />
          </div>
          <Field label="Email address" value={user?.email ?? ''} readOnly />
          <div style={{ ...SANS, fontSize: 12, color: 'var(--text-tertiary)', marginTop: -10, marginBottom: 20 }}>
            Email cannot be changed. Contact your administrator if needed.
          </div>
          <div className="profile-form-actions" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <SaveButton saving={infoSaving} />
            {infoMsg && (
              <span style={{
                ...SANS, fontSize: 13,
                color: infoMsg.ok ? 'var(--verified)' : 'var(--invalid)',
              }}>
                {infoMsg.ok ? '✓ ' : '✗ '}{infoMsg.text}
              </span>
            )}
          </div>
        </form>
      </Card>

      <Card title="Change password">
        <form onSubmit={handlePwSave} style={{ maxWidth: 480, width: '100%' }}>
          <Field label="Current password" value={currentPw} onChange={setCurrentPw} type="password" placeholder="Enter current password" />
          <Field label="New password" value={newPw} onChange={setNewPw} type="password" placeholder="Minimum 8 characters" />
          <Field label="Confirm new password" value={confirmPw} onChange={setConfirmPw} type="password" placeholder="Repeat new password" />
          <div className="profile-form-actions" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <SaveButton saving={pwSaving} label="Change password" />
            {pwMsg && (
              <span style={{
                ...SANS, fontSize: 13,
                color: pwMsg.ok ? 'var(--verified)' : 'var(--invalid)',
              }}>
                {pwMsg.ok ? '✓ ' : '✗ '}{pwMsg.text}
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}
