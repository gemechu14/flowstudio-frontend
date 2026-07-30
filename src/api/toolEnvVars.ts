import { apiFetch } from './client'

export interface EnvVarStatus {
  key_name: string
}

export function listEnvVars(toolId: string): Promise<EnvVarStatus[]> {
  return apiFetch<EnvVarStatus[]>(`/tools/${toolId}/env-vars`)
}

export function saveEnvVar(toolId: string, keyName: string, value: string): Promise<EnvVarStatus> {
  return apiFetch<EnvVarStatus>(`/tools/${toolId}/env-vars/${keyName}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })
}

export function deleteEnvVar(toolId: string, keyName: string): Promise<void> {
  return apiFetch(`/tools/${toolId}/env-vars/${keyName}`, { method: 'DELETE' })
}
