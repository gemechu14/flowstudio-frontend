import type { ReactNode } from 'react'
import { MONO } from '../lib/dataSourcesUi'

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(11,16,32,0.05)' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--text-secondary)', ...MONO }}>
          {title}
        </span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}
