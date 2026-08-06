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

export function ToolsListSkeleton({ count = 5 }: { count?: number }) {
  const layouts = [
    { title: 200, badge: 68, tags: [148, 72], desc: '72%', pending: true },
    { title: 168, badge: 72, tags: [132], desc: '58%', pending: false },
    { title: 220, badge: 68, tags: [160, 88], desc: '80%', pending: true },
    { title: 152, badge: 72, tags: [120], desc: '64%', pending: false },
    { title: 188, badge: 68, tags: [140, 64], desc: '70%', pending: false },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-busy="true" aria-label="Loading tools">
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
              gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Bone h={14} w={layout.title} delay={base} />
                  <Bone h={18} w={layout.badge} r={4} delay={base + 0.05} />
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {layout.tags.map((tw, ti) => (
                    <Bone key={ti} h={22} w={tw} r={4} delay={base + 0.1 + ti * 0.04} />
                  ))}
                </div>
                <Bone
                  h={12}
                  w={layout.desc}
                  delay={base + 0.18}
                  style={{ marginTop: 10, maxWidth: 380 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                {layout.pending ? (
                  <>
                    <Bone h={32} w={88} r={999} delay={base + 0.08} />
                    <Bone h={32} w={68} r={999} delay={base + 0.12} />
                  </>
                ) : (
                  <Bone h={32} w={96} r={8} delay={base + 0.08} />
                )}
                <Bone h={32} w={58} r={8} delay={base + 0.14} />
                <Bone h={32} w={58} r={8} delay={base + 0.16} />
                <Bone h={32} w={32} r={8} delay={base + 0.18} />
                <Bone h={32} w={32} r={8} delay={base + 0.2} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
