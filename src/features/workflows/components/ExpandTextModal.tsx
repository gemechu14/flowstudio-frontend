import { MONO } from '../lib/workflowsUi'

export function ExpandTextModal({
  label,
  value,
  rows,
  placeholder,
  onChange,
  onCancel,
  onApply,
}: {
  label: string
  value: string
  rows: number
  placeholder: string
  onChange: (v: string) => void
  onCancel: () => void
  onApply: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12, padding: 24,
          width: 640, maxWidth: '92vw',
          display: 'flex', flexDirection: 'column', gap: 14,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color: 'var(--accent-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {label}
          </span>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
          >×</button>
        </div>
        <textarea
          autoFocus
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          style={{
            width: '100%', boxSizing: 'border-box',
            fontSize: 13, lineHeight: 1.6,
            padding: '10px 14px',
            background: 'var(--bg-page)', color: 'var(--text-body)',
            border: '1px solid var(--blue-border)',
            borderRadius: 7, resize: 'vertical',
            fontFamily: 'var(--font-sans)',
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ ...MONO, fontSize: 11, padding: '7px 18px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-muted)' }}
          >Cancel</button>
          <button
            onClick={onApply}
            style={{ ...MONO, fontSize: 11, padding: '7px 18px', background: 'var(--accent)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--btn-upload-text)', fontWeight: 700 }}
          >Apply</button>
        </div>
      </div>
    </div>
  )
}
