import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import Dashboard from './pages/Dashboard'
import Tools from './pages/Tools'
import Agents from './pages/Agents'
import Workflows from './pages/Workflows'

export default function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />
        <main
          style={{
            flex: 1,
            width: '100%',
            overflowY: 'auto',
            background: 'var(--bg-light)',
          }}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/workflows" element={<Workflows />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
