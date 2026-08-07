import { useState } from 'react'
import { TIMEZONES } from '../../../shared/constants'
import {
  type ChannelConfig, type ChannelType,
  createChannel,
} from '../api/channels.api'
import {
  SANS, CHANNEL_META, CHANNEL_TYPES, ANTHROPIC_MODELS, OPENAI_MODELS,
} from '../lib/channelsUi'

export function AddChannelForm({ onCreated, onCancel, existingTypes }: {
  onCreated: (c: ChannelConfig) => void
  onCancel: () => void
  existingTypes: Set<string>
}) {
  const available = CHANNEL_TYPES.filter(t => !existingTypes.has(t))
  const [channelType, setChannelType] = useState<ChannelType>(available[0] ?? 'slack')
  const [botToken, setBotToken] = useState('')
  const [discordPublicKey, setDiscordPublicKey] = useState('')
  const [whatsappWabaId, setWhatsappWabaId] = useState('')
  const [conversational, setConversational] = useState(false)
  const [modelId, setModelId] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const meta = CHANNEL_META[channelType]

  const inputStyle: React.CSSProperties = {
    ...SANS, fontSize: 13, padding: '10px 12px',
    minHeight: 40,
    backgroundColor: 'var(--bg-page)', color: 'var(--text-heading)',
    border: '1px solid var(--border)', borderRadius: 8,
    boxSizing: 'border-box', outline: 'none',
    colorScheme: 'dark light',
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!botToken.trim()) { setError('Bot token is required'); return }
    if (channelType === 'discord' && !discordPublicKey.trim()) { setError('Public Key is required for Discord'); return }
    if (channelType === 'whatsapp' && !whatsappWabaId.trim()) { setError('WhatsApp Business Account ID is required'); return }
    setSaving(true); setError('')
    try {
      const extra: Record<string, unknown> = { conversational, model_id: modelId, timezone: timezone.trim() || 'UTC' }
      if (channelType === 'discord') extra.public_key = discordPublicKey.trim()
      if (channelType === 'whatsapp') extra.waba_id = whatsappWabaId.trim()
      const config = await createChannel({ channel_type: channelType, bot_token: botToken.trim(), extra_config: extra })
      onCreated(config)
    } catch (err: any) {
      setError(err.message || 'Failed to add channel')
    } finally { setSaving(false) }
  }

  if (available.length === 0) {
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '14px 18px', marginBottom: 12,
        ...SANS, fontSize: 13, color: 'var(--text-secondary)',
      }}>
        All supported channels are already configured.
        <button onClick={onCancel} style={{ marginLeft: 12, ...SANS, fontSize: 12, padding: '5px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 8, cursor: 'pointer' }}>Close</button>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderLeft: '3px solid var(--accent)',
        borderRadius: 10, padding: '16px 18px', marginBottom: 12,
      }}
    >
      <div style={{ ...SANS, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--accent)', marginBottom: 12, textTransform: 'uppercase' }}>
        Add channel
      </div>

      <div className="ch-add-platform-row" style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div className="ch-add-platform-field" style={{ flex: '0 0 160px' }}>
          <div style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 600 }}>Platform</div>
          <select
            value={channelType}
            onChange={e => { setChannelType(e.target.value as ChannelType); setBotToken(''); setError('') }}
            style={{ ...inputStyle, width: '100%' }}
          >
            {available.map(t => (
              <option key={t} value={t}>{CHANNEL_META[t].label}</option>
            ))}
          </select>
        </div>

        <div className="ch-add-token-field" style={{ flex: 1, minWidth: 200 }}>
          <div style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 600 }}>Bot token</div>
          <input
            type="password"
            value={botToken}
            onChange={e => setBotToken(e.target.value)}
            placeholder={meta.placeholder}
            style={{ ...inputStyle, width: '100%' }}
            autoFocus
          />
          <div style={{ ...SANS, fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>{meta.hint}</div>
        </div>
      </div>

      {channelType === 'discord' && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 600 }}>Public key</div>
          <input
            value={discordPublicKey}
            onChange={e => setDiscordPublicKey(e.target.value)}
            placeholder="From Discord Developer Portal → General Information"
            style={{ ...inputStyle, width: '100%' }}
          />
          <div style={{ ...SANS, fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>Required for Discord to verify requests to your webhook.</div>
        </div>
      )}

      {channelType === 'whatsapp' && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 600 }}>WhatsApp Business Account ID (WABA ID)</div>
          <input
            value={whatsappWabaId}
            onChange={e => setWhatsappWabaId(e.target.value)}
            placeholder="e.g. 123456789012345"
            style={{ ...inputStyle, width: '100%' }}
          />
          <div style={{ ...SANS, fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>
            Found in Meta for Developers → WhatsApp → API Setup → WhatsApp Business Account ID
          </div>
        </div>
      )}

      {/* Model selector */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 600 }}>AI model</div>
        <select
          value={modelId}
          onChange={e => setModelId(e.target.value)}
          style={{ ...inputStyle, width: '100%' }}
        >
          <option value=''>Auto (fastest available)</option>
          <optgroup label="Anthropic">
            {ANTHROPIC_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </optgroup>
          <optgroup label="OpenAI">
            {OPENAI_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </optgroup>
        </select>
      </div>

      {/* Timezone */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 600 }}>Schedule timezone</div>
        <select
          value={timezone}
          onChange={e => setTimezone(e.target.value)}
          style={{ ...inputStyle, width: '100%' }}
        >
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
        <div style={{ ...SANS, fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>
          Used when the bot creates schedules via chat.
        </div>
      </div>

      {/* Conversational mode toggle */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 12px', marginBottom: 12,
        background: conversational ? 'var(--accent-soft)' : 'var(--bg-hover)',
        border: `1px solid ${conversational ? 'var(--blue-border)' : 'var(--border)'}`,
        borderRadius: 6, cursor: 'pointer',
      }} onClick={() => setConversational(v => !v)}>
        <div style={{
          flexShrink: 0, marginTop: 1,
          width: 32, height: 18, borderRadius: 9,
          background: conversational ? 'var(--accent)' : 'var(--text-tertiary)',
          position: 'relative', transition: 'background 0.15s',
        }}>
          <div style={{
            position: 'absolute', top: 2,
            left: conversational ? 16 : 2,
            width: 14, height: 14, borderRadius: '50%',
            background: '#fff', transition: 'left 0.15s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </div>
        <div>
          <div style={{ ...SANS, fontSize: 12, fontWeight: 600, color: conversational ? 'var(--accent)' : 'var(--text-tertiary)' }}>
            Conversational mode
          </div>
          <div style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.4 }}>
            {conversational
              ? 'The bot remembers context within each user\'s conversation. History is compressed automatically when it grows large.'
              : 'Each message is answered independently. No history is stored. Best for quick one-off queries.'}
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          ...SANS, fontSize: 12, color: 'var(--invalid)', marginBottom: 10,
          padding: '7px 10px', background: '#EF444418',
          border: '1px solid #EF444440', borderRadius: 6,
        }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            ...SANS, fontSize: 13, padding: '8px 16px',
            background: 'var(--accent)',
            color: 'var(--btn-upload-text)', border: '1px solid var(--accent)', borderRadius: 999,
            cursor: saving ? 'wait' : 'pointer', fontWeight: 600,
            opacity: saving ? 0.7 : 1,
          }}
        >{saving ? 'Adding…' : 'Add Channel'}</button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            ...SANS, fontSize: 13, padding: '8px 14px',
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', borderRadius: 999, cursor: 'pointer',
          }}
        >Cancel</button>
      </div>
    </form>
  )
}
