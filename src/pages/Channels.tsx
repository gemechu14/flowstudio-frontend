import React, { useState, useEffect, useCallback } from 'react'
import ConfirmModal from '../components/ui/ConfirmModal'
import {
  ChannelConfig, ChannelType,
  listChannels, createChannel, updateChannel, deleteChannel, webhookUrl,
} from '../api/channels'

const MONO = { fontFamily: 'var(--font-mono)' }
const SANS = { fontFamily: 'var(--font-sans)' }

const CHANNEL_META: Record<ChannelType, {
  label: string; color: string; placeholder: string; hint: string
  icon: (size?: number) => React.ReactNode
}> = {
  slack: {
    label: 'Slack', color: '#4A154B', placeholder: 'xoxb-…', hint: 'Bot User OAuth Token from your Slack app',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A"/>
        <path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
        <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0"/>
        <path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
        <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#2EB67D"/>
        <path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
        <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E"/>
        <path d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
      </svg>
    ),
  },
  telegram: {
    label: 'Telegram', color: '#229ED9', placeholder: '123456:ABC-…', hint: 'Bot token from @BotFather',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#229ED9"/>
        <path d="M9.417 15.181l-.397 5.584c.568 0 .814-.244 1.109-.537l2.663-2.545 5.518 4.041c1.012.564 1.725.267 1.998-.931L23.93 4.862c.321-1.496-.541-2.082-1.527-1.714L1.538 11.557c-1.45.564-1.426 1.37-.247 1.737l5.443 1.7 12.643-7.921c.595-.394 1.136-.176.691.218z" fill="white"/>
      </svg>
    ),
  },
  discord: {
    label: 'Discord', color: '#5865F2', placeholder: 'MTk…', hint: 'Bot token from the Discord Developer Portal',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#5865F2">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.025.012.049.031.063a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    ),
  },
  whatsapp: {
    label: 'WhatsApp', color: '#25D366', placeholder: 'EAAl…', hint: 'Permanent access token from Meta for Developers',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.373 0 0 5.373 0 12c0 2.127.556 4.123 1.528 5.855L0 24l6.337-1.508A11.948 11.948 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" fill="#25D366"/>
        <path d="M8.93 6.544c-.275 0-.724.1-1.104.504-.38.404-1.452 1.42-1.452 3.464s1.487 4.02 1.696 4.296c.208.275 2.897 4.62 7.138 6.295 3.533 1.393 4.243 1.117 5.007 1.046.763-.07 2.46-1.006 2.807-1.978.347-.97.347-1.804.243-1.978-.105-.174-.382-.278-.797-.486-.416-.208-2.46-1.214-2.842-1.352-.381-.14-.66-.208-.938.208-.277.416-1.074 1.352-1.316 1.63-.243.277-.486.312-.9.104-.416-.208-1.754-.647-3.342-2.064-1.236-1.102-2.07-2.463-2.313-2.879-.242-.416-.026-.64.183-.848.187-.186.416-.486.624-.73.208-.242.277-.416.416-.693.139-.278.07-.52-.035-.73-.104-.208-.934-2.254-1.28-3.084-.34-.811-.68-.7-.938-.712z" fill="white"/>
      </svg>
    ),
  },
}

const CHANNEL_TYPES: ChannelType[] = ['slack', 'telegram', 'discord', 'whatsapp']

