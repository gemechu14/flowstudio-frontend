import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import AppShellSkeleton from './components/layout/AppShellSkeleton'
import Dashboard from './pages/Dashboard'
import Tools from './pages/Tools'
import Agents from './pages/Agents'
import Workflows from './pages/Workflows'
import DataSources from './pages/DataSources'
import Settings from './pages/Settings'
import Channels from './pages/Channels'
import CommunityTools from './pages/CommunityTools'
import Profile from './pages/Profile'
import Login from './pages/Login'
import ErrorBoundary from './components/ErrorBoundary'
import BackendErrorScreen from './components/BackendErrorScreen'

function AppShell() {
  const { user, isLoading } = useAuth()
  const [backendUnreachable, setBackendUnreachable] = useState(false)

  useEffect(() => {
    const handler = () => setBackendUnreachable(true)
    window.addEventListener('backend:unreachable', handler)
    return () => window.removeEventListener('backend:unreachable', handler)
  }, [])

  function handleRetry() {
    setBackendUnreachable(false)
    window.location.reload()
  }

  if (backendUnreachable) {
    return <BackendErrorScreen onRetry={handleRetry} />
  }

  // Token present but no cached user yet — show real chrome skeleton, not a blank screen.
  if (isLoading && !user) {
    return <AppShellSkeleton />
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />
        <main style={{ flex: 1, width: '100%', overflowY: 'auto', background: 'var(--topbar-bg)', transition: 'background-color 0.25s ease' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/data-sources" element={<DataSources />} />
            <Route path="/workflows" element={<ErrorBoundary><Workflows /></ErrorBoundary>} />
            <Route path="/channels" element={<Channels />} />
            <Route path="/community" element={<CommunityTools />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  )
}
