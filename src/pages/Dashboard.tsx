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

// ─── Design tokens (light theme) ─────────────────────────────────────────────

const C = {
  agents:   '#7c3aed',
  workflow: '#0284c7',
  tools:    '#059669',
  runs:     '#d97706',
  blue:     '#1D5FFA',
  purple:   '#7c3aed',
  cyan:     '#0284c7',
  green:    '#059669',
  amber:    '#d97706',
  completed:'#16a34a',
  failed:   '#dc2626',
  running:  '#2563eb',
  border:   'rgba(11,16,32,0.08)',
  bg:       '#fafafb',
  card:     '#ffffff',
  textDark: '#0B1020',
  textMid:  '#4A5163',
  textSub:  '#8B92A4',
  shadow:   '0 1px 3px rgba(11,16,32,0.07),0 1px 2px rgba(11,16,32,0.04)',
  shadowHov:'0 4px 16px rgba(29,95,250,0.10),0 1px 3px rgba(11,16,32,0.08)',
}

const MODE_COLORS: Record<string, string> = {
  sequential:    '#2563eb',
  parallel:      '#7c3aed',
  hierarchical:  '#0891b2',
  hybrid:        '#d97706',
  collaborative: '#059669',
  event_driven:  '#ea580c',
}

const STATUS_COLORS: Record<string, string> = {
  completed: C.completed,
  failed:    C.failed,
  running:   C.running,
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

// ─── Shared pieces ────────────────────────────────────────────────────────────

const LABEL: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
  letterSpacing: '0.14em', textTransform: 'uppercase', color: C.textSub,
}

function Card({ children, style, accent, onClick }: {
  children: React.ReactNode
  style?: React.CSSProperties
  accent?: string
  onClick?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.card, borderRadius: 10,
        border: `1px solid ${C.border}`,
        boxShadow: hovered && onClick ? C.shadowHov : C.shadow,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        borderTop: accent ? `3px solid ${accent}` : undefined,
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function ModeBadge({ mode }: { mode: string }) {
  const color = MODE_COLORS[mode] ?? '#888'
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600,
      fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
      background: `${color}14`, color, border: `1px solid ${color}28`,
      whiteSpace: 'nowrap', display: 'inline-block',
    }}>
      {mode.replace('_', ' ')}
    </span>
  )
}

function StatusChip({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#888'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {status}
      </span>
    </span>
  )
}

// ─── Activity bar chart ───────────────────────────────────────────────────────

function parseLocalDate(iso: string): Date {
  // "YYYY-MM-DD" is parsed as UTC midnight by default, shifting the day back in positive
  // UTC offset timezones. Adding noon avoids the off-by-one-day problem.
  return new Date(iso + 'T12:00:00')
}

function todayLocalStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ActivityChart({ data, total }: { data: { date: string; count: number }[]; total: number }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const today = todayLocalStr()
  const GRID_LINES = 3
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
        <span style={LABEL}>Activity — Last 7 Days</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: C.textSub }}>
          <span style={{ color: C.blue, fontWeight: 700 }}>{total}</span> total runs
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Grid + bars */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          {/* Horizontal grid lines */}
          {Array.from({ length: GRID_LINES }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute', left: 0, right: 0,
              top: `${(i / (GRID_LINES - 1)) * 100}%`,
              borderTop: `1px dashed ${C.border}`,
              zIndex: 0,
            }} />
          ))}

          {/* Bars */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: 8, paddingBottom: 2 }}>
            {data.map((d) => {
              const pct = Math.max(2, (d.count / max) * 100)
              const isToday = d.date === today
              const isEmpty = d.count === 0
              return (
                <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
                  {/* Count label */}
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                    color: isToday ? C.blue : isEmpty ? 'transparent' : C.textSub,
                    lineHeight: 1,
                  }}>
                    {d.count}
                  </span>
                  {/* Bar */}
                  <div style={{
                    width: '100%',
                    height: `${pct}%`,
                    borderRadius: '4px 4px 2px 2px',
                    background: isToday
                      ? `linear-gradient(180deg, ${C.blue} 0%, #4580FF 100%)`
                      : isEmpty
                      ? `repeating-linear-gradient(45deg, ${C.border} 0px, ${C.border} 2px, transparent 2px, transparent 6px)`
                      : `linear-gradient(180deg, rgba(29,95,250,0.5) 0%, rgba(29,95,250,0.25) 100%)`,
                    border: isEmpty ? `1px solid ${C.border}` : 'none',
                    boxShadow: isToday ? `0 2px 8px rgba(29,95,250,0.25)` : 'none',
                    minHeight: 4,
                  }} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Day labels */}
        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexShrink: 0 }}>
          {data.map((d) => {
            const isToday = d.date === today
            return (
              <div key={d.date} style={{ flex: 1, textAlign: 'center' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: isToday ? 700 : 400,
                  color: isToday ? C.blue : C.textSub,
                }}>
                  {parseLocalDate(d.date).toLocaleDateString('en', { weekday: 'short' })}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.failed, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      {error}
    </div>
  )

  if (!stats) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.textSub, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      Loading…
    </div>
  )

  const totalByStatus = Object.values(stats.runs_by_status).reduce((a, b) => a + b, 0)
  const successRate = totalByStatus > 0
    ? Math.round(((stats.runs_by_status.completed ?? 0) / totalByStatus) * 100)
    : 0
  const totalByMode = Object.values(stats.runs_by_mode).reduce((a, b) => a + b, 0)
  const modeEntries = Object.entries(stats.runs_by_mode).sort((a, b) => b[1] - a[1])
  const providerEntries = Object.entries(stats.agents_by_provider)
  const todayRatio = stats.total_tokens_week > 0 ? stats.total_tokens_today / stats.total_tokens_week : 0

  return (
    <div style={{
      height: '100%', width: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '18px 22px', gap: 12,
      boxSizing: 'border-box', overflow: 'hidden',
      background: C.bg,
    }}>

      {/* ── Row 1: Stat cards ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, flexShrink: 0 }}>

        {/* Agents */}
        <Card accent={C.agents} onClick={() => navigate('/agents')}>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={LABEL}>Agents</span>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${C.agents}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: C.agents }}>
                  <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M2 14c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <div style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 34, fontWeight: 800, color: C.agents, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {stats.agent_count}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {providerEntries.map(([p, c]) => (
                <span key={p} style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                  color: p === 'anthropic' ? '#c87941' : '#10a37f',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                  {p} {c}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Workflows */}
        <Card accent={C.workflow} onClick={() => navigate('/workflows')}>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={LABEL}>Workflows</span>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${C.workflow}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: C.workflow }}>
                  <circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="13" cy="4" r="2" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="13" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 8H8.5M8.5 8L11 4M8.5 8L11 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <div style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 34, fontWeight: 800, color: C.workflow, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {stats.workflow_count}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Object.entries(stats.workflows_by_mode).map(([m, c]) => (
                <span key={m} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 7px', borderRadius: 10, background: `${MODE_COLORS[m] ?? '#888'}14`, color: MODE_COLORS[m] ?? '#888', fontWeight: 600 }}>
                  {m.replace('_', '-')} {c}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Tools */}
        <Card accent={C.tools} onClick={() => navigate('/tools')}>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={LABEL}>Tools</span>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${C.tools}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: C.tools }}>
                  <path d="M10.5 1.5C10.5 1.5 13 2 13.5 4.5C14 7 12 8.5 12 8.5L4.5 15.5L0.5 11.5L7.5 4C7.5 4 8.5 1.5 10.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  <circle cx="10.5" cy="4.5" r="1" fill="currentColor"/>
                </svg>
              </div>
            </div>
            <div style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 34, fontWeight: 800, color: C.tools, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {stats.tool_count}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(stats.tools_by_status).map(([s, c]) => {
                const color = s === 'approved' ? C.completed : s === 'pending' ? '#d97706' : C.failed
                return (
                  <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10, color }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    {c} {s}
                  </span>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Runs this week */}
        <Card accent={C.runs} onClick={() => navigate('/workflows')}>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={LABEL}>Runs This Week</span>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${C.runs}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: C.runs }}>
                  <polyline points="1,11 5,6 9,8 15,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 14h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <div style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 34, fontWeight: 800, color: C.runs, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {stats.runs_this_week}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 14 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: C.blue, fontWeight: 600 }}>
                {stats.runs_today} today
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: C.completed, fontWeight: 600 }}>
                {successRate}% success
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Row 2: Charts ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 160px 220px', gap: 12, flexShrink: 0 }}>

        {/* Activity */}
        <Card style={{ padding: '14px 16px', height: 160 }}>
          <ActivityChart data={stats.runs_by_day} total={stats.total_runs} />
        </Card>

        {/* By Status */}
        <Card style={{ padding: '14px 16px', height: 160 }}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, marginBottom: 10 }}>
              <span style={LABEL}>By Status</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: C.textSub }}>{totalByStatus} runs</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
              {Object.entries(stats.runs_by_status).map(([s, c]) => {
                const color = STATUS_COLORS[s] ?? '#888'
                const pct = totalByStatus > 0 ? Math.round((c / totalByStatus) * 100) : 0
                return (
                  <div key={s}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <StatusChip status={s} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color, fontWeight: 700 }}>
                        {c} <span style={{ color: C.textSub, fontWeight: 400, fontSize: 10 }}>{pct}%</span>
                      </span>
                    </div>
                    <div style={{ height: 6, background: `${color}14`, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
                        borderRadius: 3,
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Tokens */}
        <Card style={{ padding: '14px 16px', height: 160 }}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <span style={{ ...LABEL, flexShrink: 0, marginBottom: 10 }}>Token Usage</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Today</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 800, color: C.blue, lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {fmt(stats.total_tokens_today)}
                </div>
                <div style={{ marginTop: 5, height: 4, background: `${C.blue}14`, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(todayRatio * 100, 100)}%`, background: C.blue, borderRadius: 2 }} />
                </div>
              </div>
              <div style={{ paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>This Week</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: C.purple, lineHeight: 1, letterSpacing: '-0.01em' }}>
                  {fmt(stats.total_tokens_week)}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Runs by mode */}
        <Card style={{ padding: '14px 16px', height: 160 }}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <span style={{ ...LABEL, flexShrink: 0, marginBottom: 6 }}>Runs by Mode</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {modeEntries.map(([mode, count]) => {
                const color = MODE_COLORS[mode] ?? '#888'
                const pct = totalByMode > 0 ? (count / totalByMode) * 100 : 0
                return (
                  <div key={mode}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: C.textMid, textTransform: 'capitalize' }}>{mode.replace('_', ' ')}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color, fontWeight: 700 }}>{count}</span>
                    </div>
                    <div style={{ height: 3, background: `${color}14`, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Row 3: Recent runs — fills remaining space ─────────────── */}
      <Card style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <span style={LABEL}>Recent Runs</span>
          <button
            onClick={() => navigate('/workflows')}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: C.blue, cursor: 'pointer', background: 'none', border: 'none', fontWeight: 600, padding: 0 }}
          >
            View all →
          </button>
        </div>

        {stats.recent_runs.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSub, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            No runs yet — run a workflow to see activity here.
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 110px 80px 80px', gap: 12, padding: '7px 18px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: C.card, zIndex: 1 }}>
              {['Workflow', 'Mode', 'Status', 'Tokens', 'When'].map(h => (
                <span key={h} style={{ ...LABEL }}>{h}</span>
              ))}
            </div>

            {stats.recent_runs.map((run, i) => (
              <div
                key={run.run_id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 130px 110px 80px 80px',
                  gap: 12, padding: '9px 18px', alignItems: 'center',
                  borderBottom: i < stats.recent_runs.length - 1 ? `1px solid ${C.border}` : 'none',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(29,95,250,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: C.textDark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {run.workflow_name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: C.textSub, marginTop: 1 }}>
                    {run.run_id.slice(0, 8)}
                  </div>
                </div>
                <ModeBadge mode={run.execution_mode} />
                <StatusChip status={run.status} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: C.textMid, fontWeight: 500 }}>
                  {fmt(run.total_output_tokens)}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: C.textSub }}>
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
