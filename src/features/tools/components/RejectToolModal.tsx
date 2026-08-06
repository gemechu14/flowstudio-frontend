import { useState } from 'react'
import type { ToolRecord } from '../api/tools.api'
import { MONO } from '../lib/toolsUi'

export function RejectToolModal({ tool, onConfirm, onClose }: {
  tool: ToolRecord
  onConfirm: (reason: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 420, background: 'var(--bg-card)', borderRadius: 12,
        border: '1px solid var(--border)', padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 8 }}>
          Reject "{tool.name}"
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          Optionally explain why this tool was rejected.
        </div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason (optional)…"
          rows={3}
          style={{
            width: '100%', fontSize: 12, padding: '8px 10px',
            background: 'var(--bg-page)', color: 'var(--text-body)',
            border: '1px solid var(--border)', borderRadius: 6, resize: 'vertical',
            boxSizing: 'border-box', ...MONO,
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            ...MONO, fontSize: 12, padding: '7px 14px',
            background: 'var(--bg-page)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', borderRadius: 6, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={() => onConfirm(reason)} style={{
            ...MONO, fontSize: 12, padding: '7px 14px',
            background: '#EF4444', border: 'none', color: '#fff',
            borderRadius: 6, cursor: 'pointer', fontWeight: 700,
          }}>Reject Tool</button>
        </div>
      </div>
    </div>
  )
}
