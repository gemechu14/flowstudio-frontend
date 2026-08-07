import { useState } from 'react'
import type { FileInfo } from '../api/dataSources.api'
import { MONO, Ic, TYPE_META } from '../lib/dataSourcesUi'

export function CrawledPageRow({ file, onDelete }: { file: FileInfo; onDelete: () => void }) {
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
