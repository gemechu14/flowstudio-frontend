import { MONO } from '../lib/toolsUi'

export function Chip({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' | 'success' | 'muted' }) {
  const tones = {
    neutral: { color: 'var(--text-secondary)', bg: 'var(--bg-hover)', border: 'var(--border)' },
    accent:  { color: 'var(--accent)', bg: 'var(--accent-soft)', border: 'var(--blue-border)' },
    success: { color: 'var(--verified)', bg: 'var(--verified-dim)', border: 'rgba(34,197,94,0.25)' },
    muted:   { color: 'var(--text-tertiary)', bg: 'var(--bg-hover)', border: 'var(--border)' },
  }[tone]
  return (
    <span style={{
      ...MONO, fontSize: 10, padding: '2px 8px', borderRadius: 4,
      background: tones.bg, color: tones.color, border: `1px solid ${tones.border}`,
      fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap', textTransform: 'uppercase',
    }}>{label}</span>
  )
}
