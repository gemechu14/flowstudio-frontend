import { useEffect } from 'react'

interface ConfirmModalProps {
  message: string
  confirmLabel?: string
  confirmColor?: string
  error?: string
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmModal({
  message,
  confirmLabel = 'Delete',
  confirmColor = '#EF4444',
  error,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, onConfirm])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 400, background: 'var(--bg-card)',
          borderRadius: 12, border: '1px solid var(--border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
          padding: '28px 28px 22px',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: `${confirmColor}18`,
          border: `1px solid ${confirmColor}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke={confirmColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </div>

        {/* Message */}
        <div style={{
          fontSize: 14, color: 'var(--text-dark)', fontWeight: 600,
          lineHeight: 1.5, marginBottom: 22,
        }}>
          {message}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            fontSize: 12, color: '#EF4444', marginBottom: 14,
            padding: '8px 10px', background: '#EF444410',
            border: '1px solid #EF444430', borderRadius: 6,
          }}>
            {error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              fontSize: 13, padding: '8px 18px',
              background: 'var(--bg-page)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', borderRadius: 7, cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              fontSize: 13, padding: '8px 18px',
              background: confirmColor, border: 'none',
              color: '#fff', borderRadius: 7, cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
