import { apiFetch } from '../../../shared/api/client'

// ---------------------------------------------------------------------------
// Node & edge types
// ---------------------------------------------------------------------------

export type NodeType = 'agent' | 'orchestrator' | 'fan_out' | 'fan_in' | 'condition' | 'loop' | 'switch' | 'subworkflow' | 'collaborative_node'
export type ExecutionMode = 'sequential' | 'parallel' | 'hierarchical' | 'hybrid' | 'collaborative' | 'event_driven'

export interface WorkflowNode {
  node_id: string
  node_type: NodeType
  label: string
  agent_id: string | null
  position_x: number
  position_y: number
  // Free-form config; well-known keys: parallel_group (hybrid mode)
  config: Record<string, unknown>
}

export interface WorkflowEdge {
  edge_id: string
  from_node_id: string
  to_node_id: string
  label: string
  condition_expr: string
  from_side?: string
  to_side?: string
  from_offset?: number
  to_offset?: number
}

// Legacy step (still supported for backward compat)
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
  execution_mode: ExecutionMode
  loop_iterations: number
  enable_memory: boolean
  convergence_expr: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  steps: WorkflowStep[]
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Run / history types
// ---------------------------------------------------------------------------

export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
export type RunStatus = 'running' | 'completed' | 'failed' | 'awaiting_checkpoint'

export interface NodeRunResult {
  result_id: string
  node_id: string
  node_label: string
  node_type: string
  status: NodeStatus
  input_text: string
  output_text: string
  error_message: string
  started_at: string | null
  completed_at: string | null
  input_tokens: number
  output_tokens: number
  system_prompt_used?: string
}

export interface WorkflowRun {
  run_id: string
  workflow_id: string
  workflow_name: string
  status: RunStatus
  execution_mode: string
  initial_input: string
  final_output: string
  error_message: string
  started_at: string
  completed_at: string | null
  total_input_tokens: number
  total_output_tokens: number
  node_results: NodeRunResult[]
  // Populated by backend during collaborative runs
  blackboard?: Record<string, string>
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

export interface WorkflowBody {
  name: string
  description?: string
  execution_mode?: ExecutionMode
  nodes?: Partial<WorkflowNode>[]
  edges?: Partial<WorkflowEdge>[]
  steps?: Partial<WorkflowStep>[]
  loop_iterations?: number
  enable_memory?: boolean
  convergence_expr?: string
}

// ---------------------------------------------------------------------------
// Trigger types
// ---------------------------------------------------------------------------

export interface ScheduleTrigger {
  trigger_id: string
  workflow_id: string
  cron_expr: string
  timezone: string
  enabled: boolean
  last_run_at: string | null
}

export interface WebhookTrigger {
  webhook_id: string
  workflow_id: string
  secret?: string
  enabled: boolean
  last_triggered_at: string | null
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

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

export async function runWorkflow(
  id: string,
  initial_input: string,
  api_key: string,
): Promise<WorkflowRun> {
  return apiFetch<WorkflowRun>(`/workflows/${encodeURIComponent(id)}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initial_input, api_key }),
  })
}

export async function listRuns(workflow_id: string): Promise<WorkflowRun[]> {
  const res = await apiFetch<{ runs: WorkflowRun[]; count: number }>(
    `/workflows/${encodeURIComponent(workflow_id)}/runs`,
  )
  return res.runs
}

export async function getRun(workflow_id: string, run_id: string): Promise<WorkflowRun> {
  return apiFetch<WorkflowRun>(
    `/workflows/${encodeURIComponent(workflow_id)}/runs/${encodeURIComponent(run_id)}`,
  )
}

export async function deleteRun(workflow_id: string, run_id: string): Promise<void> {
  await apiFetch<void>(
    `/workflows/${encodeURIComponent(workflow_id)}/runs/${encodeURIComponent(run_id)}`,
    { method: 'DELETE' },
  )
}

export async function clearAllRuns(workflow_id: string): Promise<void> {
  await apiFetch<void>(
    `/workflows/${encodeURIComponent(workflow_id)}/runs`,
    { method: 'DELETE' },
  )
}

export interface CheckpointInfo {
  checkpoint_id: string
  node_id: string
  node_label: string
  checkpoint_prompt: string
  prior_output: string
  status: string
}

export async function getCheckpoint(workflow_id: string, run_id: string): Promise<CheckpointInfo> {
  return apiFetch<CheckpointInfo>(
    `/workflows/${encodeURIComponent(workflow_id)}/runs/${encodeURIComponent(run_id)}/checkpoint`,
  )
}

export async function resumeRun(
  workflow_id: string,
  run_id: string,
  human_input: string,
): Promise<WorkflowRun> {
  return apiFetch<WorkflowRun>(
    `/workflows/${encodeURIComponent(workflow_id)}/runs/${encodeURIComponent(run_id)}/resume`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ human_input }),
    },
  )
}

// ---------------------------------------------------------------------------
// Trigger API functions — schedules
// ---------------------------------------------------------------------------

export async function listSchedules(workflow_id: string): Promise<ScheduleTrigger[]> {
  const res = await apiFetch<{ schedules: ScheduleTrigger[] }>(
    `/triggers/schedules?workflow_id=${encodeURIComponent(workflow_id)}`,
  )
  return res.schedules
}

export async function createSchedule(
  workflow_id: string,
  cron_expr: string,
  timezone: string = 'UTC',
): Promise<ScheduleTrigger> {
  return apiFetch<ScheduleTrigger>('/triggers/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow_id, cron_expr, timezone }),
  })
}

export async function deleteSchedule(trigger_id: string): Promise<void> {
  await apiFetch(`/triggers/schedules/${encodeURIComponent(trigger_id)}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// Trigger API functions — webhooks
// ---------------------------------------------------------------------------

export async function listWebhooks(workflow_id: string): Promise<WebhookTrigger[]> {
  const res = await apiFetch<{ webhooks: WebhookTrigger[] }>(
    `/triggers/webhooks?workflow_id=${encodeURIComponent(workflow_id)}`,
  )
  return res.webhooks
}

export async function createWebhook(workflow_id: string): Promise<WebhookTrigger> {
  return apiFetch<WebhookTrigger>('/triggers/webhooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow_id }),
  })
}

export async function deleteWebhook(webhook_id: string): Promise<void> {
  await apiFetch(`/triggers/webhooks/${encodeURIComponent(webhook_id)}`, { method: 'DELETE' })
}

export async function rotateWebhookSecret(webhook_id: string): Promise<WebhookTrigger> {
  return apiFetch<WebhookTrigger>(
    `/triggers/webhooks/${encodeURIComponent(webhook_id)}/rotate-secret`,
    { method: 'POST' },
  )
}
