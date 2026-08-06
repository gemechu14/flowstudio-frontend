import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ConfirmModal from '../../../shared/components/ui/ConfirmModal'
import { FilterBuilder, conditionsToSql, sqlToConditions, Condition } from '../../../shared/components/ui/FilterBuilder'
import {
  DataSourceRecord, SourceType, CreateDataSourcePayload, TableInfo,
  listDataSources, createDataSource, updateDataSource, deleteDataSource,
  testConnection, uploadDocument, listFiles,
  deleteFile, crawlWebsite, FileInfo, schemaFromUrl,
} from '../../data-sources/api/dataSources.api'
import { AgentRecord, listAgents } from '../../agents/api/agents.api'
import { queryKeys } from '../../../shared/api/queryKeys'

// ─── design tokens ────────────────────────────────────────────────────────────

const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)' }

const SANS: React.CSSProperties = { fontFamily: 'var(--font-sans)' }

const TYPE_META = {
  document: { label: 'Document', color: 'var(--accent)', dim: 'var(--accent-soft)', border: 'var(--blue-border)' },
  database: { label: 'Database', color: 'var(--accent)', dim: 'var(--accent-soft)', border: 'var(--blue-border)' },
  website:  { label: 'Website',  color: 'var(--accent)', dim: 'var(--accent-soft)', border: 'var(--blue-border)' },
}

// ─── icons ────────────────────────────────────────────────────────────────────

