function Bone({
  h, w, r = 6, style,
}: {
  h: number | string
  w: number | string
  r?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      className="skeleton-bone"
      style={{ height: h, width: w, borderRadius: r, ...style }}
    />
  )
}

/** Full app chrome shown while auth resolves — mirrors Sidebar + TopBar. */
export default function AppShellSkeleton() {
  return (
    <div
      style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}
      aria-busy="true"
      aria-label="Loading application"
    >
      {/* Sidebar shell */}
      <aside
        className="app-sidebar"
        style={{
          width: 'var(--sidebar-width)',
          minWidth: 'var(--sidebar-width)',
          height: '100vh',
          background: 'var(--sidebar-bg)',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--sidebar-border)',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '18px 14px 16px 20px', minHeight: 76 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Bone h={14} w={110} r={4} style={{ background: 'var(--sidebar-hover-bg)' }} />
            <Bone h={28} w={28} r={8} style={{ background: 'var(--sidebar-hover-bg)' }} />
          </div>
          <Bone h={8} w={140} r={4} style={{ marginTop: 10, background: 'var(--sidebar-hover-bg)' }} />
        </div>

        <nav style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Bone h={8} w={64} r={4} style={{ margin: '4px 10px 8px', background: 'var(--sidebar-hover-bg)' }} />
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
              }}
            >
              <Bone h={16} w={16} r={4} style={{ background: 'var(--sidebar-hover-bg)' }} />
              <Bone
                h={12}
                w={70 + (i % 3) * 18}
                r={4}
                style={{ background: 'var(--sidebar-hover-bg)' }}
              />
            </div>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid var(--sidebar-border)', padding: '13px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bone h={30} w={30} r={999} style={{ background: 'var(--sidebar-hover-bg)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Bone h={11} w="70%" r={4} style={{ background: 'var(--sidebar-hover-bg)' }} />
              <Bone h={9} w="90%" r={4} style={{ marginTop: 6, background: 'var(--sidebar-hover-bg)' }} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header
          style={{
            minHeight: 72,
            background: 'var(--topbar-bg)',
            borderBottom: '1px solid var(--topbar-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 28px 16px',
            flexShrink: 0,
          }}
        >
          <div>
            <Bone h={18} w={140} r={5} />
            <Bone h={11} w={220} r={4} style={{ marginTop: 8 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Bone h={30} w={30} r={8} />
            <Bone h={30} w={30} r={8} />
            <Bone h={30} w={30} r={999} />
          </div>
        </header>
        <main
          style={{
            flex: 1,
            background: 'var(--topbar-bg)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  background: 'var(--skeleton-card)',
                  border: '1px solid var(--skeleton-border)',
                  borderRadius: 12,
                  padding: 18,
                  height: 96,
                }}
              >
                <Bone h={10} w={64} />
                <Bone h={24} w={48} style={{ marginTop: 14 }} />
              </div>
            ))}
          </div>
          <div
            style={{
              flex: 1,
              background: 'var(--skeleton-card)',
              border: '1px solid var(--skeleton-border)',
              borderRadius: 12,
              minHeight: 200,
            }}
          />
        </main>
      </div>
    </div>
  )
}
