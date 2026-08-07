import { useState } from 'react'
import { LABEL, parseLocalDate, todayLocalStr } from '../lib/dashboardUi'

export function ActivityChart({ data }: { data: { date: string; count: number }[] }) {
  const rawMax = Math.max(...data.map(d => d.count), 0)
  const max = Math.max(rawMax, 4)
  const today = todayLocalStr()
  const ticks = Array.from({ length: max + 1 }, (_, i) => max - i)
  const [hover, setHover] = useState<{ date: string; count: number; x: number; y: number } | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <span style={LABEL}>Activity · Last 7 Days</span>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          paddingBottom: 22, flexShrink: 0, width: 14,
        }}>
          {ticks.map((t) => (
            <span key={t} style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)',
              lineHeight: 1, textAlign: 'right',
            }}>
              {t}
            </span>
          ))}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            {ticks.map((t) => (
              <div key={t} style={{
                position: 'absolute', left: 0, right: 0,
                top: `${((max - t) / max) * 100}%`,
                borderTop: t === 0 ? 'none' : '1px dashed var(--border)',
              }} />
            ))}
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'flex-end', gap: 8, paddingBottom: 0,
            }}>
              {data.map((d) => {
                const pct = d.count === 0 ? 0 : (d.count / max) * 100
                const isToday = d.date === today
                const dayLabel = parseLocalDate(d.date).toLocaleDateString('en', { weekday: 'short' })
                return (
                  <div
                    key={d.date}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'flex-end',
                      justifyContent: 'center', height: '100%', cursor: 'pointer',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const parent = e.currentTarget.closest('[data-activity-chart]')?.getBoundingClientRect()
                      setHover({
                        date: dayLabel,
                        count: d.count,
                        x: rect.left + rect.width / 2 - (parent?.left ?? 0),
                        y: rect.top - (parent?.top ?? 0) - 8,
                      })
                    }}
                    onMouseLeave={() => setHover(null)}
                  >
                    <div style={{
                      width: '70%',
                      maxWidth: 36,
                      height: d.count === 0 ? 4 : `${pct}%`,
                      borderRadius: '8px 8px 2px 2px',
                      background: d.count === 0 ? 'var(--border)' : 'var(--accent)',
                      opacity: d.count === 0 ? 0.45 : 1,
                      boxShadow: isToday && d.count > 0 ? '0 4px 16px rgba(59,130,246,0.4)' : 'none',
                      minHeight: d.count > 0 ? 6 : 4,
                      transition: 'height 0.3s ease, opacity 0.15s ease, filter 0.15s ease',
                      filter: hover?.date === dayLabel ? 'brightness(1.15)' : 'none',
                    }} />
                  </div>
                )
              })}
            </div>

            {hover && (
              <div style={{
                position: 'absolute',
                left: hover.x,
                top: Math.max(4, hover.y - 28),
                transform: 'translateX(-50%)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 8,
                padding: '6px 10px',
                pointerEvents: 'none',
                zIndex: 5,
                boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
                whiteSpace: 'nowrap',
              }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: 'var(--text-heading)' }}>
                  {hover.count} {hover.count === 1 ? 'run' : 'runs'}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {hover.date}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexShrink: 0 }}>
            {data.map((d) => {
              const full = parseLocalDate(d.date).toLocaleDateString('en', { weekday: 'short' })
              const short = full.charAt(0)
              return (
                <div key={d.date} style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--text-tertiary)',
                  }}>
                    <span className="chart-day-full">{full}</span>
                    <span className="chart-day-short">{short}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
