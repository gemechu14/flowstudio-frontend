export type BadgeStatus = 'verified' | 'untested' | 'invalid'

interface BadgeProps {
  status: BadgeStatus
  size?: 'sm' | 'md'
}

const STATUS_CONFIG: Record<BadgeStatus, { label: string; color: string; bg: string; symbol: string }> = {
  verified: {
    label: 'verified',
    color: 'var(--verified)',
    bg: 'var(--verified-dim)',
    symbol: '●',
  },
  untested: {
    label: 'untested',
    color: 'var(--untested)',
    bg: 'var(--untested-dim)',
    symbol: '◐',
  },
  invalid: {
    label: 'invalid',
    color: 'var(--invalid)',
    bg: 'var(--invalid-dim)',
    symbol: '✗',
  },
}

export default function Badge({ status, size = 'md' }: BadgeProps) {
  const config = STATUS_CONFIG[status]
  const isSmall = size === 'sm'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: isSmall ? '2px 7px' : '3px 9px',
        borderRadius: 20,
        background: config.bg,
        border: `1px solid ${config.color}30`,
        fontFamily: 'var(--font-mono)',
        fontSize: isSmall ? 10 : 11,
        fontWeight: 600,
        color: config.color,
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: isSmall ? 9 : 10 }}>{config.symbol}</span>
      {config.label}
    </span>
  )
}