const Ic = {
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

// ─── shared atoms ─────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: SourceType }) {
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

function TypeIcon({ type, size = 14 }: { type: SourceType; size?: number }) {
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

// ─── create modal ─────────────────────────────────────────────────────────────

type DbDialect = 'postgresql' | 'mysql' | 'sqlite' | 'mssql'

const DIALECTS: { id: DbDialect; label: string; placeholder: string; icon: string }[] = [
  { id: 'postgresql', label: 'PostgreSQL', placeholder: 'postgresql://user:pass@host:5432/db',  icon: '🐘' },
  { id: 'mysql',      label: 'MySQL',      placeholder: 'mysql+pymysql://user:pass@host:3306/db', icon: '🐬' },
  { id: 'sqlite',     label: 'SQLite',     placeholder: 'sqlite:///path/to/file.db',              icon: '📦' },
  { id: 'mssql',      label: 'SQL Server', placeholder: 'mssql+pymssql://user:pass@host/db',      icon: '🗄' },
]

const CRAWL_SCHEDULES = [
  { id: 'manual', label: 'Manual only' },
  { id: 'daily',  label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
]

function CreateModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (src: DataSourceRecord) => void
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [type, setType] = useState<SourceType>('document')
  const [dialect, setDialect] = useState<DbDialect>('postgresql')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dbHost, setDbHost] = useState('')
  const [dbPort, setDbPort] = useState('')
  const [dbName, setDbName] = useState('')
  const [dbUser, setDbUser] = useState('')
  const [dbPass, setDbPass] = useState('')
  const [seedUrl, setSeedUrl] = useState('')
  const [crawlSchedule, setCrawlSchedule] = useState('manual')
  const [maxPages, setMaxPages] = useState(7)
  const [allowExternal, setAllowExternal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // DB access control state
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [schemaTables, setSchemaTables] = useState<TableInfo[]>([])
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set())
  const [columnRedactions, setColumnRedactions] = useState<Record<string, Set<string>>>({})
  const [rowFilters, setRowFilters] = useState<Record<string, Condition[]>>({})
  const [tableSearch, setTableSearch] = useState('')
  const [addColTable, setAddColTable] = useState<string | null>(null)
  const [addColSearch, setAddColSearch] = useState('')
  const DEFAULT_PORTS: Record<DbDialect, string> = { postgresql: '5432', mysql: '3306', sqlite: '', mssql: '1433' }

  const buildConnectionUrl = (): string => {
    if (dialect === 'sqlite') return dbName ? `sqlite:///${dbName}` : ''
    const scheme = dialect === 'postgresql' ? 'postgresql' : dialect === 'mysql' ? 'mysql+pymysql' : 'mssql+pymssql'
    const auth = dbUser ? (dbPass ? `${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPass)}@` : `${encodeURIComponent(dbUser)}@`) : ''
    const port = dbPort ? `:${dbPort}` : ''
    const host = dbHost || 'localhost'
    const db = dbName ? `/${dbName}` : ''
    return `${scheme}://${auth}${host}${port}${db}`
  }

  const handleDialectChange = (d: DbDialect) => {
    setDialect(d)
    setDbPort(DEFAULT_PORTS[d])
  }

  const handleTestAndNext = async () => {
    if (!name.trim()) { setError('Name is required.'); return }
    if (dialect !== 'sqlite' && !dbHost.trim()) { setError('Host is required.'); return }
    if (!dbName.trim()) { setError('Database name / path is required.'); return }
    setSchemaLoading(true); setError('')
    try {
      const res = await schemaFromUrl(buildConnectionUrl())
      setSchemaTables(res.tables)
      setSelectedTables(new Set(res.tables.map(t => t.name)))
      setColumnRedactions({})
      setRowFilters({})
      setStep(3)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not connect to database.')
    } finally {
      setSchemaLoading(false)
    }
  }

  const toggleTable = (tname: string) => {
    setSelectedTables(prev => {
      const next = new Set(prev)
      if (next.has(tname)) {
        next.delete(tname)
        setColumnRedactions(r => { const n = { ...r }; delete n[tname]; return n })
        setRowFilters(f => { const n = { ...f }; delete n[tname]; return n })
      } else {
        next.add(tname)
      }
      return next
    })
  }

  const addRedaction = (tname: string, col: string) => {
    setColumnRedactions(prev => {
      const set = new Set(prev[tname] ?? [])
      set.add(col)
      return { ...prev, [tname]: set }
    })
  }
  const removeRedaction = (tname: string, col: string) => {
    setColumnRedactions(prev => {
      const set = new Set(prev[tname] ?? [])
      set.delete(col)
      return { ...prev, [tname]: set }
    })
  }

  const selectedTableObjects = schemaTables.filter(t => selectedTables.has(t.name))
  const filteredTables = schemaTables.filter(t => !tableSearch || t.name.toLowerCase().includes(tableSearch.toLowerCase()))

  const handleCreate = async () => {
    if (!name.trim()) { setError('Name is required.'); return }
    if (type === 'website' && !seedUrl.trim()) { setError('Seed URL is required.'); return }
    setSaving(true); setError('')
    try {
      const payload: CreateDataSourcePayload = {
        name: name.trim(), description, source_type: type,
        ...(type === 'database' ? {
          connection_url: buildConnectionUrl(),
          allowed_tables: [...selectedTables],
          column_redactions: Object.fromEntries(
            Object.entries(columnRedactions).map(([t, cols]) => [t, [...cols]])
          ),
          row_filters: Object.fromEntries(
            Object.entries(rowFilters).map(([t, conds]) => {
              const tbl = schemaTables.find(x => x.name === t)
              return [t, conditionsToSql(conds, tbl?.columns ?? [])]
            }).filter(([, sql]) => sql)
          ),
        } : {}),
        ...(type === 'website' ? { seed_url: seedUrl, crawl_schedule: crawlSchedule, max_pages: maxPages, allow_external: allowExternal } : {}),
      }
      onCreated(await createDataSource(payload))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create.'); setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13.5,
    backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)',
    color: 'var(--text-heading)', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'var(--font-sans)', transition: 'border-color 0.15s, box-shadow 0.15s',
    colorScheme: 'dark light',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6, ...MONO,
  }
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>, _c?: string) => {
    e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-soft)'
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'
  }

  const TYPE_CARDS = [
    { type: 'document' as SourceType, title: 'Document collection', desc: 'PDF, DOCX, CSV, XLSX, TXT, Markdown — semantic search via embeddings' },
    { type: 'database' as SourceType, title: 'Database', desc: 'PostgreSQL, MySQL, SQLite, SQL Server — schema inspection + read-only SQL' },
    { type: 'website'  as SourceType, title: 'Website crawler', desc: 'Automatically crawl and index any public website — configurable max pages and domain scope' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(8,12,24,0.5)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'var(--card-bg)', borderRadius: 12, width: 500,
        border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(8,12,24,0.22)',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden',
      }}>

        {/* Modal header */}
        <div style={{
          padding: '18px 24px 14px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ fontSize: 10, ...MONO, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 4 }}>
              New Data Source
            </div>
            <div style={{ ...SANS, fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>
              {step === 1 ? 'Choose source type' : step === 3 ? 'Select tables' : step === 4 ? 'Filters' : `Configure ${TYPE_META[type].label.toLowerCase()}`}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 6,
            color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 10px', fontSize: 13,
          }}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {(type === 'database'
            ? [{ n: 1, label: 'Type' }, { n: 2, label: 'Configure' }, { n: 3, label: 'Select tables' }, { n: 4, label: 'Filters' }]
            : [{ n: 1, label: 'Type' }, { n: 2, label: 'Configure' }]
          ).map(({ n, label }, _, arr) => {
            const done = step > n; const active = step === n
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, ...MONO,
                  background: done || active ? 'var(--accent-soft)' : 'var(--border)',
                  color: done || active ? 'var(--accent-text)' : 'var(--text-secondary)',
                  border: 'none',
                }}>
                  {done ? <Ic.Check /> : n}
                </div>
                <span style={{ fontSize: 12, color: active ? 'var(--text-heading)' : done ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: active ? 600 : 400 }}>{label}</span>
                {n < arr.length && <div style={{ width: 24, height: 1, background: 'var(--border)', margin: '0 2px' }} />}
              </div>
            )
          })}
        </div>

        {/* Step 1: type picker */}
        {step === 1 && (
          <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TYPE_CARDS.map(c => {
              const t = TYPE_META[c.type]; const active = type === c.type
              const Icon = c.type === 'document' ? Ic.Doc : c.type === 'database' ? Ic.DB : Ic.Web
              return (
                <button key={c.type} onClick={() => setType(c.type)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 9,
                    border: `1.5px solid ${active ? t.color : 'var(--border)'}`,
                    background: active ? t.dim : 'var(--bg-hover)', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.13s',
                  }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                    background: active ? t.dim : 'var(--bg-hover)',
                    border: `1px solid ${active ? t.border : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: active ? t.color : 'var(--text-secondary)',
                  }}>
                    <Icon s={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...SANS, fontSize: 13.5, fontWeight: 600, color: active ? t.color : 'var(--text-heading)', marginBottom: 3 }}>{c.title}</div>
                    <div style={{ ...SANS, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{c.desc}</div>
                  </div>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    border: `1.5px solid ${active ? t.color : 'var(--border)'}`,
                    background: active ? t.color : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-text)' }} />}
                  </div>
                </button>
              )
            })}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
              <button onClick={() => setStep(2)} style={{
                ...SANS, padding: '9px 20px', borderRadius: 999,
                background: 'var(--accent-soft)', color: 'var(--accent-text)',
                border: '1px solid var(--blue-border)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: form */}
        {step === 2 && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Name + description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)}
                  placeholder={type === 'document' ? 'e.g. Product Docs' : type === 'database' ? 'e.g. Analytics DB' : 'e.g. Help Center'}
                  onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input style={inputStyle} value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Optional — helps agents understand what this contains"
                  onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>

            {/* Database-specific */}
            {type === 'database' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Dialect picker */}
                <div>
                  <label style={labelStyle}>Database engine</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {DIALECTS.map(d => (
                      <button key={d.id} onClick={() => handleDialectChange(d.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                        borderRadius: 7, border: `1.5px solid ${dialect === d.id ? 'var(--blue)' : 'var(--border)'}`,
                        background: dialect === d.id ? 'var(--blue-dim)' : 'var(--bg-hover)',
                        cursor: 'pointer', textAlign: 'left',
                      }}>
                        <span style={{ fontSize: 18, lineHeight: 1 }}>{d.icon}</span>
                        <span style={{ fontSize: 12.5, fontWeight: dialect === d.id ? 600 : 400, color: dialect === d.id ? 'var(--blue)' : 'var(--text-heading)' }}>{d.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* SQLite: just a file path */}
                {dialect === 'sqlite' ? (
                  <div>
                    <label style={labelStyle}>Database file path *</label>
                    <input style={inputStyle} value={dbName} onChange={e => setDbName(e.target.value)}
                      placeholder="/data/myapp.db"
                      onFocus={onFocus} onBlur={onBlur} />
                  </div>
                ) : (
                  <>
                    {/* Host + Port */}
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 10 }}>
                      <div>
                        <label style={labelStyle}>Host *</label>
                        <input style={inputStyle} value={dbHost} onChange={e => setDbHost(e.target.value)}
                          placeholder="localhost"
                          onFocus={onFocus} onBlur={onBlur} />
                      </div>
                      <div>
                        <label style={labelStyle}>Port</label>
                        <input style={inputStyle} value={dbPort} onChange={e => setDbPort(e.target.value)}
                          placeholder={DEFAULT_PORTS[dialect]}
                          onFocus={onFocus} onBlur={onBlur} />
                      </div>
                    </div>

                    {/* Database name */}
                    <div>
                      <label style={labelStyle}>Database name *</label>
                      <input style={inputStyle} value={dbName} onChange={e => setDbName(e.target.value)}
                        placeholder="mydb"
                        onFocus={onFocus} onBlur={onBlur} />
                    </div>

                    {/* User + Password */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={labelStyle}>Username</label>
                        <input style={inputStyle} value={dbUser} onChange={e => setDbUser(e.target.value)}
                          placeholder="admin"
                          onFocus={onFocus} onBlur={onBlur} />
                      </div>
                      <div>
                        <label style={labelStyle}>Password</label>
                        <input style={inputStyle} type="password" value={dbPass} onChange={e => setDbPass(e.target.value)}
                          placeholder="••••••••"
                          onFocus={onFocus} onBlur={onBlur} />
                      </div>
                    </div>
                  </>
                )}

                {/* Connection string preview */}
                <div>
                  <label style={labelStyle}>Connection string preview</label>
                  <div style={{
                    padding: '9px 12px', borderRadius: 7, border: '1px solid var(--border)',
                    background: 'var(--bg-hover)', ...MONO, fontSize: 11.5, color: buildConnectionUrl() ? 'var(--text-heading)' : 'var(--text-tertiary)',
                    wordBreak: 'break-all', lineHeight: 1.6, minHeight: 36,
                  }}>
                    {buildConnectionUrl() || 'Fill in the fields above to preview'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 5, ...MONO }}>
                    Password is stored server-side — never returned to the UI
                  </div>
                </div>
              </div>
            )}

            {/* Website-specific */}
            {type === 'website' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Seed URL *</label>
                  <input style={inputStyle} value={seedUrl} onChange={e => setSeedUrl(e.target.value)}
                    placeholder="https://docs.example.com"
                    onFocus={onFocus} onBlur={onBlur} />
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 5 }}>
                    0.5 s polite delay between requests
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Max pages</label>
                    <input
                      style={inputStyle} type="number" min={1} max={20}
                      value={maxPages} onChange={e => setMaxPages(Math.min(20, Math.max(1, parseInt(e.target.value) || 7)))}
                      onFocus={onFocus} onBlur={onBlur}
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 2 }}>
                    <label style={{ ...labelStyle, marginBottom: 10 }}>Allow external links</label>
                    <button onClick={() => setAllowExternal(v => !v)} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
                      borderRadius: 7, border: `1px solid ${allowExternal ? TYPE_META.website.color : 'var(--border)'}`,
                      background: allowExternal ? TYPE_META.website.dim : 'transparent',
                      color: allowExternal ? TYPE_META.website.color : 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: 12.5, fontWeight: allowExternal ? 600 : 400, width: '100%',
                    }}>
                      <span style={{
                        width: 32, height: 18, borderRadius: 9, flexShrink: 0, position: 'relative',
                        background: allowExternal ? TYPE_META.website.color : 'var(--text-tertiary)',
                        transition: 'background 0.2s',
                      }}>
                        <span style={{
                          position: 'absolute', top: 2, left: allowExternal ? 16 : 2, width: 14, height: 14,
                          borderRadius: '50%', background: 'var(--card-bg)', transition: 'left 0.2s',
                        }} />
                      </span>
                      {allowExternal ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Crawl schedule</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {CRAWL_SCHEDULES.map(s => (
                      <button key={s.id} onClick={() => setCrawlSchedule(s.id)} style={{
                        padding: '6px 14px', borderRadius: 6,
                        border: `1px solid ${crawlSchedule === s.id ? TYPE_META.website.color : 'var(--border)'}`,
                        background: crawlSchedule === s.id ? TYPE_META.website.dim : 'transparent',
                        color: crawlSchedule === s.id ? TYPE_META.website.color : 'var(--text-secondary)',
                        cursor: 'pointer', fontSize: 12.5, fontWeight: crawlSchedule === s.id ? 600 : 400,
                      }}>{s.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Document hint */}
            {type === 'document' && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
                background: 'var(--accent-soft)', border: '1px solid var(--blue-border)',
                borderRadius: 8,
              }}>
                <span style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }}><Ic.Doc s={15} /></span>
                <div style={{ fontSize: 12.5, color: 'var(--accent)', lineHeight: 1.5 }}>
                  After creating, you can upload PDF, DOCX, CSV, XLSX, TXT, and Markdown files. Each file is chunked and embedded for semantic search.
                </div>
              </div>
            )}

            {error && (
              <div style={{
                padding: '9px 12px', background: 'var(--invalid-dim)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 6, fontSize: 12.5, color: 'var(--invalid)', ...MONO,
              }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', paddingTop: 2 }}>
              <button onClick={() => { setStep(1); setError('') }} style={{
                padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
              }}>← Back</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={{
                  padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
                }}>Cancel</button>
                {type === 'database' ? (
                  <button onClick={handleTestAndNext} disabled={schemaLoading} style={{
                    padding: '7px 20px', borderRadius: 6, border: 'none',
                    background: 'var(--accent-soft)', color: 'var(--accent-text)',
                    cursor: schemaLoading ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600,
                    opacity: schemaLoading ? 0.7 : 1,
                  }}>
                    {schemaLoading ? 'Connecting…' : 'Connect & select tables →'}
                  </button>
                ) : (
                  <button onClick={handleCreate} disabled={saving} style={{
                    padding: '7px 20px', borderRadius: 6, border: 'none',
                    background: 'var(--accent-soft)', color: 'var(--accent-text)',
                    cursor: saving ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600,
                    opacity: saving ? 0.7 : 1,
                  }}>
                    {saving ? 'Creating…' : 'Create source'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: table selection → per-table column redaction + row filters */}
        {step === 3 && (
          <>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', flex: 1, minHeight: 0 }}>

            {/* Table selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  Found <strong style={{ color: 'var(--blue)' }}>{schemaTables.length}</strong> tables. Pick the ones agents may read.
                </p>
                <button
                  onClick={() => {
                    const allVisible = filteredTables.map(t => t.name)
                    const allSelected = allVisible.every(n => selectedTables.has(n))
                    if (allSelected) {
                      setSelectedTables(prev => { const n = new Set(prev); allVisible.forEach(name => n.delete(name)); return n })
                    } else {
                      setSelectedTables(prev => { const n = new Set(prev); allVisible.forEach(name => n.add(name)); return n })
                    }
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: 'var(--blue)', fontWeight: 600, padding: '2px 0', flexShrink: 0 }}>
                  {filteredTables.every(t => selectedTables.has(t.name)) && filteredTables.length > 0 ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
                  <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input value={tableSearch} onChange={e => setTableSearch(e.target.value)} placeholder="Search tables…"
                  style={{ ...inputStyle, paddingLeft: 30 }} />
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }}>
                {filteredTables.length === 0 ? (
                  <p style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>No matches</p>
                ) : filteredTables.map((tbl, i) => {
                  const checked = selectedTables.has(tbl.name)
                  return (
                    <label key={tbl.name} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer',
                      background: checked ? 'var(--blue-dim)' : 'var(--card-bg)',
                      borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                    }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleTable(tbl.name)}
                        style={{ width: 14, height: 14, accentColor: 'var(--blue)', flexShrink: 0 }} />
                      <Ic.DB s={13} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-heading)', ...MONO }}>{tbl.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', ...MONO }}>{tbl.columns.length} cols</span>
                    </label>
                  )
                })}
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', ...MONO, margin: 0 }}>{selectedTables.size} of {schemaTables.length} selected</p>
            </div>

            {error && (
              <div style={{
                padding: '9px 12px', background: 'var(--invalid-dim)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 6, fontSize: 12.5, color: 'var(--invalid)', ...MONO,
              }}>{error}</div>
            )}
          </div>

          {/* Pinned footer */}
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'space-between', flexShrink: 0 }}>
            <button onClick={() => { setStep(2); setError('') }} style={{
              padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
            }}>← Back</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{
                padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
              }}>Cancel</button>
              <button onClick={() => { setStep(4); setError('') }} disabled={selectedTables.size === 0} style={{
                padding: '7px 20px', borderRadius: 6, border: 'none',
                background: 'var(--accent-soft)', color: 'var(--accent-text)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                opacity: selectedTables.size === 0 ? 0.6 : 1,
              }}>
                Continue →
              </button>
            </div>
          </div>
          </>
        )}

        {/* Step 4: filters — per-table column redaction + row filters */}
        {step === 4 && (
          <>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', flex: 1, minHeight: 0 }}>
            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--blue-dim)', border: '1px solid var(--blue-border, var(--border))', fontSize: 12.5, color: 'var(--blue)' }}>
              Row filters apply on every agent read — agents never see rows that don't match.
            </div>

            {selectedTableObjects.map(tbl => {
              const redacted = [...(columnRedactions[tbl.name] ?? new Set<string>())]
              const visibleCols = tbl.columns.filter(c => !columnRedactions[tbl.name]?.has(c.name))
              const showPicker = addColTable === tbl.name

              return (
                <div key={tbl.name} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'visible' }}>
                  <div style={{ padding: '9px 14px', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Ic.DB s={13} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', ...MONO }}>{tbl.name}</span>
                  </div>

                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Row filter */}
                    <div>
                      <div style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 5, ...MONO }}>Row filter</div>
                      <FilterBuilder
                        tableName={tbl.name}
                        columns={visibleCols}
                        conditions={rowFilters[tbl.name] ?? []}
                        onChange={conds => setRowFilters(prev => ({ ...prev, [tbl.name]: conds }))}
                      />
                    </div>

                    {/* Column redactions */}
                    <div>
                      <div style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 5, ...MONO }}>Hidden columns</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                        {redacted.map(col => (
                          <span key={col} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20,
                            border: '1px solid var(--border)', background: 'var(--bg-hover)',
                            fontSize: 11.5, ...MONO, color: 'var(--text-secondary)',
                          }}>
                            {col}
                            <button onClick={() => removeRedaction(tbl.name, col)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                              <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                            </button>
                          </span>
                        ))}
                        <div style={{ position: 'relative' }}>
                          <button onClick={() => { setAddColTable(showPicker ? null : tbl.name); setAddColSearch('') }} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20,
                            fontSize: 11.5, border: '1px dashed var(--border)', background: 'transparent',
                            color: 'var(--text-secondary)', cursor: 'pointer', ...MONO,
                          }}>+ Add column</button>
                          {showPicker && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50, width: 200, borderRadius: 10, border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', background: 'var(--card-bg)', overflow: 'hidden' }}>
                              <div style={{ padding: '8px 8px 6px', borderBottom: '1px solid var(--border)' }}>
                                <input autoFocus value={addColSearch} onChange={e => setAddColSearch(e.target.value)}
                                  placeholder="Search columns…"
                                  style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, outline: 'none', fontFamily: 'var(--font-mono)', boxSizing: 'border-box' as const }} />
                              </div>
                              <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                                {tbl.columns
                                  .filter(c => !columnRedactions[tbl.name]?.has(c.name))
                                  .filter(c => !addColSearch || c.name.toLowerCase().includes(addColSearch.toLowerCase()))
                                  .map(col => (
                                    <button key={col.name} onClick={() => { addRedaction(tbl.name, col.name); setAddColTable(null) }} style={{
                                      width: '100%', textAlign: 'left', padding: '7px 12px', background: 'none',
                                      border: 'none', cursor: 'pointer', fontSize: 12.5, ...MONO, color: 'var(--text-heading)',
                                    }}
                                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    >{col.name}</button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {error && (
              <div style={{ padding: '9px 12px', background: 'var(--invalid-dim)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, fontSize: 12.5, color: 'var(--invalid)', ...MONO }}>{error}</div>
            )}
          </div>

          {/* Pinned footer */}
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'space-between', flexShrink: 0 }}>
            <button onClick={() => { setStep(3); setError('') }} style={{
              padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
            }}>← Back</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{
                padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
              }}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} style={{
                padding: '7px 20px', borderRadius: 6, border: 'none',
                background: 'var(--accent-soft)', color: 'var(--accent-text)',
                cursor: saving ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600,
                opacity: saving ? 0.6 : 1,
              }}>
                {saving ? 'Creating…' : 'Create source'}
              </button>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── edit modal ───────────────────────────────────────────────────────────────

type EditStep = 'connect' | 'tables' | 'filters'

function EditModal({ source, onClose, onSaved }: {
  source: DataSourceRecord
  onClose: () => void
  onSaved: (updated: DataSourceRecord) => void
}) {
  const t   = TYPE_META[source.source_type]
  const isDb = source.source_type === 'database'

  // ── step ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<EditStep>('connect')
  const STEPS = isDb ? ['Connect', 'Select tables', 'Filters'] : []
  const stepIdx = { connect: 0, tables: 1, filters: 2 }[step]

  // ── shared fields ─────────────────────────────────────────────────────────
  const [name,        setName]        = useState(source.name)
  const [description, setDescription] = useState(source.description)
  const [error,       setError]       = useState('')
  const [saving,      setSaving]      = useState(false)

  // ── database ──────────────────────────────────────────────────────────────
  const [connectionUrl, setConnectionUrl] = useState(source.connection_url)
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [schemaTables,  setSchemaTables]  = useState<TableInfo[]>([])
  const [tableSearch,   setTableSearch]   = useState('')
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set(source.allowed_tables))
  const [columnRedactions, setColumnRedactions] = useState<Record<string, Set<string>>>(
    Object.fromEntries(Object.entries(source.column_redactions).map(([t, cols]) => [t, new Set(cols)]))
  )
  const [rowFilters, setRowFilters] = useState<Record<string, Condition[]>>(
    Object.fromEntries(Object.entries(source.row_filters).map(([t, sql]) => [t, sqlToConditions(sql)]))
  )
  const [addColTable,  setAddColTable]  = useState<string | null>(null)
  const [addColSearch, setAddColSearch] = useState('')

  // ── website ───────────────────────────────────────────────────────────────
  const [seedUrl,       setSeedUrl]       = useState(source.seed_url)
  const [crawlSchedule, setCrawlSchedule] = useState(source.crawl_schedule)
  const [maxPages,      setMaxPages]      = useState(Math.min(20, source.max_pages ?? 7))
  const [allowExternal, setAllowExternal] = useState(Boolean(source.allow_external))

  // load schema on open for db sources
  useEffect(() => {
    if (!isDb || !source.connection_url) return
    setSchemaLoading(true)
    schemaFromUrl(source.connection_url)
      .then(r => setSchemaTables(r.tables))
      .catch(() => {})
      .finally(() => setSchemaLoading(false))
  }, [source.source_id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── helpers ───────────────────────────────────────────────────────────────
  const toggleTable = (tname: string) => {
    setSelectedTables(prev => {
      const next = new Set(prev)
      if (next.has(tname)) {
        next.delete(tname)
        setColumnRedactions(r => { const n = { ...r }; delete n[tname]; return n })
        setRowFilters(f => { const n = { ...f }; delete n[tname]; return n })
      } else { next.add(tname) }
      return next
    })
  }

  const addRedaction = (tbl: string, col: string) =>
    setColumnRedactions(p => ({ ...p, [tbl]: new Set([...(p[tbl] ?? []), col]) }))
  const removeRedaction = (tbl: string, col: string) =>
    setColumnRedactions(p => { const s = new Set(p[tbl] ?? []); s.delete(col); return { ...p, [tbl]: s } })

  const reloadSchema = async () => {
    if (!connectionUrl.trim()) return
    setSchemaLoading(true); setError('')
    try {
      const r = await schemaFromUrl(connectionUrl)
      setSchemaTables(r.tables)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not connect.')
    } finally { setSchemaLoading(false) }
  }

  const canContinueTables = selectedTables.size > 0
  const selectedTableObjects = schemaTables.filter(t => selectedTables.has(t.name))
  const filteredTables = schemaTables.filter(t => !tableSearch || t.name.toLowerCase().includes(tableSearch.toLowerCase()))

  // ── save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError('')
    try {
      const payload: Partial<CreateDataSourcePayload> = {
        name: name.trim(),
        description,
        ...(isDb ? {
          connection_url: connectionUrl,
          allowed_tables: [...selectedTables],
          column_redactions: Object.fromEntries(
            Object.entries(columnRedactions).map(([t, cols]) => [t, [...cols]])
          ),
          row_filters: Object.fromEntries(
            Object.entries(rowFilters).map(([tbl, conds]) => {
              const tblObj = schemaTables.find(x => x.name === tbl)
              return [tbl, conditionsToSql(conds, tblObj?.columns ?? [])]
            }).filter(([, sql]) => sql)
          ),
        } : {}),
        ...(source.source_type === 'website' ? { seed_url: seedUrl, crawl_schedule: crawlSchedule, max_pages: maxPages, allow_external: allowExternal } : {}),
      }
      onSaved(await updateDataSource(source.source_id, payload))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save.'); setSaving(false)
    }
  }

  // ── shared input style ────────────────────────────────────────────────────
  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 11px', borderRadius: 7, fontSize: 13.5,
    background: 'var(--card-bg)', border: '1px solid var(--border)',
    color: 'var(--text-heading)', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'var(--font-sans)',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 5, ...MONO,
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(8,12,24,0.55)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'var(--card-bg)', borderRadius: 14, width: '100%', maxWidth: 540,
        border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(8,12,24,0.22)',
        display: 'flex', flexDirection: 'column', maxHeight: '92vh', overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
          <div style={{ fontSize: 10, ...MONO, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.color, marginBottom: 4 }}>
            Edit {t.label}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>{source.name}</h2>
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'var(--bg-hover)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', fontSize: 14, flexShrink: 0,
            }}>✕</button>
          </div>
        </div>

        {/* ── Step bar (db only) ── */}
        {isDb && (
          <div style={{ padding: '14px 24px 0', display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
            {STEPS.map((label, i) => {
              const done = i < stepIdx; const active = i === stepIdx
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, ...MONO, flexShrink: 0,
                      background: done || active ? t.color : 'var(--border)',
                      color: done || active ? 'var(--accent-text)' : 'var(--text-secondary)',
                    }}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: active ? 600 : 400, color: active ? 'var(--text-heading)' : 'var(--text-secondary)' }}>{label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div style={{ width: 28, height: 1, background: 'var(--border)', margin: '0 10px' }} />}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Divider ── */}
        <div style={{ height: 1, background: 'var(--border)', margin: '16px 0 0', flexShrink: 0 }} />

        {/* ── Body (scrolls) ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* STEP: connect */}
          {step === 'connect' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div>
                <label style={lbl}>Name *</label>
                <input style={inp} value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div>
                <label style={lbl}>Description</label>
                <input style={inp} value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              {/* DB: connection URL */}
              {isDb && (
                <div>
                  <label style={lbl}>Connection URL</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <textarea
                      rows={2}
                      style={{ ...inp, flex: 1, resize: 'vertical', fontSize: 12, fontFamily: 'var(--font-mono)' } as React.CSSProperties}
                      value={connectionUrl}
                      onChange={e => setConnectionUrl(e.target.value)}
                      spellCheck={false}
                      placeholder="postgresql://user:pass@host:5432/db"
                    />
                    <button onClick={reloadSchema} disabled={schemaLoading || !connectionUrl.trim()} style={{
                      padding: '8px 14px', borderRadius: 7, border: '1px solid var(--border)',
                      background: 'var(--bg-hover)', color: 'var(--text-secondary)', cursor: schemaLoading ? 'wait' : 'pointer',
                      fontSize: 12.5, fontWeight: 500, flexShrink: 0, opacity: !connectionUrl.trim() ? 0.5 : 1,
                    }}>
                      {schemaLoading ? '⏳' : '↺ Test'}
                    </button>
                  </div>
                  {schemaLoading && (
                    <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 5, ...MONO }}>Loading schema…</p>
                  )}
                  {!schemaLoading && schemaTables.length > 0 && (
                    <p style={{ fontSize: 11.5, color: 'var(--accent)', marginTop: 5, ...MONO }}>✓ {schemaTables.length} tables found · {source.allowed_tables.length} currently selected</p>
                  )}
                </div>
              )}

              {/* Website */}
              {source.source_type === 'website' && (
                <>
                  <div>
                    <label style={lbl}>Seed URL</label>
                    <input style={inp} value={seedUrl} onChange={e => setSeedUrl(e.target.value)} spellCheck={false} />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Max pages</label>
                      <input
                        style={inp} type="number" min={1} max={20}
                        value={maxPages} onChange={e => setMaxPages(Math.min(20, Math.max(1, parseInt(e.target.value) || 7)))}
                      />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 2 }}>
                      <label style={{ ...lbl, marginBottom: 10 }}>Allow external links</label>
                      <button onClick={() => setAllowExternal(v => !v)} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                        borderRadius: 7, border: `1px solid ${allowExternal ? t.color : 'var(--border)'}`,
                        background: allowExternal ? t.dim : 'transparent',
                        color: allowExternal ? t.color : 'var(--text-secondary)',
                        cursor: 'pointer', fontSize: 12.5, fontWeight: allowExternal ? 600 : 400, width: '100%',
                      }}>
                        <span style={{
                          width: 32, height: 18, borderRadius: 9, flexShrink: 0, position: 'relative',
                          background: allowExternal ? t.color : 'var(--text-tertiary)', transition: 'background 0.2s',
                        }}>
                          <span style={{
                            position: 'absolute', top: 2, left: allowExternal ? 16 : 2, width: 14, height: 14,
                            borderRadius: '50%', background: 'var(--card-bg)', transition: 'left 0.2s',
                          }} />
                        </span>
                        {allowExternal ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Crawl schedule</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {CRAWL_SCHEDULES.map(s => (
                        <button key={s.id} onClick={() => setCrawlSchedule(s.id)} style={{
                          padding: '6px 14px', borderRadius: 6,
                          border: `1px solid ${crawlSchedule === s.id ? t.color : 'var(--border)'}`,
                          background: crawlSchedule === s.id ? t.dim : 'transparent',
                          color: crawlSchedule === s.id ? t.color : 'var(--text-secondary)',
                          cursor: 'pointer', fontSize: 12.5, fontWeight: crawlSchedule === s.id ? 600 : 400,
                        }}>{s.label}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {error && <p style={{ fontSize: 12.5, color: '#ef4444', ...MONO }}>{error}</p>}
            </div>
          )}

          {/* STEP: tables */}
          {step === 'tables' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {schemaLoading ? (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '32px 0', textAlign: 'center' }}>Loading schema…</p>
              ) : schemaTables.length === 0 ? (
                <p style={{ fontSize: 13, color: '#ef4444' }}>Could not load schema — go back and check your connection URL.</p>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                      Found <strong style={{ color: t.color }}>{schemaTables.length}</strong> tables. Pick the ones agents may read.
                    </p>
                    <button
                      onClick={() => {
                        const allVisible = filteredTables.map(t => t.name)
                        const allSelected = allVisible.every(n => selectedTables.has(n))
                        if (allSelected) {
                          setSelectedTables(prev => { const n = new Set(prev); allVisible.forEach(name => n.delete(name)); return n })
                        } else {
                          setSelectedTables(prev => { const n = new Set(prev); allVisible.forEach(name => n.add(name)); return n })
                        }
                      }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5,
                        color: t.color, fontWeight: 600, padding: '2px 0', flexShrink: 0,
                      }}>
                      {filteredTables.every(t => selectedTables.has(t.name)) && filteredTables.length > 0
                        ? 'Deselect all'
                        : 'Select all'}
                    </button>
                  </div>
                  {/* Search */}
                  <div style={{ position: 'relative' }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
                      <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <input
                      autoFocus
                      value={tableSearch}
                      onChange={e => setTableSearch(e.target.value)}
                      placeholder="Search tables…"
                      style={{ ...inp, paddingLeft: 30 }}
                    />
                  </div>
                  {/* Table list */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }}>
                    {filteredTables.length === 0 ? (
                      <p style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>No matches</p>
                    ) : filteredTables.map((tbl, i) => {
                      const checked = selectedTables.has(tbl.name)
                      return (
                        <label key={tbl.name} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer',
                          background: checked ? t.dim : 'var(--card-bg)',
                          borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                        }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleTable(tbl.name)}
                            style={{ width: 14, height: 14, accentColor: t.color, flexShrink: 0 }} />
                          <Ic.DB s={13} />
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-heading)', ...MONO }}>{tbl.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', ...MONO }}>{tbl.columns.length} cols</span>
                        </label>
                      )
                    })}
                  </div>
                  <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', ...MONO }}>{selectedTables.size} of {schemaTables.length} selected</p>
                </>
              )}
              {error && <p style={{ fontSize: 12.5, color: '#ef4444', ...MONO }}>{error}</p>}
            </div>
          )}

          {/* STEP: filters */}
          {step === 'filters' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ padding: '10px 12px', borderRadius: 8, background: `${t.color}12`, border: `1px solid ${t.color}30`, fontSize: 12.5, color: t.color }}>
                Row filters apply on every agent read — agents never see rows that don't match.
              </div>

              {selectedTableObjects.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No tables selected — go back and pick at least one.</p>
              ) : selectedTableObjects.map(tbl => {
                const redacted    = [...(columnRedactions[tbl.name] ?? new Set<string>())]
                const visibleCols = tbl.columns.filter(c => !columnRedactions[tbl.name]?.has(c.name))
                const showPicker  = addColTable === tbl.name

                return (
                  <div key={tbl.name} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'visible' }}>
                    {/* Table header */}
                    <div style={{ padding: '9px 14px', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Ic.DB s={13} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', ...MONO }}>{tbl.name}</span>
                    </div>

                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Row filter */}
                      <div>
                        <div style={lbl}>Row filter</div>
                        <FilterBuilder
                          tableName={tbl.name}
                          columns={visibleCols}
                          conditions={rowFilters[tbl.name] ?? []}
                          onChange={conds => setRowFilters(prev => ({ ...prev, [tbl.name]: conds }))}
                        />
                      </div>

                      {/* Column redactions */}
                      <div>
                        <div style={lbl}>Hidden columns</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                          {redacted.map(col => (
                            <span key={col} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '3px 9px', borderRadius: 20,
                              border: '1px solid var(--border)', background: 'var(--bg-hover)',
                              fontSize: 11.5, ...MONO, color: 'var(--text-secondary)',
                            }}>
                              {col}
                              <button onClick={() => removeRedaction(tbl.name, col)} style={{
                                background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1,
                                color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                              }}>
                                <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                              </button>
                            </span>
                          ))}
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={() => { setAddColTable(showPicker ? null : tbl.name); setAddColSearch('') }}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '3px 9px', borderRadius: 20, fontSize: 11.5,
                                border: '1px dashed var(--border)', background: 'transparent',
                                color: 'var(--text-secondary)', cursor: 'pointer', ...MONO,
                              }}>
                              + Add column
                            </button>
                            {showPicker && (
                              <div style={{
                                position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50,
                                width: 200, borderRadius: 10, border: '1px solid var(--border)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', background: 'var(--card-bg)', overflow: 'hidden',
                              }}>
                                <div style={{ padding: '8px 8px 6px', borderBottom: '1px solid var(--border)' }}>
                                  <input autoFocus value={addColSearch} onChange={e => setAddColSearch(e.target.value)}
                                    placeholder="Search columns…"
                                    style={{ ...inp, padding: '5px 8px', fontSize: 12 }} />
                                </div>
                                <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                                  {tbl.columns
                                    .filter(c => !columnRedactions[tbl.name]?.has(c.name))
                                    .filter(c => !addColSearch || c.name.toLowerCase().includes(addColSearch.toLowerCase()))
                                    .map(col => (
                                      <button key={col.name} onClick={() => { addRedaction(tbl.name, col.name); setAddColTable(null) }} style={{
                                        width: '100%', textAlign: 'left', padding: '7px 12px', background: 'none',
                                        border: 'none', cursor: 'pointer', fontSize: 12.5, ...MONO, color: 'var(--text-heading)',
                                      }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                      >{col.name}</button>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {error && <p style={{ fontSize: 12.5, color: '#ef4444', ...MONO }}>{error}</p>}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          borderTop: '1px solid var(--border)', padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
            Cancel
          </button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {step !== 'connect' && (
              <button onClick={() => setStep(step === 'filters' ? 'tables' : 'connect')} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-heading)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              }}>
                ← Back
              </button>
            )}
            {/* Connect step → next (db) */}
            {step === 'connect' && isDb && (
              <button onClick={() => { setStep('tables'); setError('') }}
                disabled={schemaLoading || !name.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '7px 18px', borderRadius: 7,
                  background: 'var(--accent-soft)', color: 'var(--accent-text)', border: '1px solid var(--blue-border)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  opacity: schemaLoading || !name.trim() ? 0.5 : 1,
                }}>
                {schemaLoading ? 'Loading…' : 'Continue →'}
              </button>
            )}
            {/* Connect step → save (doc / website) */}
            {step === 'connect' && !isDb && (
              <button onClick={handleSave} disabled={saving || !name.trim()} style={{
                padding: '7px 18px', borderRadius: 7, background: 'var(--accent-soft)', color: 'var(--accent-text)', border: '1px solid var(--blue-border)',
                cursor: saving ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600,
                opacity: saving || !name.trim() ? 0.5 : 1,
              }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}
            {/* Tables → continue */}
            {step === 'tables' && (
              <button onClick={() => { setStep('filters'); setError('') }} disabled={!canContinueTables} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '7px 18px', borderRadius: 7,
                background: 'var(--accent-soft)', color: 'var(--accent-text)', border: '1px solid var(--blue-border)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                opacity: !canContinueTables ? 0.5 : 1,
              }}>
                Continue →
              </button>
            )}
            {/* Filters → save */}
            {step === 'filters' && (
              <button onClick={handleSave} disabled={saving} style={{
                padding: '7px 18px', borderRadius: 7, background: 'var(--accent-soft)', color: 'var(--accent-text)', border: '1px solid var(--blue-border)',
                cursor: saving ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1,
              }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
// ─── drop zone ────────────────────────────────────────────────────────────────

function DropZone({ onFile, uploading }: { onFile: (f: File) => void; uploading: boolean }) {
  const [dragging, setDragging] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) onFile(f)
  }, [onFile])
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !uploading && ref.current?.click()}
      style={{
        border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8, padding: '24px 20px', textAlign: 'center',
        cursor: uploading ? 'wait' : 'pointer', transition: 'all 0.15s',
        background: dragging ? 'var(--accent-soft)' : 'var(--bg-hover)',
      }}>
      <input ref={ref} type="file" accept=".pdf,.docx,.xlsx,.csv,.md,.txt" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) { onFile(f); e.target.value = '' } }} />
      <div style={{ color: uploading ? 'var(--accent)' : 'var(--text-tertiary)', marginBottom: 8 }}><Ic.Upload /></div>
      <div style={{ fontSize: 13, fontWeight: 500, color: uploading ? 'var(--accent)' : 'var(--text-secondary)', marginBottom: 3 }}>
        {uploading ? 'Indexing file…' : 'Drop file here or click to upload'}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', ...MONO }}>
        PDF · DOCX · XLSX · CSV · MD · TXT
      </div>
    </div>
  )
}

// ─── file row ─────────────────────────────────────────────────────────────────

function FileRow({ file, onDelete }: { file: FileInfo; onDelete: () => void }) {
  const [hover, setHover] = useState(false)
  const name = file.filename.length > 52 ? '…' + file.filename.slice(-48) : file.filename
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6,
      background: hover ? 'var(--bg-hover)' : 'var(--card-bg)', border: '1px solid var(--border)',
      transition: 'background 0.12s',
    }}>
      <span style={{ color: 'var(--accent)', flexShrink: 0 }}><Ic.Doc s={13} /></span>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-heading)', ...MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </span>
      <span style={{ fontSize: 11.5, ...MONO, flexShrink: 0, padding: '1px 7px', background: 'var(--accent-soft)', borderRadius: 4, color: 'var(--accent)', border: '1px solid var(--blue-border)' }}>
        {file.chunk_count} chunks
      </span>
      <button onClick={onDelete} style={{
        background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
        color: hover ? '#ef4444' : 'var(--text-tertiary)', padding: 2, transition: 'color 0.12s',
      }}><Ic.Trash /></button>
    </div>
  )
}

// ─── crawled page row ─────────────────────────────────────────────────────────

function CrawledPageRow({ file, onDelete }: { file: FileInfo; onDelete: () => void }) {
  const [hover, setHover] = useState(false)
  const label = file.filename.length > 60 ? file.filename.slice(0, 57) + '…' : file.filename
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 5,
      background: hover ? 'var(--bg-hover)' : 'var(--bg-hover)', transition: 'background 0.12s',
    }}>
      <span style={{ color: TYPE_META.website.color, flexShrink: 0 }}><Ic.Web s={11} /></span>
      <span style={{ flex: 1, fontSize: 12, ...MONO, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span style={{ fontSize: 11, ...MONO, flexShrink: 0, padding: '1px 6px', background: 'rgba(139,92,246,0.08)', borderRadius: 4, color: TYPE_META.website.color, border: '1px solid rgba(139,92,246,0.15)' }}>
        {file.chunk_count} chunks
      </span>
      <button onClick={onDelete} style={{
        background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
        color: hover ? '#ef4444' : 'var(--text-tertiary)', padding: 2, transition: 'color 0.12s',
      }}><Ic.Trash /></button>
    </div>
  )
}

// ─── section card ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
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

// ─── metric chip ─────────────────────────────────────────────────────────────

function Metric({ label, value, color }: { label: string; value: string | number; color: string }) {
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

// ─── notice banner ────────────────────────────────────────────────────────────

function Notice({ ok, msg, onDismiss }: { ok: boolean; msg: string; onDismiss: () => void }) {
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

// ─── detail panel ─────────────────────────────────────────────────────────────

function SourceDetail({
  source, onDeleted, onUpdated, onBack,
}: {
  source: DataSourceRecord
  onDeleted: () => void
  onUpdated: (updated: DataSourceRecord) => void
  onBack?: () => void
}) {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [schemaTables, setSchemaTables] = useState<TableInfo[] | null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [crawling, setCrawling] = useState(false)
  const [loadingSchema, setLoadingSchema] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null)
  const [usingAgents, setUsingAgents] = useState<AgentRecord[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const t = TYPE_META[source.source_type]

  useEffect(() => {
    setFiles([]); setSchemaTables(null); setTestResult(null); setNotice(null); setUsingAgents([])
    if (source.source_type !== 'database') listFiles(source.source_id).then(setFiles).catch(() => {})
    listAgents().then(all => setUsingAgents(all.filter(a => a.datasource_ids.includes(source.source_id)))).catch(() => {})
  }, [source.source_id, source.source_type])

  const handleUpload = async (file: File) => {
    setUploading(true); setNotice(null)
    try {
      const r = await uploadDocument(source.source_id, file)
      setNotice({ ok: true, msg: `${r.filename} — ${r.chunks_added} chunks indexed` })
      setFiles(await listFiles(source.source_id))
    } catch (e: unknown) { setNotice({ ok: false, msg: e instanceof Error ? e.message : 'Upload failed' }) }
    finally { setUploading(false) }
  }

  const handleDeleteFile = (filename: string) => {
    setFileToDelete(filename)
  }

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return
    try {
      await deleteFile(source.source_id, fileToDelete)
      setFiles(await listFiles(source.source_id))
    } catch (e: unknown) {
      setNotice({ ok: false, msg: e instanceof Error ? e.message : 'Delete failed' })
    } finally {
      setFileToDelete(null)
    }
  }

  const handleCrawl = async () => {
    setCrawling(true); setNotice(null)
    try {
      const r = await crawlWebsite(source.source_id)
      setNotice({ ok: true, msg: `Crawled ${r.pages_crawled} pages — ${r.chunks_added} chunks indexed` })
      setFiles(await listFiles(source.source_id))
    } catch (e: unknown) { setNotice({ ok: false, msg: e instanceof Error ? e.message : 'Crawl failed' }) }
    finally { setCrawling(false) }
  }

  const handleTest = async () => {
    setTestResult(null)
    const r = await testConnection(source.source_id)
    setTestResult(r)
  }

  const handleSchema = async () => {
    setLoadingSchema(true); setSchemaTables(null)
    try { setSchemaTables((await schemaFromUrl(source.connection_url)).tables) }
    catch (e: unknown) { console.error(e) }
    finally { setLoadingSchema(false) }
  }

  const handleDelete = () => setShowDeleteConfirm(true)

  const confirmDelete = async () => {
    setShowDeleteConfirm(false)
    setDeleting(true)
    try { await deleteDataSource(source.source_id); onDeleted() }
    finally { setDeleting(false) }
  }

  const totalChunks = files.reduce((s, f) => s + f.chunk_count, 0)

  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
    borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
    transition: 'all 0.13s',
  }

  return (
    <div className="ds-detail" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {onBack && (
        <button
          type="button"
          className="ds-back"
          onClick={onBack}
          style={{
            alignSelf: 'flex-start',
            background: 'none', border: 'none', padding: 0,
            ...SANS, fontSize: 13, fontWeight: 600, color: 'var(--accent)',
            cursor: 'pointer', alignItems: 'center', gap: 4,
          }}
        >
          <span aria-hidden>‹</span> All sources
        </button>
      )}

      {/* Header */}
      <div className="ds-detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div className="ds-detail-identity" style={{ display: 'flex', alignItems: 'flex-start', gap: 16, minWidth: 0, flex: 1 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, flexShrink: 0,
            background: t.dim, border: `1.5px solid ${t.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.color,
          }}>
            {source.source_type === 'document' ? <Ic.Doc s={24} /> : source.source_type === 'database' ? <Ic.DB s={24} /> : <Ic.Web s={24} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ marginBottom: 6 }}><TypeBadge type={source.source_type} /></div>
            <h2 className="ds-detail-title" style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-heading)', margin: 0, lineHeight: 1.2, wordBreak: 'break-word' }}>{source.name}</h2>
            {source.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, margin: 0 }}>{source.description}</p>}
          </div>
        </div>
        <div className="ds-detail-actions" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="ds-btn-edit" onClick={() => setShowEdit(true)} style={{
            ...btnBase, background: t.dim, color: t.color,
            border: `1px solid ${t.border}`, fontSize: 12.5,
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M9.5 1.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
            Edit
          </button>
          <button className="ds-btn-delete" onClick={handleDelete} disabled={deleting} style={{
            ...btnBase,
            background: 'var(--invalid-dim)', color: 'var(--invalid)',
            border: '1px solid rgba(239,68,68,0.15)', fontSize: 12.5,
          }}>
            <Ic.Trash /> {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="ds-metrics" style={{ display: 'flex', gap: 10 }}>
        <Metric label="Files" value={files.length} color={t.color} />
        <Metric label="Chunks" value={totalChunks} color="var(--text-heading)" />
      </div>

      {/* Notice */}
      {notice && <Notice ok={notice.ok} msg={notice.msg} onDismiss={() => setNotice(null)} />}

      {/* Document */}
      {source.source_type === 'document' && (
        <SectionCard title="Documents">
          <DropZone onFile={handleUpload} uploading={uploading} />
          {files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
              {files.map(f => <FileRow key={f.filename} file={f} onDelete={() => handleDeleteFile(f.filename)} />)}
            </div>
          )}
          {files.length === 0 && !uploading && (
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 10 }}>No files uploaded yet</p>
          )}
        </SectionCard>
      )}

      {/* Website */}
      {source.source_type === 'website' && (
        <SectionCard title="Crawler">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, ...MONO, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 5 }}>Seed URL</div>
              <div style={{ fontSize: 13, color: TYPE_META.website.color, ...MONO }}>{source.seed_url || '—'}</div>
            </div>
            <button onClick={handleCrawl} disabled={crawling} style={{
              ...btnBase,
              background: crawling ? TYPE_META.website.dim : TYPE_META.website.dim,
              color: TYPE_META.website.color, border: `1px solid ${TYPE_META.website.border}`,
              fontWeight: 600,
            }}>
              {crawling ? '◌ Crawling…' : '▶ Run crawl'}
            </button>
          </div>
          {files.length > 0 ? (
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {files.map(f => (
                <CrawledPageRow key={f.filename} file={f} onDelete={() => handleDeleteFile(f.filename)} />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', textAlign: 'center' }}>Not crawled yet — click Run crawl to start</p>
          )}
        </SectionCard>
      )}

      {/* Database */}
      {source.source_type === 'database' && (
        <>
          <SectionCard title="Connection">
            <div style={{ fontSize: 12.5, ...MONO, color: 'var(--text-secondary)', wordBreak: 'break-all', marginBottom: 14, padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 6, border: '1px solid var(--border)' }}>
              {source.connection_url ? source.connection_url.replace(/:([^:@]+)@/, ':***@') : <span style={{ color: 'var(--text-tertiary)' }}>No URL configured</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={handleTest} style={{
                ...btnBase, background: 'var(--blue-dim)', color: 'var(--blue)',
                border: '1px solid var(--blue-border)', fontWeight: 600,
              }}>Test connection</button>
              <button onClick={handleSchema} disabled={loadingSchema} style={{
                ...btnBase, background: 'var(--bg-hover)', color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}>
                {loadingSchema ? '◌ Loading…' : 'View schema'}
              </button>
              {testResult && (
                <span style={{ fontSize: 12.5, ...MONO, color: testResult.success ? 'var(--accent)' : '#ef4444', fontWeight: 600 }}>
                  {testResult.success ? '✓ Connected' : `✗ ${testResult.message}`}
                </span>
              )}
            </div>
          </SectionCard>

          {schemaTables && (
            <SectionCard title="Schema">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {schemaTables.map(tbl => {
                  const hiddenCols = new Set(source.column_redactions[tbl.name] ?? [])
                  const rowFilter = source.row_filters[tbl.name] ?? ''
                  const isAllowed = source.allowed_tables.length === 0 || source.allowed_tables.includes(tbl.name)
                  return (
                    <div key={tbl.name} style={{
                      border: '1px solid var(--border)',
                      borderRadius: 8, overflow: 'hidden',
                      background: isAllowed ? 'var(--card-bg)' : 'var(--bg-hover)',
                    }}>
                      {/* Table header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                        background: 'var(--bg-hover)',
                        borderBottom: isAllowed ? '1px solid var(--border)' : 'none',
                      }}>
                        <Ic.DB s={12} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: isAllowed ? 'var(--text-secondary)' : 'var(--text-tertiary)', ...MONO, flex: 1 }}>{tbl.name}</span>
                        {!isAllowed && (
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-tertiary)', border: '1px solid var(--border)', ...MONO, fontWeight: 600 }}>not exposed</span>
                        )}
                        {rowFilter && isAllowed && (
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)', ...MONO, fontWeight: 600 }}>
                            row filter
                          </span>
                        )}
                        {hiddenCols.size > 0 && isAllowed && (
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', ...MONO, fontWeight: 600 }}>
                            {hiddenCols.size} hidden
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: isAllowed ? 'var(--text-secondary)' : 'var(--text-tertiary)', ...MONO }}>{tbl.columns.length} cols</span>
                      </div>

                      {/* Columns — only for exposed tables */}
                      {isAllowed && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 14px' }}>
                          {tbl.columns.map(col => {
                            const hidden = hiddenCols.has(col.name)
                            return (
                              <span key={col.name} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '3px 10px', borderRadius: 5, fontSize: 12, ...MONO,
                                border: `1px solid ${hidden ? 'rgba(239,68,68,0.35)' : 'var(--border)'}`,
                                background: hidden ? 'var(--invalid-dim)' : 'var(--bg-hover)',
                                color: hidden ? '#ef4444' : 'var(--text-heading)',
                                textDecoration: hidden ? 'line-through' : 'none',
                              }}>
                                {hidden && (
                                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ flexShrink: 0 }}>
                                    <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                                  </svg>
                                )}
                                {col.name}
                                <span style={{ color: hidden ? 'rgba(239,68,68,0.6)' : 'var(--text-tertiary)', fontSize: 10.5 }}>{col.type}</span>
                              </span>
                            )
                          })}
                        </div>
                      )}

                      {/* Row filter */}
                      {rowFilter && isAllowed && (
                        <div style={{ padding: '7px 14px 10px', borderTop: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#d97706', marginBottom: 5, ...MONO }}>
                            Row filter (WHERE)
                          </div>
                          <code style={{ fontSize: 12, color: '#78350f', ...MONO, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{rowFilter}</code>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', paddingTop: 6, marginTop: 2, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--bg-hover)', border: '1px solid var(--border)', display: 'inline-block' }} />
                    Visible to agents
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#ef4444' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.35)', display: 'inline-block' }} />
                    Hidden from agents
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#d97706' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', display: 'inline-block' }} />
                    Row filter active
                  </div>
                  {schemaTables.some(t => !source.allowed_tables.includes(t.name) && source.allowed_tables.length > 0) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-tertiary)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--bg-hover)', border: '1px solid var(--border)', display: 'inline-block' }} />
                      Not exposed to agents
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>
          )}
        </>
      )}

      {/* Used by agents */}
      <SectionCard title="Used by agents">
        {usingAgents.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            No agents are currently using this source.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {usingAgents.map(a => (
              <div key={a.agent_id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 12px', borderRadius: 7,
                background: 'var(--bg-hover)', border: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                  background: 'var(--blue-dim)', border: '1px solid var(--blue-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5" r="3" stroke="var(--blue)" strokeWidth="1.4"/>
                    <path d="M2 14c0-2.76 2.69-5 6-5s6 2.24 6 5" stroke="var(--blue)" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                  <div style={{ fontSize: 11, ...MONO, color: 'var(--text-secondary)' }}>{a.model_id}</div>
                </div>
                <span style={{
                  fontSize: 10.5, ...MONO, padding: '2px 7px', borderRadius: 4,
                  background: a.provider === 'anthropic' ? 'var(--blue-dim)' : 'rgba(11,16,32,0.05)',
                  border: `1px solid ${a.provider === 'anthropic' ? 'var(--blue-border)' : 'var(--border)'}`,
                  color: a.provider === 'anthropic' ? 'var(--blue)' : 'var(--text-secondary)',
                }}>
                  {a.provider}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {showDeleteConfirm && (
        <ConfirmModal
          message={`Delete "${source.name}"? All indexed content will be permanently removed.`}
          confirmLabel="Delete Source"
          onConfirm={confirmDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}

      {fileToDelete && (
        <ConfirmModal
          message={`Delete "${fileToDelete.length > 60 ? '…' + fileToDelete.slice(-55) : fileToDelete}"? This will remove all its indexed chunks.`}
          confirmLabel="Delete File"
          onConfirm={confirmDeleteFile}
          onClose={() => setFileToDelete(null)}
        />
      )}

      {showEdit && (
        <EditModal
          source={source}
          onClose={() => setShowEdit(false)}
          onSaved={updated => { onUpdated(updated); setShowEdit(false) }}
        />
      )}
    </div>
  )
}

// ─── source list item ─────────────────────────────────────────────────────────

function SourceItem({ source, active, onClick }: { source: DataSourceRecord; active: boolean; onClick: () => void }) {
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

// ─── empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
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
            borderRadius: 7, border: `1px solid ${TYPE_META[t].border}`,
            background: TYPE_META[t].dim, color: TYPE_META[t].color,
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

// ─── skeleton ─────────────────────────────────────────────────────────────────

function Bone({
  h, w, r = 6, delay = 0, style,
}: {
  h: number | string
  w: number | string
  r?: number
  delay?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      className="skeleton-bone"
      style={{
        height: h,
        width: w,
        borderRadius: r,
        ['--skel-delay' as string]: `${delay}s`,
        ...style,
      }}
    />
  )
}

function SourceListSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading data sources">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '10px 16px',
            borderBottom: '1px solid var(--skeleton-border)',
            borderLeft: '2px solid transparent',
          }}
        >
          <Bone h={26} w={26} r={7} delay={i * 0.05} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Bone h={12} w={`${58 + (i % 3) * 12}%`} delay={i * 0.05 + 0.04} style={{ maxWidth: 160 }} />
            <Bone h={9} w={52} delay={i * 0.05 + 0.08} style={{ marginTop: 6 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function SourceDetailSkeleton() {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 22 }}
      aria-busy="true"
      aria-label="Loading source details"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <Bone h={52} w={52} r={12} />
          <div>
            <Bone h={22} w={200} delay={0.04} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Bone h={22} w={84} r={5} delay={0.08} />
              <Bone h={22} w={64} r={5} delay={0.1} />
            </div>
            <Bone h={12} w={280} delay={0.12} style={{ marginTop: 12, maxWidth: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Bone h={32} w={72} r={6} delay={0.06} />
          <Bone h={32} w={72} r={6} delay={0.1} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              background: 'var(--skeleton-card)',
              border: '1px solid var(--skeleton-border)',
              borderRadius: 12,
              padding: '16px 18px',
            }}
          >
            <Bone h={10} w={72} delay={0.14 + i * 0.04} />
            <Bone h={24} w={48} delay={0.18 + i * 0.04} style={{ marginTop: 12 }} />
          </div>
        ))}
      </div>

      <div
        style={{
          background: 'var(--skeleton-card)',
          border: '1px solid var(--skeleton-border)',
          borderRadius: 12,
          padding: 20,
          minHeight: 180,
        }}
      >
        <Bone h={12} w={100} delay={0.28} style={{ marginBottom: 16 }} />
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 0',
              borderBottom: i < 3 ? '1px solid var(--skeleton-border)' : 'none',
            }}
          >
            <Bone h={28} w={28} r={6} delay={0.3 + i * 0.05} />
            <Bone h={12} w={`${40 + i * 10}%`} delay={0.32 + i * 0.05} style={{ maxWidth: 280 }} />
            <Bone h={10} w={48} delay={0.34 + i * 0.05} style={{ marginLeft: 'auto' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function DataSourcesPage() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<DataSourceRecord | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<SourceType | 'all'>('all')
  const [mobileShowDetail, setMobileShowDetail] = useState(false)
  const initializedRef = useRef(false)

  const { data: sources = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.dataSources,
    queryFn: () => listDataSources().catch(() => [] as DataSourceRecord[]),
  })

  useEffect(() => {
    if (initializedRef.current || loading) return
    initializedRef.current = true
    if (sources.length > 0) setSelected(sources[0])
  }, [loading, sources])

  const handleCreated = (src: DataSourceRecord) => {
    queryClient.setQueryData<DataSourceRecord[]>(queryKeys.dataSources, (prev = []) => [src, ...prev])
    setSelected(src)
    setMobileShowDetail(true)
    setShowCreate(false)
  }

  const handleDeleted = () => {
    const deletedId = selected?.source_id
    queryClient.setQueryData<DataSourceRecord[]>(queryKeys.dataSources, (prev = []) => {
      const next = prev.filter(s => s.source_id !== deletedId)
      setSelected(next[0] ?? null)
      setMobileShowDetail(false)
      return next
    })
  }

  const handleUpdated = (updated: DataSourceRecord) => {
    queryClient.setQueryData<DataSourceRecord[]>(queryKeys.dataSources, (prev = []) =>
      prev.map(s => s.source_id === updated.source_id ? updated : s)
    )
    setSelected(updated)
  }

  const openSource = (src: DataSourceRecord) => {
    setSelected(src)
    setMobileShowDetail(true)
  }

  const filtered = sources.filter(s => {
    if (filterType !== 'all' && s.source_type !== filterType) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div
      className={`ds-page${mobileShowDetail ? ' is-detail-open' : ''}`}
      style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg-surface)', ...SANS }}
    >

      {/* Left panel — header fixed, list scrolls */}
      <div
        className="ds-list-pane"
        style={{
        width: 268, minWidth: 268, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--card-bg)',
      }}>
        {/* Header: title + button + search + filter — never scrolls */}
        <div className="ds-list-chrome" style={{ flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          {/* Title row */}
          <div className="ds-list-header" style={{ padding: '20px 16px 12px' }}>
            <div style={{ fontSize: 10, ...MONO, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>
              Data Sources
            </div>
            <h2 style={{ ...SANS, fontSize: 16, fontWeight: 500, color: 'var(--text-heading)', margin: '0 0 10px' }}>Sources</h2>
            <button className="ds-new-btn" onClick={() => setShowCreate(true)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%', padding: '9px', borderRadius: 999,
              background: 'var(--accent-soft)', border: '1px solid var(--blue-border)', color: 'var(--accent-text)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600, ...SANS,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              New source
            </button>
          </div>

          {/* Search */}
          <div className="ds-list-search" style={{ padding: '0 12px 10px', position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sources…"
              style={{
                width: '100%', ...SANS, fontSize: 13, padding: '10px 28px 10px 36px',
                minHeight: 40,
                backgroundColor: 'var(--bg-page)', color: 'var(--text-heading)',
                border: '1px solid var(--border)', borderRadius: 8,
                boxSizing: 'border-box', outline: 'none',
                colorScheme: 'dark light',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-tertiary)',
                cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0,
              }}>×</button>
            )}
          </div>

          {/* Type filter dropdown */}
          <div className="ds-list-filter" style={{ padding: '0 12px 12px' }}>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as SourceType | 'all')}
              style={{
                width: '100%', ...SANS, fontSize: 14, padding: '10px 12px',
                minHeight: 40,
                backgroundColor: 'var(--bg-page)', color: 'var(--text-heading)',
                border: '1px solid var(--border)', borderRadius: 8,
                boxSizing: 'border-box', outline: 'none', cursor: 'pointer',
                colorScheme: 'dark light',
              }}
            >
              <option value="all">ALL TYPES</option>
              <option value="document">DOCUMENT</option>
              <option value="database">DATABASE</option>
              <option value="website">WEBSITE</option>
            </select>
          </div>
        </div>

        {/* Source list — only this part scrolls */}
        <div className="ds-source-list" style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <SourceListSkeleton />
          ) : sources.length === 0 ? (
            <div style={{ padding: '20px 16px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>No sources yet.</div>
              {(['document', 'database', 'website'] as SourceType[]).map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                  <TypeIcon type={t} size={12} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{TYPE_META[t].label}</span>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '20px 16px', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
              No sources match.
            </div>
          ) : filtered.map(src => (
            <SourceItem
              key={src.source_id}
              source={src}
              active={selected?.source_id === src.source_id}
              onClick={() => openSource(src)}
            />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div
        className="ds-detail-pane"
        style={{ flex: 1, overflowY: 'auto', padding: '36px 48px', background: 'var(--bg-surface)' }}
      >
        {loading ? (
          <SourceDetailSkeleton />
        ) : selected ? (
          <SourceDetail
            key={selected.source_id}
            source={selected}
            onDeleted={handleDeleted}
            onUpdated={handleUpdated}
            onBack={() => setMobileShowDetail(false)}
          />
        ) : (
          <EmptyState onNew={() => setShowCreate(true)} />
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
    </div>
  )
}
