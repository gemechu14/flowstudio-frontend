import { type ReactNode } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import Sidebar from '../../components/layout/Sidebar'
import TopBar from '../../components/layout/TopBar'

/** Authenticated chrome: sidebar + top bar around page content. */
export default function AppShell({ children }: { children: ReactNode }) {
  const { mobileNavOpen, setMobileNavOpen } = useTheme()

  return (
    <div
      className="app-shell"
      style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-page)' }}
    >
      {mobileNavOpen && (
        <button
          type="button"
          className="app-shell-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />
        <main style={{ flex: 1, width: '100%', overflowY: 'auto', background: 'var(--topbar-bg)', transition: 'background-color 0.25s ease' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
