import { useState, useEffect } from 'react'
import { getMcpServerTools, type McpTool } from '../api/mcpServers.api'
import { MONO, SANS } from '../lib/settingsUi'

export function McpToolsList({ serverId }: { serverId: string }) {
  const [tools, setTools] = useState<McpTool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getMcpServerTools(serverId)
      .then(res => setTools(res.tools))
      .catch(err => setError(err.message || 'Failed to load tools'))
      .finally(() => setLoading(false))
  }, [serverId])

  if (loading) return (
    <div style={{ ...MONO, fontSize: 11, color: 'var(--text-tertiary)', padding: '10px 18px' }}>
      Loading tools…
    </div>
  )

  if (error) return (
    <div style={{ ...MONO, fontSize: 11, color: 'var(--invalid)', padding: '10px 18px' }}>
      {error}
    </div>
  )

  if (tools.length === 0) return (
    <div style={{ ...MONO, fontSize: 11, color: 'var(--text-tertiary)', padding: '10px 18px' }}>
      No tools reported by this server.
    </div>
  )

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      padding: '12px 18px',
      background: 'var(--bg-surface)',
    }}>
      <div style={{
        ...MONO, fontSize: 10, fontWeight: 600,
        letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 10,
      }}>
        AVAILABLE TOOLS ({tools.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tools.map(tool => (
          <div key={tool.name} style={{
            padding: '8px 12px',
            background: 'var(--bg-page)',
            border: '1px solid var(--border)',
            borderRadius: 6,
          }}>
            <div style={{ ...MONO, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
              {tool.name}
            </div>
            {tool.description && (
              <div style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {tool.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