const SETUP_STEPS: Record<ChannelType, { step: string; action: string }[]> = {
  slack: [
    { step: '1', action: 'Go to api.slack.com/apps → Create New App → From scratch' },
    { step: '2', action: 'OAuth & Permissions → add Bot Token Scopes: chat:write, channels:history, app_mentions:read, im:history' },
    { step: '3', action: 'Install to workspace → copy the Bot User OAuth Token (starts with xoxb-)' },
    { step: '4', action: 'Paste token below → Add Channel → copy the Webhook URL' },
    { step: '5', action: 'Socket Mode → turn OFF (otherwise HTTP webhooks are never called)' },
    { step: '6', action: 'Event Subscriptions → enable → paste Webhook URL → subscribe to app_mention, message.channels, message.im' },
  ],
  telegram: [
    { step: '1', action: 'Open Telegram → message @BotFather → /newbot → follow prompts' },
    { step: '2', action: 'Copy the token BotFather gives you (format: 123456:ABC-…)' },
    { step: '3', action: 'Paste token below → Add Channel → copy the Webhook URL' },
    { step: '4', action: 'Register the webhook: POST https://api.telegram.org/bot<TOKEN>/setWebhook with url=<Webhook URL>' },
  ],
  discord: [
    { step: '1', action: 'Go to discord.com/developers/applications → New Application → Bot → Add Bot' },
    { step: '2', action: 'Reset Token → copy it. Enable Message Content Intent under Privileged Gateway Intents' },
    { step: '3', action: 'Paste token below → Add Channel → copy the Webhook URL' },
    { step: '4', action: 'Set Interactions Endpoint URL in the app General Information to the Webhook URL' },
  ],
  whatsapp: [
    { step: '1', action: 'Go to developers.facebook.com → My Apps → Create App → Business → WhatsApp' },
    { step: '2', action: 'WhatsApp → API Setup → copy the temporary or permanent access token' },
    { step: '3', action: 'Paste token below → Add Channel → copy the Webhook URL' },
    { step: '4', action: 'WhatsApp → Configuration → Webhook → paste Webhook URL, set Verify Token, subscribe to messages' },
  ],
}

