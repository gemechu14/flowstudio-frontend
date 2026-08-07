import type { SourceType } from '../api/dataSources.api'
import { Ic, MONO, TYPE_META } from '../lib/dataSourcesUi'

export function TypeBadge({ type }: { type: SourceType }) {
  const t = TYPE_META[type]
  const Icon = type === 'document' ? Ic.Doc : type === 'database' ? Ic.DB : Ic.Web
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px',
      borderRadius: 5, ...MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
      background: t.dim, color: t.color, border: `1px solid ${t.border}`,
    }}>
      <Icon s={11} /> {t.label}
    </span>
  )
}

export function TypeIcon({ type, size = 14 }: { type: SourceType; size?: number }) {
  const t = TYPE_META[type]
  const Icon = type === 'document' ? Ic.Doc : type === 'database' ? Ic.DB : Ic.Web
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size + 12, height: size + 12, borderRadius: 7, flexShrink: 0,
      background: t.dim, border: `1px solid ${t.border}`, color: t.color,
    }}>
      <Icon s={size} />
    </span>
  )
}
