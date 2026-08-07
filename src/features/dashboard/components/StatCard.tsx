import type { ReactNode } from 'react'
import { DashboardCard } from './DashboardCard'
import { LABEL } from '../lib/dashboardUi'

export function StatCard({
  label, value, subtitle, icon, onClick,
}: {
  label: string
  value: number | string
  subtitle: ReactNode
  icon: ReactNode
  onClick?: () => void
}) {
  return (
    <DashboardCard onClick={onClick}>
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
          marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600,
          color: 'var(--text-heading)', lineHeight: 1, letterSpacing: '-0.02em',
        }}>
          {value}
        </div>
        <div style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
          {subtitle}
        </div>
      </div>
    </DashboardCard>
  )
}
