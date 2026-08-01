import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Platform overview and activity.' },
  '/tools': { title: 'Tool Library', subtitle: 'Manage built-in and custom tools available to your agents' },
  '/agents': { title: 'Agents', subtitle: 'Configure and monitor AI agents' },
  '/workflows': { title: 'Workflows', subtitle: 'Build and run agentic workflow pipelines' },
  '/data-sources': { title: 'Data Sources', subtitle: 'Connect documents, databases, and websites to your agents' },
  '/channels': { title: 'Channels', subtitle: 'Connect Slack, Telegram, Discord, and WhatsApp to your workflows' },
  '/community': { title: 'Community Tools', subtitle: 'Browse and enable tools built by the community' },
  '/settings': { title: 'Settings', subtitle: 'Platform configuration and preferences' },
  '/profile': { title: 'Profile', subtitle: 'Manage your account and personal information' },
}

export default function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme, toggleTheme, toggleMobileNav } = useTheme()
  const info = PAGE_TITLES[location.pathname] ?? { title: 'Platform', subtitle: '' }

  const initials = user
    ? (user.first_name && user.last_name
      ? `${user.first_name[0]}${user.last_name[0]}`
      : user.email?.[0] ?? '?').toUpperCase()
    : '?'

  const iconBtn: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
    flexShrink: 0,
  }

  return (
    <header
      className="app-topbar"
      style={{
        minHeight: 72,
        background: 'var(--topbar-bg)',
        borderBottom: '1px solid var(--topbar-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 28px 16px',
        flexShrink: 0,
        gap: 24,
        transition: 'background-color 0.25s ease, border-color 0.25s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={toggleMobileNav}
          aria-label="Open navigation"
          style={{
            ...iconBtn,
            display: 'none',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, justifyContent: 'center' }}>
          <h1
            className="app-topbar-title"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 20,
              fontWeight: 650,
              color: 'var(--text-heading)',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {info.title}
          </h1>
          {info.subtitle && (
            <span
              className="topbar-subtitle"
              style={{
                fontSize: 12.5,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-sans)',
                lineHeight: 1.3,
              }}
            >
              {info.subtitle}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, alignSelf: 'center' }}>
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={iconBtn}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--bg-hover)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          {theme === 'dark' ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5Z" />
            </svg>
          )}
        </button>

        <button
          style={iconBtn}
          title="Notifications"
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--bg-hover)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M8 1C5.79086 1 4 2.79086 4 5V9L2 11H14L12 9V5C12 2.79086 10.2091 1 8 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M6.5 13C6.5 13.8284 7.17157 14.5 8 14.5C8.82843 14.5 9.5 13.8284 9.5 13" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>

        <button
          onClick={() => navigate('/profile')}
          title="Go to profile"
          style={{
            width: 30, height: 30,
            borderRadius: '50%',
            background: 'var(--accent-soft)',
            border: '1px solid var(--blue-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 10, fontWeight: 700,
            color: 'var(--accent-text)',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
