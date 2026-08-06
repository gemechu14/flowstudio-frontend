import { useState } from 'react'

export default function BackendErrorScreen({ onRetry }: { onRetry: () => void }) {
  const [retrying, setRetrying] = useState(false)

  async function handleRetry() {
    setRetrying(true)
    onRetry()
    setTimeout(() => setRetrying(false), 3000)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg-dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{ maxWidth: 440, width: '100%', padding: '0 24px', textAlign: 'center' }}>
        {/* Icon */}
        <div style={{ marginBottom: 28 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: 0.35 }}>
            <circle cx="24" cy="24" r="22" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
            <path d="M16 32 Q24 18 32 32" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <circle cx="24" cy="14" r="2" fill="rgba(255,255,255,0.6)" />
            <line x1="24" y1="18" x2="24" y2="26" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="8" x2="40" y2="40" stroke="rgba(248,113,113,0.7)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Headline */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'rgba(248,113,113,0.8)', marginBottom: 12,
        }}>
          Connection Error
        </div>
        <h1 style={{
          fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.9)',
          margin: '0 0 12px', lineHeight: 1.3,
        }}>
          Unable to reach the server
        </h1>
        <p style={{
          fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6,
          margin: '0 0 32px',
        }}>
          FlowStudio cannot connect to its backend. The server may be starting up,
          temporarily unavailable, or unreachable from your network.
        </p>

        {/* Checklist */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, padding: '16px 20px', marginBottom: 28, textAlign: 'left',
        }}>
          {[
            'Verify the backend service is running',
            'Check your network connection',
            'Confirm the API URL is correct',
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, color: 'rgba(255,255,255,0.45)',
              padding: i > 0 ? '8px 0 0' : '0',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
              {item}
            </div>
          ))}
        </div>

        {/* Retry button */}
        <button
          onClick={handleRetry}
          disabled={retrying}
          style={{
            padding: '10px 28px',
            background: retrying ? 'rgba(29,95,250,0.4)' : 'var(--blue)',
            border: 'none', borderRadius: 6, color: '#fff',
            fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em', cursor: retrying ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.15s',
          }}
        >
          {retrying ? 'Retrying...' : 'Retry Connection'}
        </button>

        {/* Footer */}
        <div style={{
          marginTop: 36, fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          FLOWSTUDIO · Powered by Crestward Labs
        </div>
      </div>
    </div>
  )
}
