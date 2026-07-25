import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { logout } from '../../api/auth'
import { BASE_URL } from '../../api/client'

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
    path: '/channels',
    label: 'Channels',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H9l-3 2v-2H3a1 1 0 0 1-1-1V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M5 7h6M5 9.5h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
      </svg>
    ),
  },
]

interface Tenant { tenant_id: string; name: string; slug: string }

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [orgOpen, setOrgOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null)
  const orgRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const isSuperAdmin = user?.role === 'super_admin'

  // Load tenants for super_admin
  useEffect(() => {
    if (!isSuperAdmin) return
    const token = localStorage.getItem('cl_token')
    fetch(`${BASE_URL}/admin/tenants`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : [])
      .then((list: Tenant[]) => {
        setTenants(list)
        const stored = localStorage.getItem('cl_active_tenant')
        if (stored) {
          const found = list.find(t => t.tenant_id === JSON.parse(stored).tenant_id)
          if (found) {
            setActiveTenant(found)
          } else {
            // Stored tenant no longer exists — clear it and fall back to own tenant
            localStorage.removeItem('cl_active_tenant')
            const own = list.find(t => t.tenant_id === user?.tenant_id)
            if (own) setActiveTenant(own)
          }
        } else {
          const own = list.find(t => t.tenant_id === user?.tenant_id)
          if (own) setActiveTenant(own)
        }
      })
      .catch(() => {})
  }, [isSuperAdmin, user?.tenant_id])

  // Close dropdowns on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (orgRef.current && !orgRef.current.contains(e.target as Node)) setOrgOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function switchTenant(t: Tenant) {
    setActiveTenant(t)
    localStorage.setItem('cl_active_tenant', JSON.stringify(t))
    setOrgOpen(false)
    // Reload current page to re-fetch data scoped to new tenant
    navigate(location.pathname, { replace: true })
    window.location.reload()
  }

  const visibleNavItems = NAV_ITEMS

  const initials = user
    ? (user.first_name && user.last_name
      ? `${user.first_name[0]}${user.last_name[0]}`
      : user.email?.[0] ?? '?').toUpperCase()
    : '?'

  const displayName = user
    ? (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email ?? '')
    : ''

  const currentOrgName = activeTenant?.name ?? user?.org_name ?? ''

  const menuItem = (label: string, icon: React.ReactNode, onClick: () => void, danger = false) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
        color: danger ? '#f87171' : 'rgba(255,255,255,0.75)',
        fontSize: 13, fontFamily: 'var(--font-sans)', textAlign: 'left',
        borderRadius: 6, transition: 'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {icon}
      {label}
    </button>
  )

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
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border-dark)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, letterSpacing: '0.12em', color: 'var(--text-light)', display: 'flex', alignItems: 'center' }}>
          <span>FLOWSTUDIO</span>
          <span style={{ display: 'inline-block', width: 8, height: 14, background: 'var(--blue)', marginLeft: 3, borderRadius: 1, animation: 'blink 1.2s step-end infinite' }} />
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-light-subtle)', letterSpacing: '0.10em', marginTop: 4, textTransform: 'uppercase' }}>
          Powered by Crestward Labs
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-light-subtle)', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '8px 20px 4px' }}>
          Navigation
        </div>
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px',
                textDecoration: 'none',
                color: isActive ? 'var(--blue-secondary)' : 'var(--text-light-muted)',
                background: isActive ? 'rgba(29,95,250,0.08)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--blue)' : '2px solid transparent',
                fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: isActive ? 500 : 400,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' } }}
              onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = 'var(--text-light-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
            >
              <span style={{ opacity: isActive ? 1 : 0.65 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border-dark)' }}>

        {/* Org switcher — super_admin only */}
        {isSuperAdmin && (
          <div ref={orgRef} style={{ position: 'relative', borderBottom: '1px solid var(--border-dark)' }}>
            <button
              onClick={() => setOrgOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '13px 16px', background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--text-light)',
              }}
            >
              {/* Org icon */}
              <div style={{
                width: 26, height: 26, borderRadius: 6, background: 'rgba(29,95,250,0.15)',
                border: '1px solid rgba(29,95,250,0.25)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="5" width="14" height="10" rx="1.5" stroke="rgba(29,95,250,0.9)" strokeWidth="1.5" />
                  <path d="M5 5V3.5A2.5 2.5 0 0 1 11 3.5V5" stroke="rgba(29,95,250,0.9)" strokeWidth="1.5" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentOrgName}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-light-subtle)', fontFamily: 'var(--font-mono)' }}>
                  super admin
                </div>
              </div>
              {/* Chevron */}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.4, transform: orgOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Dropdown */}
            {orgOpen && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, right: 0,
                background: '#1a1d23', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '6px 0', boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
                maxHeight: 280, overflowY: 'auto', zIndex: 100,
              }}>
                <div style={{ padding: '4px 14px 6px', fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                  Switch Organization
                </div>
                {tenants.map(t => (
                  <button
                    key={t.tenant_id}
                    onClick={() => switchTenant(t)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '8px 14px', background: 'none', border: 'none',
                      cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: 13,
                      fontFamily: 'var(--font-sans)', textAlign: 'left',
                      borderLeft: t.tenant_id === (activeTenant?.tenant_id ?? user?.tenant_id)
                        ? '2px solid var(--blue)' : '2px solid transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: 5, background: 'rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', flexShrink: 0,
                    }}>
                      {t.name[0].toUpperCase()}
                    </div>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                    {t.tenant_id === (activeTenant?.tenant_id ?? user?.tenant_id) && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                        <path d="M2 6l3 3 5-5" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User profile */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setProfileOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '13px 16px', background: 'none', border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--blue-dim)', border: '1px solid var(--blue-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--blue-secondary)',
              fontWeight: 700, flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-light-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.35, transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Profile popup */}
          {profileOpen && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 8, right: 8,
              background: '#1a1d23', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '6px', boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
              zIndex: 100,
            }}>
              {menuItem('Profile', (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M2 14c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              ), () => { setProfileOpen(false); navigate('/profile') })}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
              {menuItem('Log out', (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ), () => logout(), true)}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </aside>
  )
}
