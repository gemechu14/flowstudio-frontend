export interface RunSummary {
  run_id: string
  workflow_id: string
  workflow_name: string
  status: string
  execution_mode: string
  total_input_tokens: number
  total_output_tokens: number
  started_at: string
  completed_at: string | null
}

export interface Stats {
  agent_count: number
  workflow_count: number
  tool_count: number
  datasource_count: number
  total_runs: number
  runs_today: number
  runs_this_week: number
  total_tokens_today: number
  total_tokens_week: number
  recent_runs: RunSummary[]
  runs_by_day: { date: string; count: number }[]
  runs_by_status: Record<string, number>
  runs_by_mode: Record<string, number>
  agents_by_provider: Record<string, number>
  workflows_by_mode: Record<string, number>
  tools_by_status: Record<string, number>
  top_workflow: string
}
