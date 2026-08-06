import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../layout/AppShell'
import AppShellSkeleton from '../../components/layout/AppShellSkeleton'
import Dashboard from '../../features/dashboard/pages/DashboardPage'
import Tools from '../../features/tools/pages/ToolsPage'
import Agents from '../../features/agents/pages/AgentsPage'
import Workflows from '../../features/workflows/pages/WorkflowsPage'
import DataSources from '../../features/data-sources/pages/DataSourcesPage'
import Settings from '../../features/settings/pages/SettingsPage'
import Channels from '../../features/channels/pages/ChannelsPage'
import CommunityTools from '../../features/community-tools/pages/CommunityToolsPage'
import Profile from '../../features/profile/pages/ProfilePage'
import Login from '../../features/auth/pages/LoginPage'
import ErrorBoundary from '../../shared/components/feedback/ErrorBoundary'
import BackendErrorScreen from '../../shared/components/feedback/BackendErrorScreen'

export default function AppRouter() {
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
    <AppShell>
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
    </AppShell>
  )
}
