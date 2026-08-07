import { MONO } from '../lib/dataSourcesUi'

export function Notice({ ok, msg, onDismiss }: { ok: boolean; msg: string; onDismiss: () => void }) {
  const color = ok ? 'var(--accent)' : 'var(--invalid)'
  const bg = ok ? 'var(--accent-soft)' : 'var(--invalid-dim)'
  const border = ok ? 'var(--blue-border)' : 'rgba(239,68,68,0.2)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: bg, border: `1px solid ${border}` }}>
      <span style={{ fontSize: 14, color }}>{ok ? '✓' : '✗'}</span>
      <span style={{ flex: 1, fontSize: 13, color, ...MONO }}>{msg}</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color, fontSize: 16, lineHeight: 1, opacity: 0.6 }}>×</button>
    </div>
  )
}
