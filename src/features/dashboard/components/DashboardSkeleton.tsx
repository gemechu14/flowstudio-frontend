import type { CSSProperties } from 'react'

function Bone({
  h, w, r = 6, delay = 0, style,
}: {
  h: number | string
  w: number | string
  r?: number
  delay?: number
  style?: CSSProperties
}) {
  return (
    <div
      className="skeleton-bone"
      style={{
        height: h,
        width: w,
        borderRadius: r,
        ['--skel-delay' as string]: `${delay}s`,
        ...style,
      }}
    />
  )
}

export function DashboardSkeleton() {
  return (
    <div
      className="dashboard-page"
      style={{
        height: '100%', width: '100%',
        display: 'flex', flexDirection: 'column',
        boxSizing: 'border-box', overflowX: 'hidden', overflowY: 'auto',
        background: 'var(--bg-surface)',
      }}
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <div style={{
        padding: '20px 24px 18px',
        display: 'flex', flexDirection: 'column', gap: 14,
        flexShrink: 0,
      }}>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                background: 'var(--skeleton-card)',
                border: '1px solid var(--skeleton-border)',
                borderRadius: 12,
                padding: '16px 18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Bone h={10} w={64} delay={i * 0.05} />
                <Bone h={32} w={32} r={10} delay={i * 0.05 + 0.04} />
              </div>
              <Bone h={28} w={56} delay={i * 0.05 + 0.08} style={{ marginTop: 14 }} />
              <Bone h={10} w={`${50 + i * 8}%`} delay={i * 0.05 + 0.12} style={{ marginTop: 10, maxWidth: 140 }} />
            </div>
          ))}
        </div>

        {/* Chart + side panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, minHeight: 240 }}>
          <div style={{
            background: 'var(--skeleton-card)',
            border: '1px solid var(--skeleton-border)',
            borderRadius: 12,
            padding: '18px 20px',
            height: 240,
          }}>
            <Bone h={10} w={90} delay={0.1} style={{ marginBottom: 18 }} />
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150, paddingTop: 8 }}>
              {[42, 68, 55, 80, 48, 72, 60].map((h, i) => (
                <Bone
                  key={i}
                  h={`${h}%`}
                  w="100%"
                  r={6}
                  delay={0.12 + i * 0.04}
                  style={{ flex: 1 }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: 'var(--skeleton-card)',
              border: '1px solid var(--skeleton-border)',
              borderRadius: 12,
              padding: '18px 20px',
              flex: 1,
            }}>
              <Bone h={10} w={72} delay={0.15} style={{ marginBottom: 20 }} />
              {[0, 1, 2].map(i => (
                <div key={i} style={{ marginBottom: i < 2 ? 16 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Bone h={12} w={70} delay={0.18 + i * 0.05} />
                    <Bone h={12} w={80} delay={0.2 + i * 0.05} />
                  </div>
                  <Bone h={8} w="100%" r={999} delay={0.22 + i * 0.05} />
                </div>
              ))}
            </div>
            <div style={{
              background: 'var(--skeleton-card)',
              border: '1px solid var(--skeleton-border)',
              borderRadius: 12,
              padding: '16px 20px',
            }}>
              <Bone h={10} w={88} delay={0.25} style={{ marginBottom: 14 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <Bone h={9} w={48} delay={0.28} style={{ marginBottom: 8 }} />
                  <Bone h={24} w={64} delay={0.3} />
                </div>
                <div>
                  <Bone h={9} w={56} delay={0.32} style={{ marginBottom: 8 }} />
                  <Bone h={24} w={72} delay={0.34} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

      {/* Recent runs */}
      <div style={{ flex: 1, minHeight: 0, padding: '0 24px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 0 10px' }}>
          <Bone h={10} w={96} delay={0.35} />
        </div>
        <div style={{
          flex: 1,
          background: 'var(--skeleton-card)',
          border: '1px solid var(--skeleton-border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 120px 120px 80px 80px', gap: 12,
            padding: '12px 18px', borderBottom: '1px solid var(--skeleton-border)',
          }}>
            {[90, 48, 52, 48, 40].map((w, i) => (
              <Bone key={i} h={9} w={w} delay={0.38 + i * 0.02} />
            ))}
          </div>
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 120px 120px 80px 80px',
                gap: 12, padding: '14px 18px', alignItems: 'center',
                borderBottom: i < 4 ? '1px solid var(--skeleton-border)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Bone h={28} w={28} r={8} delay={0.4 + i * 0.05} />
                <div>
                  <Bone h={12} w={140 + (i % 3) * 20} delay={0.42 + i * 0.05} />
                  <Bone h={9} w={72} delay={0.44 + i * 0.05} style={{ marginTop: 6 }} />
                </div>
              </div>
              <Bone h={18} w={64} r={4} delay={0.45 + i * 0.05} />
              <Bone h={18} w={72} r={4} delay={0.46 + i * 0.05} />
              <Bone h={12} w={40} delay={0.47 + i * 0.05} />
              <Bone h={12} w={48} delay={0.48 + i * 0.05} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
