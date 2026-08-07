import { useState, useEffect } from 'react'
import { FilterBuilder, conditionsToSql, sqlToConditions, type Condition } from '../../../shared/components/ui/FilterBuilder'
import {
  type DataSourceRecord,
  type CreateDataSourcePayload,
  type TableInfo,
  updateDataSource,
  schemaFromUrl,
} from '../api/dataSources.api'
import {
  MONO, Ic, TYPE_META,
  CRAWL_SCHEDULES,
} from '../lib/dataSourcesUi'

type EditStep = 'connect' | 'tables' | 'filters'

export function EditDataSourceModal({ source, onClose, onSaved }: {
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
                  background: 'var(--accent)', color: 'var(--btn-upload-text)', border: '1px solid var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  opacity: schemaLoading || !name.trim() ? 0.5 : 1,
                }}>
                {schemaLoading ? 'Loading…' : 'Continue →'}
              </button>
            )}
            {/* Connect step → save (doc / website) */}
            {step === 'connect' && !isDb && (
              <button onClick={handleSave} disabled={saving || !name.trim()} style={{
                padding: '7px 18px', borderRadius: 7, background: 'var(--accent)', color: 'var(--btn-upload-text)', border: '1px solid var(--accent)',
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
                background: 'var(--accent)', color: 'var(--btn-upload-text)', border: '1px solid var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                opacity: !canContinueTables ? 0.5 : 1,
              }}>
                Continue →
              </button>
            )}
            {/* Filters → save */}
            {step === 'filters' && (
              <button onClick={handleSave} disabled={saving} style={{
                padding: '7px 18px', borderRadius: 7, background: 'var(--accent)', color: 'var(--btn-upload-text)', border: '1px solid var(--accent)',
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
