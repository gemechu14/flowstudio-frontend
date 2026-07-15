import { apiFetch } from './client'

export interface McpServerRecord {
  server_id: string
  name: string
  url: string
  enabled: boolean
}

export interface McpToolInfo {
  name: string
  description: string
}

export async function listMcpServers(): Promise<McpServerRecord[]> {
  return apiFetch<McpServerRecord[]>('/mcp-servers')
}

export async function getMcpServerTools(serverId: string): Promise<McpToolInfo[]> {
  const res = await apiFetch<{ tools: McpToolInfo[] }>(`/mcp-servers/${encodeURIComponent(serverId)}/tools`)
  return res.tools
}
