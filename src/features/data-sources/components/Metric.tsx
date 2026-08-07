import { MONO } from '../lib/dataSourcesUi'

export function Metric({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="ds-metric" style={{
      padding: '10px 16px', borderRadius: 8, background: 'var(--card-bg)',
      border: '1px solid var(--border)', minWidth: 88, flex: 1,
      boxShadow: '0 1px 3px rgba(11,16,32,0.05)',
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, ...MONO, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-secondary)', ...MONO }}>{label}</div>
    </div>
  )
}
