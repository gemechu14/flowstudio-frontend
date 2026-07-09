import { NavLink, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    path: '/tools',
    label: 'Tools',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10.5 1.5C10.5 1.5 13 2 13.5 4.5C14 7 12 8.5 12 8.5L4.5 15.5L0.5 11.5L7.5 4C7.5 4 8.5 1.5 10.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="10.5" cy="4.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    path: '/agents',
    label: 'Agents',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 14C2 11.2386 4.68629 9 8 9C11.3137 9 14 11.2386 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    path: '/data-sources',
    label: 'Data Sources',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <ellipse cx="8" cy="4" rx="6" ry="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 4v4c0 1.38 2.69 2.5 6 2.5S14 9.38 14 8V4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 8v4c0 1.38 2.69 2.5 6 2.5S14 13.38 14 12V8" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    path: '/workflows',
    label: 'Workflows',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="13" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="13" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 8H8.5M8.5 8L11 4M8.5 8L11 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1V2.5M8 13.5V15M1 8H2.5M13.5 8H15M2.93 2.93L4 4M12 12L13.07 13.07M13.07 2.93L12 4M4 12L2.93 13.07" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside
      className="sidebar-dark"
      style={{
        width: 'var(--sidebar-width)',
        minWidth: 'var(--sidebar-width)',
        height: '100vh',
        background: 'var(--bg-dark)',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-dark)',
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid var(--border-dark)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '0.12em',
            color: 'var(--text-light)',
            display: 'flex',
            alignItems: 'center',
            gap: 0,
          }}
        >
          <span>CRESTWARD LABS</span>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 14,
              background: 'var(--blue)',
              marginLeft: 3,
              borderRadius: 1,
              animation: 'blink 1.2s step-end infinite',
            }}
          />
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-light-subtle)',
            letterSpacing: '0.10em',
            marginTop: 4,
            textTransform: 'uppercase',
          }}
        >
          Agentic Platform
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--text-light-subtle)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            padding: '8px 20px 4px',
          }}
        >
          Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 20px',
                textDecoration: 'none',
                color: isActive ? 'var(--blue-secondary)' : 'var(--text-light-muted)',
                background: isActive ? 'rgba(29,95,250,0.08)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--blue)' : '2px solid transparent',
                fontFamily: 'var(--font-sans)',
                fontSize: 13.5,
                fontWeight: isActive ? 500 : 400,
                transition: 'all 0.15s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLElement
                  el.style.color = 'rgba(255,255,255,0.75)'
                  el.style.background = 'rgba(255,255,255,0.04)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLElement
                  el.style.color = 'var(--text-light-muted)'
                  el.style.background = 'transparent'
                }
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.65 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-dark)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--blue-dim)',
              border: '1px solid var(--blue-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--blue-secondary)',
              fontWeight: 600,
            }}
          >
            CL
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 500 }}>
              Crestward Labs
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-light-subtle)', fontFamily: 'var(--font-mono)' }}>
              v0.1.0
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </aside>
  )
}
