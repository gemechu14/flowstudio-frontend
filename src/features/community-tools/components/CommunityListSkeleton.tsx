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

export function CommunityListSkeleton({ count = 5 }: { count?: number }) {
  const layouts = [
    { title: 180, badges: [72, 56], desc: '70%' },
    { title: 200, badges: [80, 48], desc: '58%' },
    { title: 160, badges: [64, 60], desc: '74%' },
    { title: 210, badges: [76, 52], desc: '62%' },
    { title: 170, badges: [68, 54], desc: '66%' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-busy="true" aria-label="Loading community tools">
      {Array.from({ length: count }).map((_, i) => {
        const layout = layouts[i % layouts.length]
        const base = i * 0.07
        return (
          <div
            key={i}
            style={{
              background: 'var(--skeleton-card)',
              border: '1px solid var(--skeleton-border)',
              borderLeft: '3px solid var(--skeleton-accent)',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Bone h={14} w={layout.title} delay={base} />
                  {layout.badges.map((bw, bi) => (
                    <Bone key={bi} h={18} w={bw} r={4} delay={base + 0.04 + bi * 0.03} />
                  ))}
                </div>
                <Bone
                  h={12}
                  w={layout.desc}
                  delay={base + 0.14}
                  style={{ marginTop: 10, maxWidth: 420 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <Bone h={32} w={72} r={999} delay={base + 0.1} />
                <Bone h={32} w={58} r={999} delay={base + 0.14} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
