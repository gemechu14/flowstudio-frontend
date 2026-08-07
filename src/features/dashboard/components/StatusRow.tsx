import { useState } from 'react'

export function StatusRow({
  label, count, pct, color,
}: {
  label: string
  count: number
  pct: number
  color: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
          color: 'var(--text-heading)', textTransform: 'capitalize',
        }}>
          {label}
        </span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)' }}>
          {count} runs · {pct}%
        </span>
      </div>
      <div style={{ height: 8, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color,
          borderRadius: 999,
          transition: 'width 0.3s ease',
        }} />
      </div>
      {hovered && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: -8,
          transform: 'translate(-50%, -100%)',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '8px 12px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
          whiteSpace: 'nowrap',
          zIndex: 20,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
            color: 'var(--text-heading)', textTransform: 'capitalize', marginBottom: 2,
          }}>
            {label}
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)' }}>
            {count} runs · {pct}%
          </div>
        </div>
      )}
    </div>
  )
}
