import { apiFetch } from './client'

export interface AgentRecord {
  agent_id: string
  name: string
  description: string
  system_prompt: string
  model_id: string
  provider: 'openai' | 'anthropic'
  tool_names: string[]
  datasource_ids: string[]
  created_at: string
  updated_at: string
}

export interface AgentBody {
  name: string
  description?: string
  system_prompt?: string
  model_id?: string
  provider?: 'openai' | 'anthropic'
  tool_names?: string[]
  datasource_ids?: string[]
}

export async function listAgents(): Promise<AgentRecord[]> {
  const res = await apiFetch<{ agents: AgentRecord[]; count: number }>('/agents')
  return res.agents
}

export async function createAgent(body: AgentBody): Promise<AgentRecord> {
  return apiFetch<AgentRecord>('/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function updateAgent(id: string, body: Partial<AgentBody>): Promise<AgentRecord> {
  return apiFetch<AgentRecord>(`/agents/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function deleteAgent(id: string): Promise<void> {
  await apiFetch(`/agents/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
