import { MONO, SANS } from '../lib/toolsUi'

export function ToolsEmptyState({ onEditor, onUpload, compact }: { onEditor: () => void; onUpload: () => void; compact?: boolean }) {
  return (
    <div
      className={`tools-empty-state${compact ? ' is-compact' : ''}`}
      style={{
      height: compact ? 'auto' : '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start', gap: 20, padding: compact ? '20px 16px' : '28px 32px',
      background: compact ? 'var(--card-bg)' : 'var(--bg-surface)',
      border: compact ? '1px solid var(--card-border)' : undefined,
      borderRadius: compact ? 14 : undefined,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, background: 'var(--accent)',
          border: '1px solid var(--accent)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--btn-upload-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
        </div>
        <div style={{ ...SANS, fontSize: 16, fontWeight: 500, color: 'var(--text-heading)', marginBottom: 6 }}>
          Add a Custom Tool
        </div>
        <div style={{ ...SANS, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 300 }}>
          Write Python directly in the editor, or upload an existing <span style={{ ...MONO, color: 'var(--accent)' }}>.py</span> file. Tools go through review before agents can use them.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexDirection: 'column', width: '100%', maxWidth: 280 }}>
        <button onClick={onEditor} style={{
          ...SANS, fontSize: 13, padding: '11px 16px', width: '100%',
          background: 'var(--btn-write-primary-bg)', color: 'var(--btn-write-primary-text)',
          border: '1px solid var(--btn-write-primary-bg)',
          borderRadius: 999, cursor: 'pointer', fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: 'none',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
          </svg>
          Write Code
        </button>
        <button onClick={onUpload} style={{
          ...SANS, fontSize: 13, padding: '11px 16px', width: '100%',
          background: 'var(--btn-write-bg)', color: 'var(--btn-write-text)',
          border: '1px solid var(--btn-write-border)',
          borderRadius: 999, cursor: 'pointer', fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Upload .py File
        </button>
      </div>

      <div style={{
        width: '100%', maxWidth: 320, background: 'var(--bg-page)',
        border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px',
      }}>
        <div style={{ ...MONO, fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.12em', marginBottom: 10 }}>
          TOOL LIFECYCLE
        </div>
        {[
          { step: '1', label: 'Upload or write a .py tool' },
          { step: '2', label: 'Review risk flags & approve' },
          { step: '3', label: 'Test before deploying' },
          { step: '4', label: 'Agents can now use it' },
        ].map(({ step, label }) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%', background: 'var(--accent-soft)',
              border: '1px solid var(--blue-border)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
              ...MONO, fontSize: 9, fontWeight: 700, color: 'var(--accent)',
            }}>{step}</span>
            <span style={{ ...SANS, fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
