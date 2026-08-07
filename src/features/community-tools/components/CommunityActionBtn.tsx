import type { ReactNode } from 'react'
import { SANS } from '../lib/communityToolsUi'

export function CommunityActionBtn({
  children,
  onClick,
  variant = 'neutral',
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'neutral' | 'accent' | 'primary' | 'danger'
  disabled?: boolean
}) {
  const styles = {
    neutral: { bg: 'var(--bg-hover)', border: 'var(--border)', color: 'var(--text-secondary)' },
    accent:  { bg: 'var(--accent)', border: 'var(--accent)', color: 'var(--btn-upload-text)' },
    primary: { bg: 'var(--accent)', border: 'var(--accent)', color: 'var(--btn-upload-text)' },
    danger:  { bg: 'var(--bg-hover)', border: 'var(--border)', color: 'var(--btn-danger-text)' },
  }[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...SANS, fontSize: 12,
        padding: '6px 12px',
        minHeight: 32,
        background: disabled ? 'var(--bg-hover)' : styles.bg,
        border: `1px solid ${disabled ? 'var(--border)' : styles.border}`,
        color: disabled ? 'var(--text-tertiary)' : styles.color,
        borderRadius: 999,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        lineHeight: 1,
        opacity: disabled ? 0.55 : 1,
      }}
    >{children}</button>
  )
}