function ChannelRow({ config, onUpdated, onDeleted }: {
  config: ChannelConfig
  onUpdated: (c: ChannelConfig) => void
  onDeleted: () => void
}) {
  const meta = CHANNEL_META[config.channel_type]
  const [copied, setCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [showSetup, setShowSetup] = useState(false)

  const wUrl = webhookUrl(config.channel_type, config.webhook_secret)

  const copy = () => {
    navigator.clipboard.writeText(wUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const toggleEnabled = async () => {
    setToggling(true)
    try {
      const updated = await updateChannel(config.config_id, { enabled: !config.enabled })
      onUpdated(updated)
    } catch { /* ignore */ } finally { setToggling(false) }
  }

  const confirmDelete = async () => {
    setShowDeleteConfirm(false)
    try { await deleteChannel(config.config_id); onDeleted() } catch { /* ignore */ }
  }

  const steps = SETUP_STEPS[config.channel_type]

  return (
    <div style={{
      background: 'var(--bg-page)',
      border: '1px solid var(--border-light)',
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
        {/* Icon + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 130px' }}>
          <div style={{ opacity: config.enabled ? 1 : 0.35, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {meta.icon(20)}
          </div>
          <span style={{ ...MONO, fontSize: 13, fontWeight: 700, color: config.enabled ? meta.color : 'var(--text-body)' }}>
            {meta.label}
          </span>
        </div>

        {/* Webhook URL */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...MONO, fontSize: 9, color: '#9CA3AF', marginBottom: 3, letterSpacing: '0.08em' }}>WEBHOOK URL</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <code style={{
              ...MONO, fontSize: 10, flex: 1,
              background: 'var(--bg-light)', color: 'var(--text-body)',
              border: '1px solid var(--border-light)',
              padding: '4px 8px', borderRadius: 5,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{wUrl}</code>
            <button
              onClick={copy}
              style={{
                ...MONO, fontSize: 9, padding: '3px 10px', flexShrink: 0,
                background: copied ? '#10B98115' : 'transparent',
                border: `1px solid ${copied ? '#10B98150' : 'var(--border-light)'}`,
                color: copied ? '#10B981' : '#6B7280',
                borderRadius: 4, cursor: 'pointer',
              }}
            >{copied ? 'Copied!' : 'Copy'}</button>
          </div>
          <div style={{ ...SANS, fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
            Token: {config.bot_token}
          </div>
        </div>

        {/* Enable toggle */}
        <button
          onClick={toggleEnabled}
          disabled={toggling}
          title={config.enabled ? 'Click to disable' : 'Click to enable'}
          style={{
            ...MONO, fontSize: 10, fontWeight: 600, flexShrink: 0,
            padding: '3px 10px', borderRadius: 12,
            background: config.enabled ? '#10B98118' : '#F3F4F6',
            color: config.enabled ? '#10B981' : '#9CA3AF',
            border: `1px solid ${config.enabled ? '#10B98140' : '#E5E7EB'}`,
            cursor: 'pointer',
          }}
        >{config.enabled ? 'ENABLED' : 'DISABLED'}</button>

        {/* Setup guide toggle */}
        <button
          onClick={() => setShowSetup(v => !v)}
          style={{
            ...MONO, fontSize: 10, padding: '3px 10px', flexShrink: 0,
            background: showSetup ? '#1D5FFA15' : 'transparent',
            border: '1px solid var(--border-light)',
            color: showSetup ? '#1D5FFA' : '#6B7280',
            borderRadius: 5, cursor: 'pointer',
          }}
        >{showSetup ? '▲ Setup' : '▼ Setup'}</button>

        {/* Remove */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          style={{
            ...MONO, fontSize: 11, padding: '4px 10px', flexShrink: 0,
            background: '#EF444418', border: '1px solid #EF444440',
            color: '#EF4444', borderRadius: 5, cursor: 'pointer',
          }}
        >Remove</button>
      </div>

      {/* Setup steps */}
      {showSetup && (
        <div style={{
          borderTop: '1px solid var(--border-light)',
          padding: '14px 20px',
          background: 'var(--bg-light)',
        }}>
          <div style={{ ...MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: meta.color, marginBottom: 10 }}>
            {meta.label.toUpperCase()} SETUP GUIDE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {steps.map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                  ...MONO, fontSize: 10, fontWeight: 700, flexShrink: 0,
                  width: 20, height: 20, borderRadius: '50%',
                  background: `${meta.color}20`, color: meta.color,
                  border: `1px solid ${meta.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{s.step}</span>
                <span style={{ ...SANS, fontSize: 12, color: 'var(--text-body)', lineHeight: 1.5 }}>{s.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          message={`Remove ${meta.label} channel? The webhook URL will stop working immediately.`}
          confirmLabel="Remove"
          onConfirm={confirmDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}

function AddChannelForm({ onCreated, onCancel, existingTypes }: {
  onCreated: (c: ChannelConfig) => void
  onCancel: () => void
  existingTypes: Set<string>
}) {
  const available = CHANNEL_TYPES.filter(t => !existingTypes.has(t))
  const [channelType, setChannelType] = useState<ChannelType>(available[0] ?? 'slack')
  const [botToken, setBotToken] = useState('')
  const [conversational, setConversational] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const meta = CHANNEL_META[channelType]

  const inputStyle: React.CSSProperties = {
    ...MONO, fontSize: 12, padding: '7px 10px',
    background: 'var(--bg-light)', color: 'var(--text-dark)',
    border: '1px solid var(--border-light)', borderRadius: 6,
    boxSizing: 'border-box', outline: 'none',
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!botToken.trim()) { setError('Bot token is required'); return }
    setSaving(true); setError('')
    try {
      const config = await createChannel({ channel_type: channelType, bot_token: botToken.trim(), extra_config: { conversational } })
      onCreated(config)
    } catch (err: any) {
      setError(err.message || 'Failed to add channel')
    } finally { setSaving(false) }
  }

  if (available.length === 0) {
    return (
      <div style={{
        background: '#F0F5FF', border: '1px solid #C7D9FF',
        borderRadius: 8, padding: '14px 18px', marginBottom: 12,
        ...SANS, fontSize: 13, color: '#6B7280',
      }}>
        All supported channels are already configured.
        <button onClick={onCancel} style={{ marginLeft: 12, ...MONO, fontSize: 11, padding: '3px 10px', background: 'transparent', border: '1px solid var(--border-light)', color: '#6B7280', borderRadius: 5, cursor: 'pointer' }}>Close</button>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      style={{
        background: '#F0F5FF', border: '1px solid #C7D9FF',
        borderRadius: 8, padding: '16px 18px', marginBottom: 12,
      }}
    >
      <div style={{ ...MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: '#1D5FFA', marginBottom: 12 }}>
        ADD CHANNEL
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 160px' }}>
          <div style={{ ...MONO, fontSize: 10, color: '#6B7280', marginBottom: 4 }}>PLATFORM</div>
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

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ ...MONO, fontSize: 10, color: '#6B7280', marginBottom: 4 }}>BOT TOKEN</div>
          <input
            type="password"
            value={botToken}
            onChange={e => setBotToken(e.target.value)}
            placeholder={meta.placeholder}
            style={{ ...inputStyle, width: '100%' }}
            autoFocus
          />
          <div style={{ ...SANS, fontSize: 10, color: '#9CA3AF', marginTop: 3 }}>{meta.hint}</div>
        </div>
      </div>

      {/* Conversational mode toggle */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 12px', marginBottom: 12,
        background: conversational ? 'rgba(29,95,250,0.06)' : 'rgba(0,0,0,0.03)',
        border: `1px solid ${conversational ? 'rgba(29,95,250,0.2)' : 'var(--border-light)'}`,
        borderRadius: 6, cursor: 'pointer',
      }} onClick={() => setConversational(v => !v)}>
        <div style={{
          flexShrink: 0, marginTop: 1,
          width: 32, height: 18, borderRadius: 9,
          background: conversational ? '#1D5FFA' : '#D1D5DB',
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
          <div style={{ ...MONO, fontSize: 11, fontWeight: 600, color: conversational ? '#1D5FFA' : '#6B7280' }}>
            CONVERSATIONAL MODE
          </div>
          <div style={{ ...SANS, fontSize: 11, color: '#9CA3AF', marginTop: 2, lineHeight: 1.4 }}>
            {conversational
              ? 'The bot remembers context within each user\'s conversation. History is compressed automatically when it grows large.'
              : 'Each message is answered independently. No history is stored. Best for quick one-off queries.'}
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          ...MONO, fontSize: 11, color: '#EF4444', marginBottom: 10,
          padding: '7px 10px', background: '#EF444418',
          border: '1px solid #EF444440', borderRadius: 6,
        }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            ...MONO, fontSize: 12, padding: '7px 16px',
            background: saving ? '#1D5FFA88' : '#1D5FFA',
            color: '#fff', border: 'none', borderRadius: 6,
            cursor: saving ? 'wait' : 'pointer', fontWeight: 700,
          }}
        >{saving ? 'Adding…' : 'Add Channel'}</button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            ...MONO, fontSize: 12, padding: '7px 14px',
            background: 'transparent', border: '1px solid var(--border-light)',
            color: '#6B7280', borderRadius: 6, cursor: 'pointer',
          }}
        >Cancel</button>
      </div>
    </form>
  )
}

// ── Setup Guide ──────────────────────────────────────────────────────────────

type GuideStep = { title: string; body: React.ReactNode }

const GUIDES: Record<ChannelType, GuideStep[]> = {
  slack: [
    {
      title: 'Create a new Slack app',
      body: <>Open the <a href="https://api.slack.com/apps" target="_blank" rel="noopener" style={{ color: '#1D5FFA' }}>Slack App Portal</a> and click <strong>Create New App</strong>. Choose <strong>From scratch</strong>, give it a name like <code>FlowStudio Bot</code>, and pick your workspace.</>,
    },
    {
      title: 'Add Bot Token Scopes',
      body: <>In the left menu go to <strong>OAuth and Permissions</strong>. Under <strong>Bot Token Scopes</strong> add these seven: <code>chat:write</code>, <code>channels:history</code>, <code>channels:read</code>, <code>app_mentions:read</code>, <code>im:history</code>, <code>im:read</code>, and <code>im:write</code>. The <code>im:write</code> scope is what allows the bot to proactively DM users when a workflow finishes.</>,
    },
    {
      title: 'Install the app to your workspace',
      body: <>On the same <strong>OAuth and Permissions</strong> page click <strong>Install to Workspace</strong> and approve. Copy the <strong>Bot User OAuth Token</strong> that appears. It starts with <code>xoxb-</code>.</>,
    },
    {
      title: 'Add the channel in FlowStudio',
      body: <>Click <strong>Add Channel</strong> above, select <strong>Slack</strong>, paste the token, and save. A <strong>Webhook URL</strong> will appear on the channel row. Copy it.</>,
    },
    {
      title: 'Turn off Socket Mode',
      body: <>In the left menu click <strong>Socket Mode</strong> and toggle it <strong>off</strong>. Socket Mode routes events through a WebSocket connection instead of HTTP, which means your webhook URL is never called. It must be off for FlowStudio to receive messages.</>,
    },
    {
      title: 'Register the webhook in Slack',
      body: <>Go to <strong>Event Subscriptions</strong> and toggle it <strong>On</strong>. A <strong>Request URL</strong> field will appear. Paste your FlowStudio Webhook URL there and wait for the green checkmark. Under <strong>Subscribe to bot events</strong> add all three: <code>app_mention</code>, <code>message.channels</code>, and <code>message.im</code>. Save changes. Slack may prompt you to reinstall the app.</>,
    },
    {
      title: 'Enable direct messages to the bot',
      body: <>In the Slack App Portal go to <strong>App Home</strong> in the left menu. Scroll to <strong>Show Tabs</strong> and under the <strong>Messages Tab</strong> section check <strong>Allow users to send Slash commands and messages from the messages tab</strong>. Save. Without this, users will see "Sending messages to this app has been turned off" when they try to DM the bot.</>,
    },
    {
      title: 'Invite the bot and send a message',
      body: <>In any Slack channel type <code>/invite @YourBot</code>. Or open the bot under <strong>Apps</strong> in the sidebar and DM it directly. Try: <em>"list my workflows"</em>, <em>"run sales report"</em>, or <em>"schedule daily at 9am"</em>.</>,
    },
  ],
  telegram: [
    {
      title: 'Create a bot with BotFather',
      body: <>Open Telegram and message <a href="https://t.me/BotFather" target="_blank" rel="noopener" style={{ color: '#1D5FFA' }}>@BotFather</a>. Send <code>/newbot</code> and follow the prompts. The username must end in <code>bot</code>, for example <code>myflow_bot</code>.</>,
    },
    {
      title: 'Copy the bot token',
      body: <>BotFather will reply with a token like <code>1234567890:AAHdqTcvCH1vGW…</code>. Keep it private. To retrieve it later send <code>/mybots</code> to BotFather and choose <strong>API Token</strong>.</>,
    },
    {
      title: 'Add the channel in FlowStudio',
      body: <>Click <strong>Add Channel</strong> above, select <strong>Telegram</strong>, paste the token, and save. Copy the <strong>Webhook URL</strong> that appears.</>,
    },
    {
      title: 'Register the webhook with Telegram',
      body: (
        <>
          <span>Run this in a terminal, replacing the two placeholders:</span>
          <pre style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6,
            background: 'var(--bg-dark)', color: '#C9D1D9',
            border: '1px solid var(--border-light)', borderRadius: 6,
            padding: '10px 12px', marginTop: 8, overflowX: 'auto',
            whiteSpace: 'pre',
          }}>{`curl -X POST \\
  "https://api.telegram.org/botYOUR_TOKEN/setWebhook" \\
  -d "url=YOUR_WEBHOOK_URL"`}</pre>
          <span style={{ display: 'block', marginTop: 8 }}>You should see <code>{"{"}"ok":true{"}"}</code> in the response.</span>
        </>
      ),
    },
    {
      title: 'Send your bot a message',
      body: <>Search for your bot in Telegram by its username and start a chat. Try: <em>"list my workflows"</em>, <em>"run lead scorer"</em>, or <em>"schedule report every day at 8am"</em>.</>,
    },
  ],
  discord: [
    {
      title: 'Create a new application',
      body: <>Go to the <a href="https://discord.com/developers/applications" target="_blank" rel="noopener" style={{ color: '#1D5FFA' }}>Discord Developer Portal</a> and click <strong>New Application</strong>. Give it a name and accept the terms.</>,
    },
    {
      title: 'Create a bot and copy its token',
      body: <>In the left menu click <strong>Bot</strong>. Click <strong>Reset Token</strong> and copy the result. Scroll down to <strong>Privileged Gateway Intents</strong> and enable <strong>Message Content Intent</strong>. Click <strong>Save Changes</strong>. The token is shown only once, so save it now.</>,
    },
    {
      title: 'Add the channel in FlowStudio',
      body: <>Click <strong>Add Channel</strong> above, select <strong>Discord</strong>, paste the bot token, and save. Copy the <strong>Webhook URL</strong> that appears.</>,
    },
    {
      title: 'Set the Interactions Endpoint URL',
      body: <>Back in the Discord portal go to <strong>General Information</strong>. Paste your Webhook URL into <strong>Interactions Endpoint URL</strong>. Click <strong>Save Changes</strong>. Discord will verify the URL and FlowStudio confirms it automatically.</>,
    },
    {
      title: 'Invite the bot to your server',
      body: <>Go to <strong>OAuth2 &gt; URL Generator</strong>. Check the <code>bot</code> scope, then check <code>Read Messages</code> and <code>Send Messages</code> under Bot Permissions. Copy the generated URL and open it in your browser to add the bot to your server.</>,
    },
    {
      title: 'Send the bot a message',
      body: <>In any server channel the bot has access to, send: <em>"list my workflows"</em>, <em>"run sales report"</em>, or <em>"schedule report every Friday at 5pm"</em>.</>,
    },
  ],
  whatsapp: [
    {
      title: 'Create a Meta developer app',
      body: <>Go to <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener" style={{ color: '#1D5FFA' }}>developers.facebook.com/apps</a> and click <strong>Create App</strong>. Choose <strong>Business</strong> as the type. If you do not have a verified Meta Business account set one up first at <a href="https://business.facebook.com" target="_blank" rel="noopener" style={{ color: '#1D5FFA' }}>business.facebook.com</a>.</>,
    },
    {
      title: 'Add WhatsApp to your app',
      body: <>In the app dashboard find <strong>Add Products to Your App</strong> and click <strong>Set Up</strong> under <strong>WhatsApp</strong>. Link a WhatsApp Business Account. Meta provides a free test number to get started.</>,
    },
    {
      title: 'Get your access token',
      body: <>Go to <strong>WhatsApp &gt; API Setup</strong> and copy the <strong>Temporary access token</strong>. For production, generate a permanent system user token at <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener" style={{ color: '#1D5FFA' }}>Business Settings &gt; System Users</a> with <code>whatsapp_business_messaging</code> permission.</>,
    },
    {
      title: 'Add the channel in FlowStudio',
      body: <>Click <strong>Add Channel</strong> above, select <strong>WhatsApp</strong>, paste the access token, and save. Copy the <strong>Webhook URL</strong> that appears.</>,
    },
    {
      title: 'Register the webhook in Meta',
      body: <>In the Meta app go to <strong>WhatsApp &gt; Configuration</strong>. Under <strong>Webhook</strong> click <strong>Edit</strong>. Paste your Webhook URL into <strong>Callback URL</strong>. For <strong>Verify Token</strong> enter any secret word (for example <code>flowstudio</code>). Click <strong>Verify and Save</strong>, then subscribe to the <code>messages</code> field under Webhook fields.</>,
    },
    {
      title: 'Send a test message',
      body: <>Use the test form in <strong>WhatsApp &gt; API Setup</strong>, or message the number directly. Note: the Meta test number only accepts messages from phone numbers you add in that page. Try: <em>"list my workflows"</em> or <em>"run lead scorer"</em>.</>,
    },
  ],
}

function SetupGuideSection() {
  const [activeTab, setActiveTab] = useState<ChannelType>('slack')
  const steps = GUIDES[activeTab]
  const meta = CHANNEL_META[activeTab]

  const PLATFORM_LINKS: Record<ChannelType, { label: string; href: string }> = {
    slack:    { label: 'Slack App Portal',        href: 'https://api.slack.com/apps' },
    telegram: { label: 'Open BotFather',          href: 'https://t.me/BotFather' },
    discord:  { label: 'Discord Developer Portal', href: 'https://discord.com/developers/applications' },
    whatsapp: { label: 'Meta for Developers',     href: 'https://developers.facebook.com/apps/' },
  }

  return (
    <div style={{
      marginTop: 40,
      border: '1px solid var(--border-light)',
      borderRadius: 12,
      overflow: 'hidden',
      background: 'var(--bg-page)',
    }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border-light)',
        background: 'var(--bg-light)',
      }}>
        <div>
          <div style={{ ...MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#1D5FFA', marginBottom: 3 }}>
            SETUP GUIDES
          </div>
          <div style={{ ...SANS, fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>
            Step-by-step integration docs
          </div>
        </div>
        <a
          href={PLATFORM_LINKS[activeTab].href}
          target="_blank"
          rel="noopener"
          style={{
            ...MONO, fontSize: 10, fontWeight: 600,
            padding: '5px 12px', borderRadius: 6,
            color: meta.color, border: `1px solid ${meta.color}44`,
            background: `${meta.color}12`,
            display: 'flex', alignItems: 'center', gap: 5,
            textDecoration: 'none',
          }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <path d="M1 8L8 1M8 1H4M8 1v4"/>
          </svg>
          {PLATFORM_LINKS[activeTab].label}
        </a>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-light)' }}>
        {CHANNEL_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            style={{
              ...MONO, fontSize: 11, fontWeight: 600,
              padding: '10px 18px', background: 'none', border: 'none',
              borderBottom: activeTab === type ? `2px solid ${CHANNEL_META[type].color}` : '2px solid transparent',
              color: activeTab === type ? CHANNEL_META[type].color : '#6B7280',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: -1, whiteSpace: 'nowrap',
              transition: 'color 0.12s',
            }}
          >
            {CHANNEL_META[type].icon(15)}
            {CHANNEL_META[type].label}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div style={{ padding: '4px 0' }}>
        {steps.map((s, i) => (
          <div
            key={i}
            style={{
              display: 'flex', gap: 0, borderBottom: i < steps.length - 1 ? '1px solid var(--border-light)' : 'none',
              position: 'relative',
            }}
          >
            {/* Number column with connector line */}
            <div style={{
              width: 60, flexShrink: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', padding: '20px 0 0', position: 'relative',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: `${meta.color}18`, color: meta.color,
                border: `1px solid ${meta.color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...MONO, fontSize: 10, fontWeight: 700, zIndex: 1, position: 'relative',
              }}>{i + 1}</div>
              {i < steps.length - 1 && (
                <div style={{
                  position: 'absolute', top: 46, bottom: 0, left: '50%',
                  width: 1, background: 'var(--border-light)',
                  transform: 'translateX(-50%)',
                }} />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '18px 20px 20px 0' }}>
              <div style={{ ...MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
                Step {i + 1}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 7, ...SANS }}>
                {s.title}
              </div>
              <div style={{ ...SANS, fontSize: 12, color: 'var(--text-body)', lineHeight: 1.7 }}>
                {s.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Success footer */}
      <div style={{
        ...SANS, fontSize: 12, color: '#10B981',
        padding: '12px 20px',
        background: 'rgba(16,185,129,0.07)',
        borderTop: '1px solid rgba(16,185,129,0.18)',
        fontWeight: 500,
      }}>
        Once connected, users can trigger and monitor workflows by sending natural language messages to the bot.
      </div>
    </div>
  )
}

export default function Channels() {
  const [channels, setChannels] = useState<ChannelConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

  const reload = useCallback(() => {
    listChannels()
      .then(setChannels)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { reload() }, [reload])

  const existingTypes = new Set(channels.map(c => c.channel_type))

  return (
    <div style={{ padding: '36px 48px', width: '100%', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ ...MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: '#1D5FFA', marginBottom: 6 }}>
            CHANNELS
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>
            Bot Integrations
          </h2>
          <p style={{ ...SANS, fontSize: 13, color: 'var(--text-body)', marginTop: 6, marginBottom: 0, maxWidth: 540 }}>
            Connect FlowStudio to messaging platforms. Users can trigger and monitor workflows by chatting with your bot.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          style={{
            ...MONO, fontSize: 12, padding: '9px 18px',
            background: showAddForm ? '#1D5FFA33' : '#1D5FFA',
            color: '#fff', border: 'none', borderRadius: 7,
            cursor: 'pointer', fontWeight: 700, flexShrink: 0, marginTop: 2,
          }}
        >{showAddForm ? 'Cancel' : '+ Add Channel'}</button>
      </div>

      {showAddForm && (
        <AddChannelForm
          onCreated={c => { setChannels(prev => [...prev, c]); setShowAddForm(false) }}
          onCancel={() => setShowAddForm(false)}
          existingTypes={existingTypes}
        />
      )}

      {/* Channel list */}
      {loading ? (
        <div style={{ ...MONO, fontSize: 12, color: '#9CA3AF', padding: '40px 0', textAlign: 'center' }}>
          Loading…
        </div>
      ) : channels.length === 0 && !showAddForm ? (
        <div style={{
          textAlign: 'center', padding: '60px 0',
          background: 'var(--bg-page)', border: '1px solid var(--border-light)', borderRadius: 12,
        }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>💬</div>
          <div style={{ ...MONO, fontSize: 14, color: 'var(--text-dark)', fontWeight: 600, marginBottom: 6 }}>
            No channels connected
          </div>
          <div style={{ ...SANS, fontSize: 13, color: '#9CA3AF', maxWidth: 340, margin: '0 auto 20px' }}>
            Add Slack, Telegram, Discord, or WhatsApp so users can chat directly with your workflows.
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              ...MONO, fontSize: 12, padding: '9px 20px',
              background: '#1D5FFA', color: '#fff', border: 'none',
              borderRadius: 7, cursor: 'pointer', fontWeight: 700,
            }}
          >+ Add Your First Channel</button>
        </div>
      ) : (
        channels.map(c => (
          <ChannelRow
            key={c.config_id}
            config={c}
            onUpdated={updated => setChannels(prev => prev.map(x => x.config_id === updated.config_id ? updated : x))}
            onDeleted={() => setChannels(prev => prev.filter(x => x.config_id !== c.config_id))}
          />
        ))
      )}

      {/* Info box */}
      {!loading && channels.length > 0 && (
        <div style={{
          ...SANS, fontSize: 12, color: '#6B7280',
          padding: '12px 16px', background: 'var(--bg-light)',
          border: '1px solid var(--border-light)', borderRadius: 8,
          lineHeight: 1.6, marginTop: 4,
        }}>
          <strong style={{ color: 'var(--text-body)' }}>How it works:</strong>{' '}
          Users message your bot. The bot routes their intent to the right workflow automatically using AI.
          Supported commands: <em>run [workflow]</em>, <em>status</em>, <em>schedule [workflow] daily at 9am</em>, <em>list schedules</em>, and natural language questions about your data.
        </div>
      )}

      <SetupGuideSection />
    </div>
  )
}
