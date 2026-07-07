import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Platform overview and activity' },
  '/tools': { title: 'Tool Library', subtitle: 'Manage built-in and custom tools available to your agents' },
  '/agents': { title: 'Agents', subtitle: 'Configure and monitor AI agents' },
  '/workflows': { title: 'Workflows', subtitle: 'Build and run agentic workflow pipelines' },
  '/settings': { title: 'Settings', subtitle: 'Platform configuration and preferences' },
}

export default function TopBar() {
  const location = useLocation()
  const info = PAGE_TITLES[location.pathname] ?? { title: 'Platform', subtitle: '' }

  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        background: '#ffffff',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-dark)',
            letterSpacing: '0.02em',
          }}
        >
          {info.title}
        </h1>
        {info.subtitle && (
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-body)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {info.subtitle}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Status indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.20)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--verified)',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--verified)',
              letterSpacing: '0.08em',
            }}
          >
            SYSTEM ONLINE
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 20,
            background: 'var(--border-light)',
            margin: '0 4px',
          }}
        />

        {/* Notification bell */}
        <button
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-body)',
          }}
          title="Notifications"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 1C5.79086 1 4 2.79086 4 5V9L2 11H14L12 9V5C12 2.79086 10.2091 1 8 1Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M6.5 13C6.5 13.8284 7.17157 14.5 8 14.5C8.82843 14.5 9.5 13.8284 9.5 13" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>

        {/* Avatar */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--blue-dim)',
            border: '1.5px solid var(--blue-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--blue)',
            cursor: 'pointer',
          }}
          title="Profile"
        >
          E
        </div>
      </div>
    </header>
  )
}
