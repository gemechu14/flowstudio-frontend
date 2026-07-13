import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let user
      if (mode === 'login') {
        user = await login(email, password)
      } else {
        if (!orgName.trim()) { setError('Organization name is required'); setLoading(false); return }
        user = await register({ org_name: orgName, email, password, first_name: firstName, last_name: lastName })
      }
      setUser(user)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff',
    fontSize: 14, fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box',
  }
  const label: React.CSSProperties = {
    display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)',
    fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase',
  }

  return (
    <div style={{
      minHeight: '100vh', width: '100vw', background: 'var(--bg-dark)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 420, padding: 40, background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Logo */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: '#fff', letterSpacing: '0.12em' }}>
            CRESTWARD LABS
            <span style={{ display: 'inline-block', width: 8, height: 14, background: 'var(--blue)', marginLeft: 3, borderRadius: 1, verticalAlign: 'middle' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginTop: 4, textTransform: 'uppercase' }}>
            Agentic Platform
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', marginBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              style={{
                flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: mode === m ? 'var(--blue)' : 'rgba(255,255,255,0.4)',
                borderBottom: mode === m ? '2px solid var(--blue)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s',
              }}
            >{m === 'login' ? 'Sign In' : 'Create Account'}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'register' && (
            <>
              <div>
                <label style={label}>Organization Name</label>
                <input style={inp} value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Acme Corp" required />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>First Name</label>
                  <input style={inp} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>Last Name</label>
                  <input style={inp} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
                </div>
              </div>
            </>
          )}
          <div>
            <label style={label}>Email</label>
            <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div>
            <label style={label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inp, paddingRight: 40 }}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(s => !s)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                  color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center',
                }}
              >
                {showPassword ? (
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
          </div>

          {error && (
            <div style={{ color: '#f87171', fontSize: 13, fontFamily: 'var(--font-mono)', background: 'rgba(248,113,113,0.1)', padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.2)' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            padding: '11px 0', background: loading ? 'rgba(29,95,250,0.5)' : 'var(--blue)',
            border: 'none', borderRadius: 6, color: '#fff', fontSize: 14, fontWeight: 600,
            fontFamily: 'var(--font-sans)', cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.15s', marginTop: 4,
          }}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
