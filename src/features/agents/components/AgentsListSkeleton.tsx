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

export function AgentsListSkeleton({ count = 5 }: { count?: number }) {
  const layouts = [
    { title: 180, badges: [72, 64], tags: [120, 96], desc: '68%' },
    { title: 210, badges: [80, 56], tags: [140], desc: '54%' },
    { title: 160, badges: [68, 60], tags: [110, 88], desc: '72%' },
    { title: 200, badges: [76, 58], tags: [130, 70], desc: '60%' },
    { title: 170, badges: [70, 62], tags: [100], desc: '66%' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-busy="true" aria-label="Loading agents">
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
              gap: 16,
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
                  delay={base + 0.12}
                  style={{ marginTop: 10, maxWidth: 380 }}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {layout.tags.map((tw, ti) => (
                    <Bone key={ti} h={20} w={tw} r={4} delay={base + 0.16 + ti * 0.04} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                <Bone h={32} w={68} r={999} delay={base + 0.08} />
                <Bone h={32} w={64} r={999} delay={base + 0.12} />
                <Bone h={32} w={78} r={999} delay={base + 0.16} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
