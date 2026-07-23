import { apiFetch } from './client'

// ─── types ────────────────────────────────────────────────────────────────────

export interface McpServer {
  server_id: string
  name: string
  url: string
  enabled: boolean
  headers: Record<string, string>
  last_synced_at: string | null
  created_at: string
}

export interface McpTool {
  name: string
  description: string
}

// ─── API functions ────────────────────────────────────────────────────────────

export function listMcpServers(): Promise<McpServer[]> {
  return apiFetch<McpServer[]>('/mcp-servers')
}

export function createMcpServer(name: string, url: string, headers: Record<string, string> = {}): Promise<McpServer> {
  return apiFetch<McpServer>('/mcp-servers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, url, headers }),
  })
}

export function deleteMcpServer(id: string): Promise<void> {
  return apiFetch<void>(`/mcp-servers/${id}`, { method: 'DELETE' })
}

export function syncMcpServer(id: string): Promise<{ tool_names: string[] }> {
  return apiFetch<{ tool_names: string[] }>(`/mcp-servers/${id}/sync`, { method: 'POST' })
}

export function updateMcpServer(
  id: string,
  updates: { name?: string; url?: string; enabled?: boolean; headers?: Record<string, string> },
): Promise<McpServer> {
  return apiFetch<McpServer>(`/mcp-servers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
}

export function getMcpServerTools(id: string): Promise<{ tools: McpTool[] }> {
  return apiFetch<{ tools: McpTool[] }>(`/mcp-servers/${id}/tools`)
}
