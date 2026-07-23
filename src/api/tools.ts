import { apiFetch } from './client'

export type ToolStatus = 'pending' | 'approved' | 'rejected'

export interface ToolParam {
  name: string
  type: string
  description: string
}

export interface ToolRecord {
  tool_id: string
  name: string
  display_name: string
  description: string
  requirements: string
  status: ToolStatus
  risk_flags: string[]
  rejection_reason: string
  class_name: string
  parameters: ToolParam[]
  required: string[]
  created_at: string
  updated_at: string
}

export interface UploadResult {
  tool: ToolRecord
  warnings: string[]
}

export interface ApproveResult {
  tool: ToolRecord
  install_log: string
}

export interface TestResult {
  success: boolean
  output: string | null
  error: string | null
  elapsed_seconds: number
}

export async function listTools(status?: ToolStatus): Promise<ToolRecord[]> {
  const qs = status ? `?status=${status}` : ''
  const res = await apiFetch<{ tools: ToolRecord[]; count: number }>(`/tools${qs}`)
  return res.tools
}

export async function uploadTool(file: File, requirements = ''): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('requirements', requirements)
  return apiFetch<UploadResult>('/tools/upload', { method: 'POST', body: form })
}

export async function getToolSource(toolId: string): Promise<string> {
  const res = await apiFetch<{ source_code: string }>(
    `/tools/${encodeURIComponent(toolId)}/source`,
  )
  return res.source_code
}

export async function approveTool(toolId: string): Promise<ApproveResult> {
  return apiFetch<ApproveResult>(
    `/tools/${encodeURIComponent(toolId)}/approve`,
    { method: 'POST' },
  )
}

export async function rejectTool(toolId: string, reason: string): Promise<ToolRecord> {
  return apiFetch<ToolRecord>(`/tools/${encodeURIComponent(toolId)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
}

export async function testTool(
  toolId: string,
  kwargs: Record<string, string>,
): Promise<TestResult> {
  return apiFetch<TestResult>(`/tools/${encodeURIComponent(toolId)}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kwargs }),
  })
}

export async function updateTool(toolId: string, file: File, requirements = ''): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('requirements', requirements)
  return apiFetch<UploadResult>(`/tools/${encodeURIComponent(toolId)}`, { method: 'PUT', body: form })
}

export async function deleteTool(toolId: string): Promise<void> {
  await apiFetch(`/tools/${encodeURIComponent(toolId)}`, { method: 'DELETE' })
}

export interface AiChatMessage { role: 'user' | 'assistant'; content: string }
export interface AiGenerateResult { code: string; requirements: string; message: string }

export async function generateToolWithAi(
  provider: 'openai' | 'anthropic',
  model_id: string,
  messages: AiChatMessage[],
  current_code: string,
): Promise<AiGenerateResult> {
  return apiFetch<AiGenerateResult>('/tools/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, model_id, messages, current_code }),
    timeoutMs: 90_000,
  })
}
