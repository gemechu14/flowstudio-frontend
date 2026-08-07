import { useState } from 'react'
import type { FileInfo } from '../api/dataSources.api'
import { MONO, Ic } from '../lib/dataSourcesUi'

export function FileRow({ file, onDelete }: { file: FileInfo; onDelete: () => void }) {
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
