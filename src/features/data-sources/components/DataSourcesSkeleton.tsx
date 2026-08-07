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

export function SourceListSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading data sources">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '10px 16px',
            borderBottom: '1px solid var(--skeleton-border)',
            borderLeft: '2px solid transparent',
          }}
        >
          <Bone h={26} w={26} r={7} delay={i * 0.05} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Bone h={12} w={`${58 + (i % 3) * 12}%`} delay={i * 0.05 + 0.04} style={{ maxWidth: 160 }} />
            <Bone h={9} w={52} delay={i * 0.05 + 0.08} style={{ marginTop: 6 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SourceDetailSkeleton() {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 22 }}
      aria-busy="true"
      aria-label="Loading source details"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <Bone h={52} w={52} r={12} />
          <div>
            <Bone h={22} w={200} delay={0.04} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Bone h={22} w={84} r={5} delay={0.08} />
              <Bone h={22} w={64} r={5} delay={0.1} />
            </div>
            <Bone h={12} w={280} delay={0.12} style={{ marginTop: 12, maxWidth: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Bone h={32} w={72} r={6} delay={0.06} />
          <Bone h={32} w={72} r={6} delay={0.1} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              background: 'var(--skeleton-card)',
              border: '1px solid var(--skeleton-border)',
              borderRadius: 12,
              padding: '16px 18px',
            }}
          >
            <Bone h={10} w={72} delay={0.14 + i * 0.04} />
            <Bone h={24} w={48} delay={0.18 + i * 0.04} style={{ marginTop: 12 }} />
          </div>
        ))}
      </div>

      <div
        style={{
          background: 'var(--skeleton-card)',
          border: '1px solid var(--skeleton-border)',
          borderRadius: 12,
          padding: 20,
          minHeight: 180,
        }}
      >
        <Bone h={12} w={100} delay={0.28} style={{ marginBottom: 16 }} />
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 0',
              borderBottom: i < 3 ? '1px solid var(--skeleton-border)' : 'none',
            }}
          >
            <Bone h={28} w={28} r={6} delay={0.3 + i * 0.05} />
            <Bone h={12} w={`${40 + i * 10}%`} delay={0.32 + i * 0.05} style={{ maxWidth: 280 }} />
            <Bone h={10} w={48} delay={0.34 + i * 0.05} style={{ marginLeft: 'auto' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
