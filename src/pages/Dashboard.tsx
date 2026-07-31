import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RunSummary {
  run_id: string
  workflow_id: string
  workflow_name: string
  status: string
  execution_mode: string
  total_input_tokens: number
  total_output_tokens: number
  started_at: string
  completed_at: string | null
}

interface Stats {
  agent_count: number
  workflow_count: number
  tool_count: number
  datasource_count: number
  total_runs: number
  runs_today: number
  runs_this_week: number
  total_tokens_today: number
  total_tokens_week: number
  recent_runs: RunSummary[]
  runs_by_day: { date: string; count: number }[]
  runs_by_status: Record<string, number>
  runs_by_mode: Record<string, number>
  agents_by_provider: Record<string, number>
  workflows_by_mode: Record<string, number>
  tools_by_status: Record<string, number>
  top_workflow: string
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#22C55E',
  failed:    '#A1A1AA',
  running:   '#60A5FA',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const LABEL: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
  letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)',
}

function Card({ children, style, onClick, ...rest }: {
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: () => void
} & React.HTMLAttributes<HTMLDivElement>) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--card-bg)',
        borderRadius: 12,
        border: '1px solid var(--card-border)',
        boxShadow: hovered && onClick ? 'var(--card-shadow-hover)' : 'var(--card-shadow)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s, border-color 0.2s, background-color 0.25s',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}

function ModeBadge({ mode }: { mode: string }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 500,
      fontFamily: 'var(--font-mono)',
      color: 'var(--text-secondary)',
      textTransform: 'lowercase',
      whiteSpace: 'nowrap',
    }}>
      {mode.replace('_', ' ')}
    </span>
  )
}

function StatusChip({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#888'
  const isCompleted = status === 'completed'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0,
        boxShadow: isCompleted ? `0 0 0 3px ${color}22` : 'none',
      }} />
      <span style={{
        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
        color: isCompleted ? 'var(--text-primary)' : color,
        textTransform: 'capitalize',
      }}>
        {status}
      </span>
    </span>
  )
}

function parseLocalDate(iso: string): Date {
  return new Date(iso + 'T12:00:00')
}

function todayLocalStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ActivityChart({ data }: { data: { date: string; count: number }[] }) {
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
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {hover.count} {hover.count === 1 ? 'run' : 'runs'}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {hover.date}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexShrink: 0 }}>
            {data.map((d) => (
              <div key={d.date} style={{ flex: 1, textAlign: 'center' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--text-tertiary)',
                }}>
                  {parseLocalDate(d.date).toLocaleDateString('en', { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label, value, subtitle, icon, onClick,
}: {
  label: string
  value: number | string
  subtitle: React.ReactNode
  icon: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Card onClick={onClick}>
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={LABEL}>{label}</span>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'var(--accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-text)',
          }}>
            {icon}
          </div>
        </div>
        <div style={{
          marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 750,
          color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.03em',
        }}>
          {value}
        </div>
        <div style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
          {subtitle}
        </div>
      </div>
    </Card>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<Stats>('/workflows/dashboard/stats')
      .then(setStats)
      .catch(e => setError(e?.message ?? 'Failed to load'))
  }, [])

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--invalid)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      {error}
    </div>
  )

  if (!stats) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      Loading…
    </div>
  )

  const totalByStatus = Object.values(stats.runs_by_status).reduce((a, b) => a + b, 0)
  const successRate = totalByStatus > 0
    ? Math.round(((stats.runs_by_status.completed ?? 0) / totalByStatus) * 100)
    : 0
  const providerEntries = Object.entries(stats.agents_by_provider)
  const workflowModeText = Object.entries(stats.workflows_by_mode)
    .map(([m, c]) => `${m.replace('_', '-')} · ${c}`)
    .join('  ') || 'none configured'
  const toolsText = Object.keys(stats.tools_by_status).length === 0
    ? 'none configured'
    : Object.entries(stats.tools_by_status).map(([s, c]) => `${c} ${s}`).join(' · ')
  const providerText = providerEntries.length === 0
    ? 'none configured'
    : providerEntries.map(([p, c]) => `${p} · ${c}`).join('  ')

  return (
    <div style={{
      height: '100%', width: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '20px 24px', gap: 14,
      boxSizing: 'border-box', overflow: 'hidden',
      background: 'var(--bg-page)',
      transition: 'background-color 0.25s ease',
    }}>

      {/* Stat cards — unified blue accent like dark reference */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, flexShrink: 0 }}>
        <StatCard
          label="Agents"
          value={stats.agent_count}
          subtitle={providerText}
          onClick={() => navigate('/agents')}
          icon={(
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2 14c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        />
        <StatCard
          label="Workflows"
          value={stats.workflow_count}
          subtitle={workflowModeText}
          onClick={() => navigate('/workflows')}
          icon={(
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="13" cy="4" r="2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="13" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 8H8.5M8.5 8L11 4M8.5 8L11 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        />
        <StatCard
          label="Tools"
          value={stats.tool_count}
          subtitle={toolsText}
          onClick={() => navigate('/tools')}
          icon={(
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M10.5 1.5C10.5 1.5 13 2 13.5 4.5C14 7 12 8.5 12 8.5L4.5 15.5L0.5 11.5L7.5 4C7.5 4 8.5 1.5 10.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="10.5" cy="4.5" r="1" fill="currentColor"/>
            </svg>
          )}
        />
        <StatCard
          label="Runs This Week"
          value={stats.runs_this_week}
          subtitle={`${stats.runs_today} today · ${successRate}% success`}
          onClick={() => navigate('/workflows')}
          icon={(
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <polyline points="1,11 5,6 9,8 15,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M1 14h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          )}
        />
      </div>

      {/* Activity + status / tokens */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, flexShrink: 0, minHeight: 240 }}>
        <Card style={{ padding: '18px 20px', height: 240, overflow: 'visible' }} data-activity-chart>
          <ActivityChart data={stats.runs_by_day} />
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
          <Card style={{ padding: '18px 20px', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <span style={{ ...LABEL, marginBottom: 16 }}>By Status</span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
                {Object.keys(stats.runs_by_status).length === 0 ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>No runs yet</span>
                ) : (
                  Object.entries(stats.runs_by_status).map(([s, c]) => {
                    const color = STATUS_COLORS[s] ?? 'var(--accent)'
                    const pct = totalByStatus > 0 ? Math.round((c / totalByStatus) * 100) : 0
                    return (
                      <div key={s}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                          <span style={{
                            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                            color: 'var(--text-primary)', textTransform: 'capitalize',
                          }}>
                            {s}
                          </span>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)' }}>
                            {c} runs · {pct}%
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
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </Card>

          <Card style={{ padding: '16px 20px' }}>
            <span style={{ ...LABEL, display: 'block', marginBottom: 12 }}>Token Usage</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Today</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 750, color: 'var(--accent-text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {fmt(stats.total_tokens_today)}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>This Week</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 750, color: 'var(--accent-text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {fmt(stats.total_tokens_week)}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent runs */}
      <Card style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderBottom: '1px solid var(--card-border)', flexShrink: 0,
        }}>
          <span style={LABEL}>Recent Runs</span>
          <button
            onClick={() => navigate('/workflows')}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent-text)',
              cursor: 'pointer', background: 'none', border: 'none', fontWeight: 600, padding: 0,
            }}
          >
            View all
          </button>
        </div>

        {stats.recent_runs.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            No runs yet — run a workflow to see activity here.
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 120px 120px 80px 80px', gap: 12,
              padding: '10px 18px', borderBottom: '1px solid var(--card-border)',
              position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1,
            }}>
              {['Workflow', 'Mode', 'Status', 'Tokens', 'When'].map(h => (
                <span key={h} style={LABEL}>{h}</span>
              ))}
            </div>

            {stats.recent_runs.map((run, i) => (
              <div
                key={run.run_id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 120px 80px 80px',
                  gap: 12, padding: '14px 18px', alignItems: 'center',
                  borderBottom: i < stats.recent_runs.length - 1 ? '1px solid var(--card-border)' : 'none',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 1,
                    border: '1px solid var(--card-border)', background: 'var(--accent-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent-text)',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="9" width="14" height="10" rx="2" />
                      <path d="M9 9V7a3 3 0 0 1 6 0v2" />
                      <circle cx="9.5" cy="14" r="1" fill="currentColor" stroke="none" />
                      <circle cx="14.5" cy="14" r="1" fill="currentColor" stroke="none" />
                      <path d="M12 3v2" />
                    </svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {run.workflow_name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>
                      run_{run.run_id.replace(/^run_/, '').slice(0, 8)}
                    </div>
                  </div>
                </div>
                <ModeBadge mode={run.execution_mode} />
                <StatusChip status={run.status} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                  {fmt(run.total_output_tokens)}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {timeAgo(run.started_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
