import { useState } from 'react'
import { uploadTool, type ToolRecord } from '../api/tools.api'
import { MONO } from '../lib/toolsUi'

export function ToolUploadPanel({ onUploaded }: { onUploaded: (t: ToolRecord) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [requirements, setRequirements] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.py')) setFile(f)
    else setError('Only .py files are accepted.')
  }

  const submit = async () => {
    if (!file) return
    setUploading(true); setError(''); setWarnings([])
    try {
      const res = await uploadTool(file, requirements)
      setWarnings(res.warnings)
      onUploaded(res.tool)
      setFile(null); setRequirements('')
    } catch (e: any) {
      const detail = e.detail
      if (detail?.errors) setError(detail.errors.join(' · '))
      else setError(e.message || String(e))
    } finally { setUploading(false) }
  }

  return (
    <div
      className="tools-upload-panel"
      style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 20,
    }}>
      <div className="tools-upload-title" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 14 }}>
        Upload Custom Tool
      </div>

      {/* Drop zone */}
      <div
        className="tools-upload-drop"
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.py'; i.onchange = (e: any) => setFile(e.target.files[0]); i.click() }}
        style={{
          border: `2px dashed ${dragging ? '#1D5FFA' : 'var(--border)'}`,
          borderRadius: 8, padding: '20px', textAlign: 'center',
          cursor: 'pointer', marginBottom: 12,
          background: dragging ? '#1D5FFA0A' : 'var(--bg-page)',
          transition: 'all 0.15s',
        }}
      >
        {file ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ ...MONO, fontSize: 12, color: '#1D5FFA' }}>📄 {file.name}</span>
            <button
              onClick={e => { e.stopPropagation(); setFile(null) }}
              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 14 }}
            >×</button>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Drop a <span style={{ ...MONO, color: '#1D5FFA' }}>.py</span> file here or click to browse
          </div>
        )}
      </div>

      {/* Requirements */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
          REQUIREMENTS <span style={{ color: '#6B7280' }}>(optional — pip packages)</span>
        </div>
        <input
          value={requirements}
          onChange={e => setRequirements(e.target.value)}
          placeholder="e.g. requests, pandas>=2.0, httpx"
          style={{
            width: '100%', fontSize: 12, padding: '7px 10px',
            background: 'var(--bg-page)', color: 'var(--text-body)',
            border: '1px solid var(--border)', borderRadius: 6, ...MONO,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {error && (
        <div style={{
          ...MONO, fontSize: 11, color: '#EF4444', marginBottom: 10,
          padding: '8px 10px', background: '#EF444420',
          border: '1px solid #EF444440', borderRadius: 6,
        }}>{error}</div>
      )}

      {warnings.length > 0 && (
        <div style={{
          ...MONO, fontSize: 11, color: '#F59E0B', marginBottom: 10,
          padding: '8px 10px', background: '#F59E0B20',
          border: '1px solid #F59E0B40', borderRadius: 6,
        }}>
          ⚠ {warnings.join(' · ')}
        </div>
      )}

      <button
        className="tools-submit-btn"
        onClick={submit} disabled={!file || uploading}
        style={{
          ...MONO, fontSize: 12, padding: '8px 20px',
          background: !file || uploading ? 'var(--border)' : '#1D5FFA',
          color: !file || uploading ? 'var(--text-muted)' : '#fff',
          border: 'none', borderRadius: 6, cursor: !file || uploading ? 'not-allowed' : 'pointer',
          fontWeight: 700,
        }}
      >{uploading ? 'Uploading…' : 'Submit for Review'}</button>
    </div>
  )
}
