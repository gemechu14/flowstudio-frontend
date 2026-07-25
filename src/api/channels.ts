import { apiFetch } from './client'

export type ChannelType = 'slack' | 'telegram' | 'discord' | 'whatsapp'

export interface ChannelConfig {
  config_id: string
  tenant_id: string | null
  channel_type: ChannelType
  bot_token: string
  webhook_secret: string
  enabled: boolean
  extra_config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export function listChannels(): Promise<ChannelConfig[]> {
  return apiFetch<ChannelConfig[]>('/channels')
}

export function createChannel(body: { channel_type: ChannelType; bot_token: string; extra_config?: Record<string, unknown> }): Promise<ChannelConfig> {
  return apiFetch<ChannelConfig>('/channels', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateChannel(configId: string, updates: { bot_token?: string; enabled?: boolean; extra_config?: Record<string, unknown> }): Promise<ChannelConfig> {
  return apiFetch<ChannelConfig>(`/channels/${configId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}

export function deleteChannel(configId: string): Promise<void> {
  return apiFetch(`/channels/${configId}`, { method: 'DELETE' })
}

export function webhookUrl(channelType: ChannelType, webhookSecret: string): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'
  return `${base}/channels/webhook/${channelType}/${webhookSecret}`
}
