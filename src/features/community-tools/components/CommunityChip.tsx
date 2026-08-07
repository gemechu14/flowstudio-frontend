import { MONO } from '../lib/communityToolsUi'

export function CommunityChip({
  label,
  tone = 'neutral',
}: {
  label: string
  tone?: 'neutral' | 'accent' | 'muted' | 'danger'
}) {
  const tones = {
    neutral: { color: 'var(--text-secondary)', bg: 'var(--bg-hover)', border: 'var(--border)' },
    accent:  { color: 'var(--accent)', bg: 'var(--accent-soft)', border: 'var(--blue-border)' },
    muted:   { color: 'var(--text-tertiary)', bg: 'var(--bg-hover)', border: 'var(--border)' },
    danger:  { color: 'var(--invalid)', bg: 'var(--invalid-dim)', border: 'rgba(239,68,68,0.28)' },
  }[tone]
  return (
    <span style={{
      ...MONO, fontSize: 10, padding: '2px 8px', borderRadius: 4,
      background: tones.bg, color: tones.color, border: `1px solid ${tones.border}`,
      fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap', textTransform: 'uppercase',
    }}>{label}</span>
  )
}
