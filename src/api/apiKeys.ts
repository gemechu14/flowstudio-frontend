import { apiFetch } from './client'

export interface KeyStatus {
  provider: string
  configured: boolean
}

export function listApiKeys(): Promise<KeyStatus[]> {
  return apiFetch<KeyStatus[]>('/settings/api-keys')
}

export function saveApiKey(provider: string, value: string): Promise<KeyStatus> {
  return apiFetch<KeyStatus>(`/settings/api-keys/${provider}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })
}

export function deleteApiKey(provider: string): Promise<void> {
  return apiFetch(`/settings/api-keys/${provider}`, { method: 'DELETE' })
}
