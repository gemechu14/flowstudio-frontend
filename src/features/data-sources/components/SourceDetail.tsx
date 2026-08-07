import { useState, useEffect } from 'react'
import ConfirmModal from '../../../shared/components/ui/ConfirmModal'
import {
  type DataSourceRecord,
  type FileInfo,
  type TableInfo,
  testConnection,
  uploadDocument,
  listFiles,
  deleteFile,
  deleteDataSource,
  crawlWebsite,
  schemaFromUrl,
} from '../api/dataSources.api'
import { type AgentRecord, listAgents } from '../../agents/api/agents.api'
import { TypeBadge } from './TypeBadge'
import { DropZone } from './DropZone'
import { FileRow } from './FileRow'
import { CrawledPageRow } from './CrawledPageRow'
import { SectionCard } from './SectionCard'
import { Metric } from './Metric'
import { Notice } from './Notice'
import { EditDataSourceModal } from './EditDataSourceModal'
import { MONO, SANS, Ic, TYPE_META } from '../lib/dataSourcesUi'

export function SourceDetail({
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
            ...btnBase, background: 'var(--accent)', color: 'var(--btn-upload-text)',
            border: '1px solid var(--accent)', fontSize: 12.5,
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
              background: 'var(--accent)',
              color: 'var(--btn-upload-text)', border: '1px solid var(--accent)',
              fontWeight: 600, opacity: crawling ? 0.7 : 1,
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
                ...btnBase, background: 'var(--accent)', color: 'var(--btn-upload-text)',
                border: '1px solid var(--accent)', fontWeight: 600,
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
        <EditDataSourceModal
          source={source}
          onClose={() => setShowEdit(false)}
          onSaved={(updated: DataSourceRecord) => { onUpdated(updated); setShowEdit(false) }}
        />
      )}
    </div>
  )
}

