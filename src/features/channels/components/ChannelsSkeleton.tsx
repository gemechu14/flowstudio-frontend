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

export function ChannelsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading channels">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--skeleton-card)',
            border: '1px solid var(--skeleton-border)',
            borderRadius: 10,
            marginBottom: 12,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 130px' }}>
            <Bone h={20} w={20} r={6} delay={i * 0.06} />
            <Bone h={13} w={64} delay={i * 0.06 + 0.04} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Bone h={9} w={72} delay={i * 0.06 + 0.06} style={{ marginBottom: 8 }} />
            <Bone h={28} w="100%" r={5} delay={i * 0.06 + 0.1} style={{ maxWidth: 420 }} />
            <Bone h={9} w={140} delay={i * 0.06 + 0.14} style={{ marginTop: 8 }} />
          </div>
          <Bone h={24} w={72} r={12} delay={i * 0.06 + 0.12} />
          <Bone h={24} w={64} r={5} delay={i * 0.06 + 0.14} />
          <Bone h={24} w={48} r={5} delay={i * 0.06 + 0.16} />
          <Bone h={24} w={56} r={5} delay={i * 0.06 + 0.18} />
        </div>
      ))}
    </div>
  )
}
