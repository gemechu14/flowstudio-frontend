import type { CSSProperties } from 'react'
import { SANS } from '../lib/workflowsUi'

export function Bone({
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

export function WorkflowsListSkeleton({ count = 6 }: { count?: number }) {
  const widths = [130, 150, 110, 140, 120, 155]
  return (
    <div aria-busy="true" aria-label="Loading workflows" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {Array.from({ length: count }).map((_, i) => {
        const base = i * 0.06
        return (
          <div
            key={i}
            style={{
              padding: '12px',
              borderRadius: 10,
              border: '1px solid transparent',
              background: 'var(--skeleton-card)',
            }}
          >
            <Bone h={13} w={widths[i % widths.length]} delay={base} style={{ marginBottom: 8 }} />
            <Bone h={11} w={Math.round(widths[i % widths.length] * 1.4)} delay={base + 0.03} style={{ marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Bone h={18} w={64} r={999} delay={base + 0.04} />
              <Bone h={10} w={48} delay={base + 0.08} />
              <Bone h={10} w={40} delay={base + 0.1} style={{ marginLeft: 'auto' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function WorkflowsCanvasSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading workflow editor"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
        ...SANS,
      }}
    >
      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid var(--skeleton-border)',
        background: 'var(--skeleton-card)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        <Bone h={18} w={160} delay={0} />
        <Bone h={14} w={200} delay={0.05} style={{ flex: 1, maxWidth: 280 }} />
        <Bone h={28} w={120} r={5} delay={0.08} />
        <Bone h={28} w={72} r={5} delay={0.1} />
        <Bone h={28} w={64} r={5} delay={0.12} />
      </div>
      <div style={{
        flex: 1,
        backgroundColor: 'var(--canvas-bg)',
        backgroundImage: 'radial-gradient(circle, var(--canvas-dot) 1px, transparent 1.5px)',
        backgroundSize: '20px 20px',
        padding: 40,
        display: 'flex',
        gap: 24,
        alignItems: 'flex-start',
      }}>
        <Bone h={80} w={200} r={10} delay={0.1} />
        <Bone h={80} w={200} r={10} delay={0.16} style={{ marginTop: 40 }} />
        <Bone h={80} w={200} r={10} delay={0.22} style={{ marginTop: 10 }} />
      </div>
      <div style={{
        borderTop: '1px solid var(--skeleton-border)',
        background: 'var(--skeleton-card)',
        padding: '12px 20px',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
      }}>
        <Bone h={36} w="100%" r={6} delay={0.14} style={{ maxWidth: 480 }} />
        <Bone h={36} w={88} r={6} delay={0.18} />
      </div>
    </div>
  )
}
