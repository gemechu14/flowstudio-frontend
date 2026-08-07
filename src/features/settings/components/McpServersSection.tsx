import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listMcpServers, type McpServer } from '../api/mcpServers.api'
import { queryKeys } from '../../../shared/api/queryKeys'
import { SectionHeading } from './SectionHeading'
import { AddServerForm } from './AddServerForm'
import { McpServerRow } from './McpServerRow'
import { MONO, SANS } from '../lib/settingsUi'

export function McpServersSection() {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)

  const {
    data: servers = [],
    isLoading: loading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.mcpServers,
    queryFn: () => listMcpServers(),
  })

  const loadError = isError
    ? ((error as Error)?.message || 'Failed to load MCP servers')
    : ''

  const handleCreated = (server: McpServer) => {
    queryClient.setQueryData<McpServer[]>(queryKeys.mcpServers, (prev = []) => [...prev, server])
    setShowAddForm(false)
  }

  const handleDeleted = (serverId: string) => {
    queryClient.setQueryData<McpServer[]>(queryKeys.mcpServers, (prev = []) =>
      prev.filter(s => s.server_id !== serverId)
    )
  }

  const handleSynced = (updated: McpServer) => {
    queryClient.setQueryData<McpServer[]>(queryKeys.mcpServers, (prev = []) =>
      prev.map(s => s.server_id === updated.server_id ? updated : s)
    )
  }

  return (
    <div className="settings-section" style={{ marginBottom: 48 }}>
      <div
        className="settings-section-head"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 20,
          gap: 16,
        }}
      >
        <SectionHeading
          label="CONFIGURATION"
          title="MCP Tool Servers"
          subtitle="Connect remote Model Context Protocol servers to expose their tools to agents."
        />
        <button
          className="settings-add-btn"
          onClick={() => setShowAddForm(v => !v)}
          style={{
            ...SANS, fontSize: 13, padding: '8px 16px',
            background: showAddForm ? 'var(--bg-hover)' : 'var(--accent)',
            color: showAddForm ? 'var(--text-secondary)' : 'var(--btn-upload-text)',
            border: `1px solid ${showAddForm ? 'var(--border)' : 'var(--accent)'}`,
            borderRadius: 999,
            cursor: 'pointer', fontWeight: 600, flexShrink: 0, marginTop: 2,
          }}
        >
          {showAddForm ? 'Cancel' : '+ Add MCP Server'}
        </button>
      </div>

      {showAddForm && (
        <AddServerForm
          onCreated={handleCreated}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {loadError && (
        <div style={{
          ...MONO, fontSize: 12, color: 'var(--invalid)',
          padding: '10px 14px', background: 'var(--invalid-dim)',
          border: '1px solid rgba(239,68,68,0.28)', borderRadius: 7, marginBottom: 12,
        }}>
          {loadError}
        </div>
      )}

      {loading ? (
        <div style={{
          ...MONO, fontSize: 12, color: 'var(--text-tertiary)',
          padding: '40px 0', textAlign: 'center',
        }}>
          Loading servers…
        </div>
      ) : servers.length === 0 && !showAddForm ? (
        <div style={{
          textAlign: 'center', padding: '48px 0',
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🔌</div>
          <div style={{ ...SANS, fontSize: 14, color: 'var(--text-heading)', fontWeight: 600, marginBottom: 4 }}>
            No MCP servers configured
          </div>
          <div style={{ ...SANS, fontSize: 13, color: 'var(--text-tertiary)' }}>
            Add an MCP server to expose its tools to your agents.
          </div>
        </div>
      ) : (
        servers.map(server => (
          <McpServerRow
            key={server.server_id}
            server={server}
            onDeleted={() => handleDeleted(server.server_id)}
            onSynced={handleSynced}
          />
        ))
      )}
    </div>
  )
}
