import { apiFetch } from './client'

export interface ApiToolParam {
  name: string
  type: string
  description: string
}

export interface ApiTool {
  name: string
  description: string
  parameters: ApiToolParam[]
  required: string[]
}

export interface UploadResult {
  message: string
  tool_name: string
  warnings: string[]
}

export interface TestResult {
  success: boolean
  output: string | null
  error: string | null
  elapsed_seconds: number
}

export async function listTools(): Promise<ApiTool[]> {
  const res = await apiFetch<{ tools: ApiTool[]; count: number }>('/tools')
  return res.tools
}

export async function uploadTool(file: File): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  return apiFetch<UploadResult>('/tools/upload', { method: 'POST', body: form })
}

export async function testTool(name: string, kwargs: Record<string, string>): Promise<TestResult> {
  return apiFetch<TestResult>(`/tools/${encodeURIComponent(name)}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kwargs }),
  })
}

export async function deleteTool(name: string): Promise<void> {
  await apiFetch(`/tools/${encodeURIComponent(name)}`, { method: 'DELETE' })
}
