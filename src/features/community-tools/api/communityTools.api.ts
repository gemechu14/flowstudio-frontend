import { apiFetch } from '../../../shared/api/client'

export interface CommunityToolParam {
  name: string
  type: string
  description: string
}

export interface CommunityToolCard {
  tool_id: string
  name: string
  display_name: string
  description: string
  category: string
  requirements: string
  submitted_by_tenant_id: string | null
  submission_note: string
  status: string
  enabled_count: number
  is_enabled: boolean
  created_at: string
  parameters: CommunityToolParam[]
  required: string[]
}

export const CATEGORIES = ['messaging', 'productivity', 'data', 'ai', 'crm', 'utilities', 'other']

export function getCatalog(): Promise<CommunityToolCard[]> {
  return apiFetch<CommunityToolCard[]>('/community/catalog')
}

export function getSubmissions(): Promise<CommunityToolCard[]> {
  return apiFetch<CommunityToolCard[]>('/community/submissions')
}

export function submitTool(toolId: string, category: string, submissionNote: string): Promise<void> {
  return apiFetch(`/community/submit/${toolId}`, {
    method: 'POST',
    body: JSON.stringify({ category, submission_note: submissionNote }),
  })
}

export function approveSubmission(toolId: string, category: string): Promise<void> {
  return apiFetch(`/community/approve/${toolId}`, {
    method: 'POST',
    body: JSON.stringify({ category }),
  })
}

export function rejectSubmission(toolId: string, reason: string): Promise<void> {
  return apiFetch(`/community/reject/${toolId}`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function enableTool(toolId: string): Promise<void> {
  return apiFetch(`/community/enable/${toolId}`, { method: 'POST' })
}

export function disableTool(toolId: string): Promise<void> {
  return apiFetch(`/community/disable/${toolId}`, { method: 'POST' })
}

export function removeFromCatalog(toolId: string): Promise<void> {
  return apiFetch(`/community/catalog/${toolId}`, { method: 'DELETE' })
}
