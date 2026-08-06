import type { ReactNode } from 'react'
import { MONO } from '../lib/agentsUi'

export function AgentTag({ children }: { children: ReactNode }) {
  return (
    <span style={{
      ...MONO, fontSize: 11, color: 'var(--text-secondary)',
      background: 'var(--bg-hover)', border: '1px solid var(--border)',
      borderRadius: 4, padding: '2px 8px',
    }}>
      {children}
    </span>
  )
}
