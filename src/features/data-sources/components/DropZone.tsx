import { useState, useRef, useCallback, type DragEvent } from 'react'
import { MONO, Ic } from '../lib/dataSourcesUi'

export function DropZone({ onFile, uploading }: { onFile: (f: File) => void; uploading: boolean }) {
  const [dragging, setDragging] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const onDrop = useCallback((e: DragEvent) => {
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
