import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type DataSourceRecord,
  type SourceType,
  listDataSources,
} from '../api/dataSources.api'
import { queryKeys } from '../../../shared/api/queryKeys'
import { CreateDataSourceModal as CreateModal } from '../components/CreateDataSourceModal'
import { SourceDetail } from '../components/SourceDetail'
import { SourceItem } from '../components/SourceItem'
import { EmptyState } from '../components/EmptyState'
import { TypeIcon } from '../components/TypeBadge'
import { SourceListSkeleton, SourceDetailSkeleton } from '../components/DataSourcesSkeleton'
import { MONO, SANS, TYPE_META } from '../lib/dataSourcesUi'

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
              background: 'var(--accent)', border: '1px solid var(--accent)', color: 'var(--btn-upload-text)',
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

