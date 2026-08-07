import type { CSSProperties } from 'react'

export const MONO: CSSProperties = { fontFamily: 'var(--font-mono)' }
export const SANS: CSSProperties = { fontFamily: 'var(--font-sans)' }

export const TYPE_META = {
  document: { label: 'Document', color: 'var(--accent)', dim: 'var(--accent-soft)', border: 'var(--blue-border)' },
  database: { label: 'Database', color: 'var(--accent)', dim: 'var(--accent-soft)', border: 'var(--blue-border)' },
  website:  { label: 'Website',  color: 'var(--accent)', dim: 'var(--accent-soft)', border: 'var(--blue-border)' },
} as const

export type DbDialect = 'postgresql' | 'mysql' | 'sqlite' | 'mssql'

export const DIALECTS: { id: DbDialect; label: string; placeholder: string; icon: string }[] = [
  { id: 'postgresql', label: 'PostgreSQL', placeholder: 'postgresql://user:pass@host:5432/db',  icon: '🐘' },
  { id: 'mysql',      label: 'MySQL',      placeholder: 'mysql+pymysql://user:pass@host:3306/db', icon: '🐬' },
  { id: 'sqlite',     label: 'SQLite',     placeholder: 'sqlite:///path/to/file.db',              icon: '📦' },
  { id: 'mssql',      label: 'SQL Server', placeholder: 'mssql+pymssql://user:pass@host/db',      icon: '🗄' },
]

export const CRAWL_SCHEDULES = [
  { id: 'manual', label: 'Manual only' },
  { id: 'daily',  label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
]

export const DEFAULT_PORTS: Record<DbDialect, string> = {
  postgresql: '5432',
  mysql: '3306',
  sqlite: '',
  mssql: '1433',
}

export const Ic = {
  Doc: ({ s = 16 }: { s?: number }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M9 1v5h5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M5 9h6M5 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  DB: ({ s = 16 }: { s?: number }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <ellipse cx="8" cy="4.5" rx="5.5" ry="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M2.5 4.5v4c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2v-4" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M2.5 8.5v3c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2v-3" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  Web: ({ s = 16 }: { s?: number }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 2C8 2 5.5 4.5 5.5 8S8 14 8 14M8 2c0 0 2.5 2.5 2.5 6S8 14 8 14" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M2 8h12" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  Upload: () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 14V4M11 4L7.5 7.5M11 4l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 15.5v1.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1.5 3.5h11M5 3.5V2h4v1.5M5.5 6v4.5M8.5 6v4.5M2.5 3.5l.5 8.5h8l.5-8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Check: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 7l3.5 3.5L11 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}
