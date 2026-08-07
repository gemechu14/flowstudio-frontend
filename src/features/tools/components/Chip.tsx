import { MONO } from '../lib/toolsUi'

export function Chip({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' | 'success' | 'muted' }) {
  const tones = {
    neutral: { color: 'var(--text-secondary)', bg: 'var(--btn-neutral-bg)', border: 'var(--border)' },
    // Approved: primary text only
    accent:  { color: 'var(--accent)', bg: 'transparent', border: 'transparent' },
    success: { color: 'var(--accent)', bg: 'transparent', border: 'transparent' },
    muted:   { color: 'var(--text-tertiary)', bg: 'var(--btn-neutral-bg)', border: 'var(--border)' },
  }[tone]
  return (
    <span
      className={tone === 'accent' || tone === 'success' ? 'tools-status-chip tools-status-chip--approved' : 'tools-status-chip'}
      style={{
      ...MONO, fontSize: 10, padding: tone === 'accent' || tone === 'success' ? '2px 0' : '2px 8px', borderRadius: 4,
      background: tones.bg, color: tones.color, border: `1px solid ${tones.border}`,
      fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap', textTransform: 'uppercase',
    }}>{label}</span>
  )
}
