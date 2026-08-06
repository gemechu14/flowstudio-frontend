import type { CSSProperties } from 'react'
import type { AgentRecord } from '../api/agents.api'

export const BUILTIN_TOOLS: string[] = []

export const MONO = { fontFamily: 'var(--font-mono)' } as const
export const SANS = { fontFamily: 'var(--font-sans)' } as const

export type PanelState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; agent: AgentRecord }

export const MODEL_LABELS: Record<string, string> = {
  'claude-sonnet-5': 'Sonnet 5',
  'claude-sonnet-4-6': 'Sonnet 4.6',
  'claude-opus-4-8': 'Opus 4.8',
  'claude-haiku-4-5': 'Haiku 4.5',
  'claude-fable-5': 'Fable 5',
  'gpt-4.1': 'GPT-4.1',
  'gpt-4.1-mini': 'GPT-4.1 mini',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o mini',
}

export const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
}

export const FIELD: CSSProperties = {
  ...SANS,
  fontSize: 13,
  padding: '8px 12px',
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-heading)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  colorScheme: 'dark light',
}

export const SELECT: CSSProperties = {
  ...FIELD,
  fontSize: 13,
  paddingRight: 32,
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  cursor: 'pointer',
  minWidth: 148,
  backgroundColor: 'var(--card-bg)',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8L9.5 4.5' stroke='%2371717A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
}
