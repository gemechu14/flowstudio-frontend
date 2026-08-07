import type { DataSourceRecord } from '../api/dataSources.api'
import { TypeIcon } from './TypeBadge'
import { MONO, TYPE_META } from '../lib/dataSourcesUi'

export function SourceItem({ source, active, onClick }: { source: DataSourceRecord; active: boolean; onClick: () => void }) {
  const t = TYPE_META[source.source_type]
  return (
    <button
      className={`ds-source-item${active ? ' is-active' : ''}`}
      onClick={onClick}
      style={{
      display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
      padding: '10px 16px', cursor: 'pointer',
      borderLeft: `2px solid ${active ? t.color : 'transparent'}`,
      borderTop: 'none', borderRight: 'none',
      borderBottom: '1px solid var(--border)',
      background: active ? t.dim : 'transparent',
      transition: 'all 0.12s',
    }}>
      <TypeIcon type={source.source_type} size={13} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--text-heading)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {source.name}
        </div>
        <div style={{ fontSize: 10.5, color: active ? t.color : 'var(--text-tertiary)', ...MONO, marginTop: 1 }}>
          {t.label}
        </div>
      </div>
    </button>
  )
}
