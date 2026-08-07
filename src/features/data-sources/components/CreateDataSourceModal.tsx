import { useState } from 'react'
import { FilterBuilder, conditionsToSql, type Condition } from '../../../shared/components/ui/FilterBuilder'
import {
  type DataSourceRecord,
  type SourceType,
  type CreateDataSourcePayload,
  type TableInfo,
  createDataSource,
  schemaFromUrl,
} from '../api/dataSources.api'
import {
  MONO, SANS, Ic, TYPE_META,
  DIALECTS, CRAWL_SCHEDULES, DEFAULT_PORTS,
  type DbDialect,
} from '../lib/dataSourcesUi'

export function CreateDataSourceModal({ onClose, onCreated }: {
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
                background: 'var(--accent)', color: 'var(--btn-upload-text)',
                border: '1px solid var(--accent)',
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
                    background: 'var(--accent)', color: 'var(--btn-upload-text)',
                    cursor: schemaLoading ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600,
                    opacity: schemaLoading ? 0.7 : 1,
                  }}>
                    {schemaLoading ? 'Connecting…' : 'Connect & select tables →'}
                  </button>
                ) : (
                  <button onClick={handleCreate} disabled={saving} style={{
                    padding: '7px 20px', borderRadius: 6, border: 'none',
                    background: 'var(--accent)', color: 'var(--btn-upload-text)',
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
                background: 'var(--accent)', color: 'var(--btn-upload-text)',
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
                background: 'var(--accent)', color: 'var(--btn-upload-text)',
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

