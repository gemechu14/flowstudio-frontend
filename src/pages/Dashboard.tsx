import Card from '../components/ui/Card'

interface StatCardProps {
  label: string
  value: string | number
  sublabel?: string
  accent?: string
  icon: React.ReactNode
}

function StatCard({ label, value, sublabel, accent = 'var(--blue)', icon }: StatCardProps) {
  return (
    <Card hoverable padding="24px 28px">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-body)',
          }}
        >
          {label}
        </div>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: `${accent}14`,
            border: `1px solid ${accent}28`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 42,
          fontWeight: 700,
          color: accent,
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
      {sublabel && (
        <div style={{ fontSize: 12, color: 'var(--text-body)', marginTop: 10, lineHeight: 1.4 }}>
          {sublabel}
        </div>
      )}
    </Card>
  )
}

const RECENT_RUNS = [
  { id: 'run_7a2b', agent: 'research-agent-v2', status: 'success', duration: '12.4s', time: '2 min ago' },
  { id: 'run_4f9e', agent: 'sql-analyst',       status: 'success', duration: '3.1s',  time: '8 min ago' },
  { id: 'run_1c3d', agent: 'slack-notifier',    status: 'error',   duration: '0.4s',  time: '21 min ago' },
  { id: 'run_8b2a', agent: 'crm-enricher',      status: 'success', duration: '28.7s', time: '47 min ago' },
  { id: 'run_5e6f', agent: 'research-agent-v2', status: 'running', duration: '—',     time: 'just now' },
]

const STATUS_COLORS: Record<string, string> = {
  success: 'var(--verified)',
  error: 'var(--invalid)',
  running: 'var(--blue)',
}

export default function Dashboard() {
  return (
    <div style={{ padding: '40px 48px', width: '100%' }}>
      {/* Page header */}
      <div style={{ marginBottom: 36, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--blue)',
              marginBottom: 8,
            }}
          >
            Overview
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-dark)', lineHeight: 1.15 }}>
            Platform Dashboard
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-body)', marginTop: 6, lineHeight: 1.5 }}>
            Live metrics across your agents, tools, and workflow runs.
          </p>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-body)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          borderRadius: 6,
          padding: '6px 12px',
        }}>
          July 6, 2026
        </div>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20,
          marginBottom: 36,
        }}
      >
        <StatCard
          label="Total Tools"
          value={12}
          sublabel="4 custom, 8 built-in"
          accent="var(--blue)"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M12 2C9.79086 2 8 3.79086 8 6C8 6.56 8.1 7.09 8.28 7.58L2 13.86V16H4.14L10.42 9.72C10.91 9.9 11.44 10 12 10C14.2091 10 16 8.20914 16 6C16 3.79086 14.2091 2 12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="12" cy="6" r="1.5" fill="currentColor" />
            </svg>
          }
        />
        <StatCard
          label="Active Agents"
          value={3}
          sublabel="2 running, 1 idle"
          accent="#9B6DFF"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 16C3 12.6863 5.68629 10 9 10C12.3137 10 15 12.6863 15 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          label="Workflows"
          value={5}
          sublabel="1 active, 4 paused"
          accent="#22C55E"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="4" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="14" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="14" cy="13" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6.5 9H10M10 9L11.5 5M10 9L11.5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          label="Runs Today"
          value={47}
          sublabel="↑ 12 vs. yesterday"
          accent="var(--untested)"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2V10M9 10L6 7M9 10L12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 14H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      {/* Recent runs */}
      <Card padding="0px" style={{ overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 28px',
            borderBottom: '1px solid var(--border-light)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-dark)',
            }}
          >
            Recent Runs
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--blue)',
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            View all →
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {RECENT_RUNS.map((run, i) => (
            <div
              key={run.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 120px 90px 100px',
                alignItems: 'center',
                gap: 16,
                padding: '14px 28px',
                borderBottom: i < RECENT_RUNS.length - 1 ? '1px solid var(--border-light)' : 'none',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(29,95,250,0.025)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: STATUS_COLORS[run.status] ?? 'var(--text-body)',
                    flexShrink: 0,
                  }}
                />
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--text-dark)' }}>
                    {run.agent}
                  </span>
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-body)' }}>
                {run.duration}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 600,
                  color: STATUS_COLORS[run.status] ?? 'var(--text-body)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {run.status}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--text-body)', textAlign: 'right', minWidth: 80 }}>
                {run.time}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
