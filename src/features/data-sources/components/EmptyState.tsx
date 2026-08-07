import type { SourceType } from '../api/dataSources.api'
import { Ic, TYPE_META } from '../lib/dataSourcesUi'

export function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, paddingBottom: 60 }}>
      <div style={{
        width: 68, height: 68, borderRadius: 16, background: 'var(--bg-hover)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <path d="M13 2v22M2 13h22" stroke="var(--border)" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="13" cy="13" r="9" stroke="var(--border)" strokeWidth="1.5"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 6 }}>No source selected</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 280, lineHeight: 1.6 }}>
          Connect documents, databases, or websites to give your agents grounded knowledge.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        {(['document', 'database', 'website'] as SourceType[]).map(t => (
          <button key={t} onClick={onNew} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            borderRadius: 7, border: '1px solid var(--accent)',
            background: 'var(--accent)', color: 'var(--btn-upload-text)',
            cursor: 'pointer', fontSize: 12.5, fontWeight: 500,
          }}>
            {t === 'document' ? <Ic.Doc s={13} /> : t === 'database' ? <Ic.DB s={13} /> : <Ic.Web s={13} />}
            {TYPE_META[t].label}
          </button>
        ))}
      </div>
    </div>
  )
}
