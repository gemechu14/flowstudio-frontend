import type { ReactNode } from 'react'
import { SANS } from '../lib/agentsUi'

export function AgentActionBtn({
  children,
  onClick,
  variant = 'neutral',
  disabled,
  iconOnly,
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'neutral' | 'accent' | 'danger' | 'primary'
  disabled?: boolean
  iconOnly?: boolean
}) {
  const styles = {
    neutral: { bg: 'var(--bg-hover)', border: 'var(--border)', color: 'var(--text-secondary)' },
    accent:  { bg: 'var(--bg-hover)', border: 'var(--border)', color: 'var(--text-secondary)' },
    danger:  { bg: 'var(--bg-hover)', border: 'var(--border)', color: 'var(--btn-danger-text)' },
    primary: { bg: 'var(--accent-soft)', border: 'var(--blue-border)', color: 'var(--accent-text)' },
  }[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...SANS, fontSize: 12,
        padding: iconOnly ? '6px 8px' : '6px 12px',
        minWidth: iconOnly ? 32 : undefined,
        minHeight: 32,
        background: disabled ? 'var(--bg-hover)' : styles.bg,
        border: `1px solid ${disabled ? 'var(--border)' : styles.border}`,
        color: disabled ? 'var(--text-tertiary)' : styles.color,
        borderRadius: 999,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 500,
        boxShadow: 'none',
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
