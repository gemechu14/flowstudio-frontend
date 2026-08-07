import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../contexts/AuthContext'
import {
  getCatalog, getSubmissions,
  type CommunityToolCard, CATEGORIES,
} from '../api/communityTools.api'
import { invalidateDashboardStats } from '../../../shared/api/queryClient'
import { queryKeys } from '../../../shared/api/queryKeys'
import { CommunityToolCardItem } from '../components/CommunityToolCardItem'
import { CommunityListSkeleton } from '../components/CommunityListSkeleton'
import { MONO, SANS, FIELD, SELECT, focusField, blurField } from '../lib/communityToolsUi'

export default function CommunityToolsPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'catalog' | 'submissions'>('catalog')
  const [filterCategory, setFilterCategory] = useState('all')
  const [search, setSearch] = useState('')

  const { data: catalog = [], isLoading: catalogLoading } = useQuery({
    queryKey: queryKeys.communityCatalog,
    queryFn: () => getCatalog().catch(() => [] as CommunityToolCard[]),
  })

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: queryKeys.communitySubmissions,
    queryFn: () => getSubmissions().catch(() => [] as CommunityToolCard[]),
    enabled: isSuperAdmin,
  })

  const loading = catalogLoading || (isSuperAdmin && submissionsLoading)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.communityCatalog })
    if (isSuperAdmin) {
      queryClient.invalidateQueries({ queryKey: queryKeys.communitySubmissions })
    }
    invalidateDashboardStats()
  }

  const displayed = (tab === 'catalog' ? catalog : submissions).filter(t => {
    const matchCat = filterCategory === 'all' || t.category === filterCategory
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div
      className="ct-page"
      style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-surface)', ...SANS,
    }}>
      <div
        className="ct-header"
        style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 28px 16px', borderBottom: '1px solid var(--border)',
        flexShrink: 0, background: 'var(--bg-surface)',
      }}>
        <div>
          <div style={{ ...MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--accent)', marginBottom: 6 }}>
            TOOL LIBRARY
          </div>
          <h2 style={{ ...SANS, fontSize: 16, fontWeight: 500, color: 'var(--text-heading)', margin: 0 }}>
            Community Tools
          </h2>
          <p style={{ ...SANS, fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>
            Browse and enable tools built by the community.
          </p>
        </div>
      </div>

      <div className="ct-body" style={{ flex: 1, overflowY: 'auto', padding: '16px 28px 32px' }}>
        <div
          className="ct-tabs"
          style={{
          display: 'flex', gap: 0, marginBottom: 16,
          borderBottom: '1px solid var(--border)', overflowX: 'auto',
        }}>
          {(['catalog', ...(isSuperAdmin ? ['submissions'] as const : [])] as const).map(t => {
            const active = tab === t
            const count = t === 'catalog' ? catalog.length : submissions.length
            return (
              <button
                key={t}
                onClick={() => setTab(t as 'catalog' | 'submissions')}
                style={{
                  ...SANS, fontSize: 12, padding: '11px 14px',
                  background: 'none', border: 'none',
                  borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontWeight: active ? 600 : 500,
                  marginBottom: -1, whiteSpace: 'nowrap',
                }}
              >
                {t === 'catalog' ? 'Catalog' : 'Submissions'}
                <span style={{
                  marginLeft: 6, fontSize: 10, padding: '1px 6px',
                  background: active ? 'var(--accent-soft)' : 'var(--bg-hover)',
                  color: active ? 'var(--accent)' : 'var(--text-tertiary)',
                  borderRadius: 8, fontWeight: 600,
                }}>{count}</span>
              </button>
            )
          })}
        </div>

        <div className="ct-filters" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="ct-search" style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tools by name or description…"
              style={{ ...FIELD, width: '100%', paddingLeft: 38, minHeight: 42 }}
              onFocus={focusField}
              onBlur={blurField}
            />
          </div>
          <select
            className="ct-category"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={{ ...SELECT, minHeight: 42 }}
            onFocus={focusField}
            onBlur={blurField}
          >
            <option value="all">ALL CATEGORIES</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
        </div>

        {loading ? (
          <CommunityListSkeleton count={5} />
        ) : displayed.length === 0 ? (
          <div style={{
            ...SANS, fontSize: 13, color: 'var(--text-secondary)',
            padding: '48px 0', textAlign: 'center',
          }}>
            {tab === 'catalog' ? 'No community tools yet.' : 'No pending submissions.'}
          </div>
        ) : (
          displayed.map(tool => (
            <CommunityToolCardItem
              key={tool.tool_id}
              tool={tool}
              isSuperAdmin={isSuperAdmin}
              onAction={refresh}
            />
          ))
        )}
      </div>
    </div>
  )
}

