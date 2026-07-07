import { apiFetch } from './client'

export interface WorkflowStep {
  step_id: string
  agent_id: string
  label: string
  step_order: number
}

export interface WorkflowRecord {
  workflow_id: string
  name: string
  description: string
  steps: WorkflowStep[]
  created_at: string
  updated_at: string
}

export interface StepResult {
  step_order: number
  agent_name: string
  model_id: string
  input_text: string
  output_text: string
  input_tokens: number
  output_tokens: number
}

export interface RunResult {
  run_id: string
  workflow_name: string
  steps: StepResult[]
  final_output: string
  total_input_tokens: number
  total_output_tokens: number
}

export interface WorkflowBody {
  name: string
  description?: string
  steps?: Array<{ step_id?: string; agent_id: string; label?: string; step_order?: number }>
}

export async function listWorkflows(): Promise<WorkflowRecord[]> {
  const res = await apiFetch<{ workflows: WorkflowRecord[]; count: number }>('/workflows')
  return res.workflows
}

export async function createWorkflow(body: WorkflowBody): Promise<WorkflowRecord> {
  return apiFetch<WorkflowRecord>('/workflows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function updateWorkflow(id: string, body: WorkflowBody): Promise<WorkflowRecord> {
  return apiFetch<WorkflowRecord>(`/workflows/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function deleteWorkflow(id: string): Promise<void> {
  await apiFetch(`/workflows/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function runWorkflow(id: string, initial_input: string, api_key: string): Promise<RunResult> {
  return apiFetch<RunResult>(`/workflows/${encodeURIComponent(id)}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initial_input, api_key }),
  })
}
