export const MONO = { fontFamily: 'var(--font-mono)' } as const
export const SANS = { fontFamily: 'var(--font-sans)' } as const

export const fmtDate = (iso: string | null) => {
  if (!iso) return 'Never'
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export type AuthType = 'none' | 'bearer' | 'apikey' | 'basic'

export function authToHeaders(type: AuthType, fields: Record<string, string>): Record<string, string> {
  if (type === 'bearer' && fields.token) {
    return { Authorization: `Bearer ${fields.token}` }
  }
  if (type === 'apikey' && fields.key && fields.value) {
    return { [fields.key]: fields.value }
  }
  if (type === 'basic' && fields.username) {
    const encoded = btoa(`${fields.username}:${fields.password ?? ''}`)
    return { Authorization: `Basic ${encoded}` }
  }
  return {}
}

export function headersToAuth(headers: Record<string, string>): { type: AuthType; fields: Record<string, string> } {
  const auth = headers['Authorization'] ?? headers['authorization'] ?? ''
  if (auth.startsWith('Bearer ')) return { type: 'bearer', fields: { token: auth.slice(7) } }
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6))
      const sep = decoded.indexOf(':')
      return { type: 'basic', fields: { username: decoded.slice(0, sep), password: decoded.slice(sep + 1) } }
    } catch { /* fall through */ }
  }
  // custom API key header
  const entries = Object.entries(headers)
  if (entries.length === 1) return { type: 'apikey', fields: { key: entries[0][0], value: entries[0][1] } }
  return { type: 'none', fields: {} }
}

export const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: 'none',   label: 'No Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'apikey', label: 'API Key' },
  { value: 'basic',  label: 'Basic Auth' },
]

export const PROVIDER_META: Record<string, { label: string; color: string; envVar: string }> = {
  openai:    { label: 'OpenAI API Key',    color: 'var(--accent)', envVar: 'OPENAI_API_KEY' },
  anthropic: { label: 'Anthropic API Key', color: 'var(--accent)', envVar: 'ANTHROPIC_API_KEY' },
}

export type CronFreq = 'hour' | 'day' | 'week' | 'month'

export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
export const MINUTES = ['00', '15', '30', '45']
export const MONTH_DAYS = Array.from({ length: 28 }, (_, i) => String(i + 1))

export function buildCron(freq: CronFreq, minute: string, hour: string, dow: string, dom: string): string {
  const m = minute || '0'
  const h = hour || '9'
  if (freq === 'hour')  return `${m} * * * *`
  if (freq === 'day')   return `${m} ${h} * * *`
  if (freq === 'week')  return `${m} ${h} * * ${dow}`
  if (freq === 'month') return `${m} ${h} ${dom} * *`
  return `${m} ${h} * * *`
}

export function humanLabel(freq: CronFreq, minute: string, hour: string, dow: string, dom: string): string {
  const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')} UTC`
  if (freq === 'hour')  return `Every hour at :${minute.padStart(2, '0')}`
  if (freq === 'day')   return `Every day at ${time}`
  if (freq === 'week')  return `Every ${DAYS_OF_WEEK[+dow]} at ${time}`
  if (freq === 'month') return `Day ${dom} of every month at ${time}`
  return ''
}
