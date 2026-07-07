import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { uploadTool, UploadResult } from '../../api/tools'
import { ApiError } from '../../api/client'

export interface UploadOutcome {
  toolName: string
  warnings: string[]
}

interface ToolUploaderProps {
  onUpload?: (outcome: UploadOutcome) => void
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export default function ToolUploader({ onUpload }: ToolUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [filename, setFilename] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.py')) return
    setFilename(file.name)
    setUploadState('uploading')
    setErrors([])
    setResult(null)

    try {
      const res = await uploadTool(file)
      setResult(res)
      setUploadState('success')
      onUpload?.({ toolName: res.tool_name, warnings: res.warnings })
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = err.detail as { errors?: string[] } | string
        const msgs = typeof detail === 'object' && detail.errors
          ? detail.errors
          : [String(detail)]
        setErrors(msgs)
      } else {
        setErrors(['Unexpected error. Is the backend running?'])
      }
      setUploadState('error')
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const reset = () => {
    setFilename(null)
    setUploadState('idle')
    setResult(null)
    setErrors([])
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept=".py" style={{ display: 'none' }} onChange={handleChange} />

      {uploadState === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--blue)' : 'rgba(11,16,32,0.18)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            background: isDragging ? 'var(--blue-dim)' : 'rgba(11,16,32,0.02)',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: isDragging ? 'var(--blue-dim)' : 'rgba(11,16,32,0.05)',
            border: `1px solid ${isDragging ? 'var(--blue-border)' : 'rgba(11,16,32,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isDragging ? 'var(--blue)' : 'var(--text-body)',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 13V4M10 4L7 7M10 4L13 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 14V16C3 16.5523 3.44772 17 4 17H16C16.5523 17 17 16.5523 17 16V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: isDragging ? 'var(--blue)' : 'var(--text-dark)' }}>
              Drop a <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>.py</span> file here or{' '}
              <span style={{ color: 'var(--blue)', textDecoration: 'underline' }}>click to browse</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-body)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
              Must extend the <code>Tool</code> ABC with a <code>run()</code> method
            </div>
          </div>
        </div>
      )}

      {(uploadState === 'uploading' || uploadState === 'success' || uploadState === 'error') && filename && (
        <div style={{
          border: `1px solid ${uploadState === 'error' ? 'rgba(239,68,68,0.3)' : uploadState === 'success' ? 'rgba(34,197,94,0.3)' : 'var(--border-light)'}`,
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          background: 'var(--bg-card)',
        }}>
          {/* File row */}
          <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'var(--blue-dim)', border: '1px solid var(--blue-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'var(--blue)',
              }}>
                .PY
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>
                  {filename}
                </div>
                <div style={{ fontSize: 11.5, marginTop: 2, color: uploadState === 'uploading' ? 'var(--untested)' : uploadState === 'success' ? 'var(--verified)' : 'var(--invalid)' }}>
                  {uploadState === 'uploading' && '⟳ Uploading and validating…'}
                  {uploadState === 'success' && `✓ Registered as "${result?.tool_name}"`}
                  {uploadState === 'error' && '✗ Validation failed'}
                </div>
              </div>
            </div>
            <button onClick={reset} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-body)', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}>
              ✕
            </button>
          </div>

          {/* Warnings */}
          {uploadState === 'success' && result && result.warnings.length > 0 && (
            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border-light)', background: 'rgba(245,158,11,0.05)' }}>
              {result.warnings.map((w, i) => (
                <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--untested)', lineHeight: 1.6 }}>
                  ⚠ {w}
                </div>
              ))}
            </div>
          )}

          {/* Errors */}
          {uploadState === 'error' && errors.length > 0 && (
            <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
              {errors.map((e, i) => (
                <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--invalid)', lineHeight: 1.7 }}>
                  ✗ {e}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
