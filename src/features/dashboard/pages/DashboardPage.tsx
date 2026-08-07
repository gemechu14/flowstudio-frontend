import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../../shared/api/client'
import { queryKeys } from '../../../shared/api/queryKeys'
import type { Stats } from '../types/dashboard.types'
import { DashboardCard } from '../components/DashboardCard'
import { ModeBadge } from '../components/ModeBadge'
import { StatusChip } from '../components/StatusChip'
import { StatusRow } from '../components/StatusRow'
import { ActivityChart } from '../components/ActivityChart'
import { StatCard } from '../components/StatCard'
import { DashboardSkeleton } from '../components/DashboardSkeleton'
import { LABEL, fmt, timeAgo, STATUS_COLORS } from '../lib/dashboardUi'

export default function DashboardPage() {
  const navigate = useNavigate()
  const {
    data: stats,
    error,
    isLoading,
  } = useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: () => apiFetch<Stats>('/workflows/dashboard/stats'),
  })

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--invalid)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      {(error as Error)?.message ?? 'Failed to load'}
    </div>
  )

  if (isLoading || !stats) return <DashboardSkeleton />

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
    <div
      className="dashboard-page"
      style={{
      height: '100%', width: '100%',
      display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box', overflowX: 'hidden', overflowY: 'auto',
      background: 'var(--bg-surface)',
      transition: 'background-color 0.25s ease',
    }}>

      {/* Top: overview metrics */}
      <div
        className="dashboard-top"
        style={{
        display: 'flex', flexDirection: 'column', gap: 14,
        flexShrink: 0,
        background: 'var(--bg-surface)',
      }}>
        <div className="dashboard-stats">
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

        <div className="dashboard-mid">
          <DashboardCard className="dashboard-activity-card" style={{ padding: '18px 20px', height: 240, overflow: 'visible' }} data-activity-chart>
            <ActivityChart data={stats.runs_by_day} />
          </DashboardCard>

          <div className="dashboard-mid-side">
            <DashboardCard style={{ padding: '18px 20px', flex: 1, overflow: 'visible' }}>
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
                        <StatusRow key={s} label={s} count={c} pct={pct} color={color} />
                      )
                    })
                  )}
                </div>
              </div>
            </DashboardCard>

            <DashboardCard style={{ padding: '16px 20px' }}>
              <span style={{ ...LABEL, display: 'block', marginBottom: 12 }}>Token Usage</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Today</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--accent-text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {fmt(stats.total_tokens_today)}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>This Week</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--accent-text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {fmt(stats.total_tokens_week)}
                  </div>
                </div>
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>

      {/* Divider between top overview and recent runs */}
      <div className="dashboard-divider" style={{ height: 1, background: 'var(--border)', flexShrink: 0, width: '100%' }} />

      {/* Bottom: recent runs */}
      <div
        className="dashboard-runs"
        style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        background: 'var(--bg-surface)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 0 10px', flexShrink: 0,
        }}>
          <span style={LABEL}>Recent Runs</span>
          <button
            onClick={() => navigate('/workflows')}
            style={{
              fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--accent-text)',
              cursor: 'pointer', background: 'none', border: 'none', fontWeight: 600, padding: 0,
            }}
          >
            View all
          </button>
        </div>

        {stats.recent_runs.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)', fontSize: 13, padding: '24px 0' }}>
            No runs yet — run a workflow to see activity here.
          </div>
        ) : (
          <>
          <div className="dashboard-runs-table" style={{
            flex: 1, minHeight: 0, overflowY: 'auto',
            border: '1px solid var(--card-border)',
            borderRadius: 12,
            background: 'var(--card-bg)',
          }}>
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
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {run.workflow_name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>
                      run_{run.run_id.replace(/^run_/, '').slice(0, 8)}
                    </div>
                  </div>
                </div>
                <ModeBadge mode={run.execution_mode} />
                <StatusChip status={run.status} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-heading)', fontWeight: 500 }}>
                  {fmt(run.total_input_tokens + run.total_output_tokens)}
                </span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {timeAgo(run.started_at)}
                </span>
              </div>
            ))}
          </div>

          <div className="dashboard-runs-cards">
            {stats.recent_runs.map(run => (
              <div
                key={`m-${run.run_id}`}
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: 'var(--card-shadow)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'var(--accent-soft)', border: '1px solid var(--blue-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent-text)',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="13" cy="4" r="2" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="13" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M5 8H8.5M8.5 8L11 4M8.5 8L11 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                      color: 'var(--text-secondary)', lineHeight: 1.3,
                    }}>
                      {run.workflow_name}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: 'var(--text-tertiary)', marginTop: 4,
                    }}>
                      run_{run.run_id.replace(/^run_/, '').slice(0, 8)}
                    </div>
                  </div>
                </div>
                <div style={{ height: 1, background: 'var(--border)' }} />
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px',
                  padding: '14px 16px 16px',
                }}>
                  <div>
                    <div style={{ ...LABEL, marginBottom: 6 }}>Mode</div>
                    <ModeBadge mode={run.execution_mode} />
                  </div>
                  <div>
                    <div style={{ ...LABEL, marginBottom: 6 }}>Status</div>
                    <StatusChip status={run.status} />
                  </div>
                  <div>
                    <div style={{ ...LABEL, marginBottom: 6 }}>Tokens</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--text-heading)' }}>
                      {fmt(run.total_input_tokens + run.total_output_tokens)}
                    </div>
                  </div>
                  <div>
                    <div style={{ ...LABEL, marginBottom: 6 }}>When</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--text-heading)' }}>
                      {timeAgo(run.started_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  )
}

