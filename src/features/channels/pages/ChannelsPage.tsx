import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ConfirmModal from '../../../shared/components/ui/ConfirmModal'
import { TIMEZONES } from '../../../shared/constants'
import {
  ChannelConfig, ChannelType,
  listChannels, createChannel, updateChannel, deleteChannel, webhookUrl,
  registerTelegramWebhook, registerDiscordCommands, registerWhatsappWebhook,
} from '../../channels/api/channels.api'
import { queryKeys } from '../../../shared/api/queryKeys'

const MONO = { fontFamily: 'var(--font-mono)' }
const SANS = { fontFamily: 'var(--font-sans)' }

const ANTHROPIC_MODELS = [
  { id: 'claude-sonnet-5',  label: 'Claude Sonnet 5' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-opus-4-8',  label: 'Claude Opus 4.8' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  { id: 'claude-fable-5',   label: 'Claude Fable 5' },
]

const OPENAI_MODELS = [
  { id: 'gpt-4.1',      label: 'GPT-4.1' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { id: 'gpt-4o',       label: 'GPT-4o' },
  { id: 'gpt-4o-mini',  label: 'GPT-4o mini' },
]

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
    { step: '4', action: 'Click "Connect to Telegram" below to register the webhook automatically' },
  ],
  discord: [
    { step: '1', action: 'Go to discord.com/developers/applications → New Application → Bot → Add Bot' },
    { step: '2', action: 'Reset Token → copy it. Enable Message Content Intent under Privileged Gateway Intents' },
    { step: '3', action: 'General Information → copy the Public Key' },
    { step: '4', action: 'Paste bot token + public key below → Add Channel → copy the Webhook URL' },
    { step: '5', action: 'Set Interactions Endpoint URL in General Information to the Webhook URL' },
    { step: '6', action: 'Invite the bot to your server via OAuth2 → URL Generator (scope: bot)' },
    { step: '7', action: '@mention the bot in any channel, or DM it directly — no slash command needed' },
  ],
  whatsapp: [
    { step: '1', action: 'Go to developers.facebook.com → My Apps → Create App → WhatsApp use case' },
    { step: '2', action: 'WhatsApp → API Setup → copy the Temporary access token and the WhatsApp Business Account ID' },
    { step: '3', action: 'Paste token + WABA ID below → Add Channel → copy the Webhook URL' },
    { step: '4', action: 'Step 2. Production setup → Configure Webhooks → paste Webhook URL, Verify token: flowstudio → Verify and save' },
    { step: '5', action: 'Click "Connect to WhatsApp" below to subscribe to message events' },
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
  const [showEdit, setShowEdit] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [connectResult, setConnectResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [editConversational, setEditConversational] = useState<boolean>(
    Boolean(config.extra_config?.conversational)
  )
  const [editModelId, setEditModelId] = useState<string>(
    typeof config.extra_config?.model_id === 'string' ? config.extra_config.model_id : ''
  )
  const [editTimezone, setEditTimezone] = useState<string>(
    typeof config.extra_config?.timezone === 'string' ? config.extra_config.timezone : 'UTC'
  )
  const [editToken, setEditToken] = useState('')
  const [editWabaId, setEditWabaId] = useState<string>(
    typeof config.extra_config?.waba_id === 'string' ? config.extra_config.waba_id : ''
  )
  const [saving, setSaving] = useState(false)

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

  const connectTelegram = async () => {
    setConnecting(true)
    setConnectResult(null)
    try {
      await registerTelegramWebhook(config.config_id, wUrl)
      setConnectResult({ ok: true, message: 'Connected! Telegram will now send messages to your bot.' })
    } catch (err: any) {
      setConnectResult({ ok: false, message: err.message || 'Failed to register webhook.' })
    } finally {
      setConnecting(false)
    }
  }

  const connectWhatsapp = async () => {
    setConnecting(true)
    setConnectResult(null)
    try {
      await registerWhatsappWebhook(config.config_id)
      setConnectResult({ ok: true, message: 'Connected! WhatsApp will now forward messages to your bot.' })
    } catch (err: any) {
      setConnectResult({ ok: false, message: err.message || 'Failed to connect.' })
    } finally {
      setConnecting(false)
    }
  }

  const connectDiscord = async () => {
    setConnecting(true)
    setConnectResult(null)
    try {
      await registerDiscordCommands(config.config_id)
      setConnectResult({ ok: true, message: 'Done! Users can now type /chat in any channel to talk to the bot.' })
    } catch (err: any) {
      setConnectResult({ ok: false, message: err.message || 'Failed to register command.' })
    } finally {
      setConnecting(false)
    }
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const extraConfig: Record<string, unknown> = {
        ...config.extra_config,
        conversational: editConversational,
        model_id: editModelId,
        timezone: editTimezone.trim() || 'UTC',
      }
      if (config.channel_type === 'whatsapp' && editWabaId.trim()) {
        extraConfig.waba_id = editWabaId.trim()
      }
      const updates: Parameters<typeof updateChannel>[1] = { extra_config: extraConfig }
      if (editToken.trim()) updates.bot_token = editToken.trim()
      const updated = await updateChannel(config.config_id, updates)
      onUpdated(updated)
      setEditToken('')
      setShowEdit(false)
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  const steps = SETUP_STEPS[config.channel_type]

  return (
    <div
      className="ch-card"
      style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      {/* Header row */}
      <div
        className="ch-card-main"
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', flexWrap: 'wrap' }}
      >
        {/* Icon + name */}
        <div className="ch-card-brand" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 130px' }}>
          <div style={{ opacity: config.enabled ? 1 : 0.35, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {meta.icon(20)}
          </div>
          <span style={{ ...SANS, fontSize: 13, fontWeight: 600, color: config.enabled ? 'var(--text-heading)' : 'var(--text-secondary)' }}>
            {meta.label}
          </span>
        </div>

        {/* Webhook URL */}
        <div className="ch-card-webhook" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...SANS, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 3, letterSpacing: '0.06em', fontWeight: 600 }}>WEBHOOK URL</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <code style={{
              ...MONO, fontSize: 10, flex: 1, minWidth: 0,
              background: 'var(--bg-surface)', color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              padding: '4px 8px', borderRadius: 5,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{wUrl}</code>
            <button
              className="ch-copy-btn"
              onClick={copy}
              style={{
                ...SANS, fontSize: 11, padding: '4px 10px', flexShrink: 0,
                background: copied ? 'var(--verified-dim)' : 'transparent',
                border: `1px solid ${copied ? 'rgba(34,197,94,0.35)' : 'var(--border)'}`,
                color: copied ? 'var(--verified)' : 'var(--text-tertiary)',
                borderRadius: 4, cursor: 'pointer', fontWeight: 500,
              }}
            >{copied ? 'Copied!' : 'Copy'}</button>
          </div>
          <div className="ch-card-token" style={{ ...SANS, fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Token: <span style={MONO}>{config.bot_token}</span>
          </div>
        </div>

        <div className="ch-card-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Enable toggle */}
          <button
            onClick={toggleEnabled}
            disabled={toggling}
            title={config.enabled ? 'Click to disable' : 'Click to enable'}
            style={{
              ...SANS, fontSize: 11, fontWeight: 600, flexShrink: 0,
              padding: '4px 10px', borderRadius: 12,
              background: config.enabled ? 'var(--accent-soft)' : 'var(--bg-hover)',
              color: config.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
              border: `1px solid ${config.enabled ? 'var(--blue-border)' : 'var(--border)'}`,
              cursor: 'pointer',
            }}
          >{config.enabled ? 'ENABLED' : 'DISABLED'}</button>

          {/* Setup guide toggle */}
          <button
            onClick={() => { setShowSetup(v => !v); setShowEdit(false) }}
            style={{
              ...SANS, fontSize: 11, padding: '4px 10px', flexShrink: 0,
              background: showSetup ? 'var(--accent-soft)' : 'transparent',
              border: '1px solid var(--border)',
              color: showSetup ? 'var(--accent)' : 'var(--text-tertiary)',
              borderRadius: 5, cursor: 'pointer', fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Setup
          </button>

          {/* Edit */}
          <button
            onClick={() => { setShowEdit(v => !v); setShowSetup(false) }}
            style={{
              ...SANS, fontSize: 11, padding: '4px 10px', flexShrink: 0,
              background: showEdit ? '#F59E0B15' : 'transparent',
              border: `1px solid ${showEdit ? '#F59E0B50' : 'var(--border)'}`,
              color: showEdit ? '#F59E0B' : 'var(--text-tertiary)',
              borderRadius: 5, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
            </svg>
            Edit
          </button>

          {/* Remove */}
          <button
            className="ch-remove-btn"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              ...SANS, fontSize: 11, padding: '4px 10px', flexShrink: 0, fontWeight: 500,
              background: 'var(--invalid-dim)', border: '1px solid rgba(239,68,68,0.35)',
              color: 'var(--invalid)', borderRadius: 5, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>
            </svg>
            Remove
          </button>
        </div>
      </div>

      {/* Edit panel */}
      {showEdit && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '14px 20px',
          background: 'var(--bg-surface)',
        }}>
          <div style={{ ...SANS, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--untested)', marginBottom: 12, textTransform: 'uppercase' }}>
            Edit settings
          </div>

          {/* Bot token update */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 600 }}>New bot token <span style={{ fontWeight: 400 }}>(leave blank to keep current)</span></div>
            <input
              type="password"
              value={editToken}
              onChange={e => setEditToken(e.target.value)}
              placeholder={CHANNEL_META[config.channel_type].placeholder}
              style={{
                ...SANS, fontSize: 13, padding: '9px 12px', width: '100%', minHeight: 40,
                background: 'var(--bg-page)', color: 'var(--text-heading)',
                border: '1px solid var(--border)', borderRadius: 8,
                boxSizing: 'border-box', outline: 'none', colorScheme: 'dark light',
              }}
            />
          </div>

          {/* WhatsApp WABA ID */}
          {config.channel_type === 'whatsapp' && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 600 }}>WhatsApp Business Account ID (WABA ID)</div>
              <input
                value={editWabaId}
                onChange={e => setEditWabaId(e.target.value)}
                placeholder="e.g. 123456789012345 — from Meta dashboard"
                style={{
                  ...SANS, fontSize: 13, padding: '9px 12px', width: '100%', minHeight: 40,
                  background: 'var(--bg-page)', color: 'var(--text-heading)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  boxSizing: 'border-box', outline: 'none', colorScheme: 'dark light',
                }}
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
              value={editModelId}
              onChange={e => setEditModelId(e.target.value)}
              style={{
                ...SANS, fontSize: 14, padding: '9px 12px', width: '100%', minHeight: 40,
                background: 'var(--bg-page)', color: 'var(--text-heading)',
                border: '1px solid var(--border)', borderRadius: 6, outline: 'none',
              }}
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
              value={editTimezone}
              onChange={e => setEditTimezone(e.target.value)}
              style={{
                ...SANS, fontSize: 14, padding: '9px 12px', width: '100%', minHeight: 40,
                background: 'var(--bg-page)', color: 'var(--text-heading)',
                border: '1px solid var(--border)', borderRadius: 8, outline: 'none',
                colorScheme: 'dark light',
              }}
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
          <div
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', marginBottom: 12,
              background: editConversational ? 'var(--accent-soft)' : 'var(--bg-hover)',
              border: `1px solid ${editConversational ? 'var(--blue-border)' : 'var(--border)'}`,
              borderRadius: 6, cursor: 'pointer',
            }}
            onClick={() => setEditConversational(v => !v)}
          >
            <div style={{
              flexShrink: 0, marginTop: 1,
              width: 32, height: 18, borderRadius: 9,
              background: editConversational ? 'var(--accent)' : 'var(--text-tertiary)',
              position: 'relative', transition: 'background 0.15s',
            }}>
              <div style={{
                position: 'absolute', top: 2,
                left: editConversational ? 16 : 2,
                width: 14, height: 14, borderRadius: '50%',
                background: '#fff', transition: 'left 0.15s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
            <div>
              <div style={{ ...SANS, fontSize: 12, fontWeight: 600, color: editConversational ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                Conversational mode
              </div>
              <div style={{ ...SANS, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.4 }}>
                {editConversational
                  ? 'The bot remembers context within each user\'s conversation. History is compressed automatically when it grows large.'
                  : 'Each message is answered independently. No history is stored. Best for quick one-off queries.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={saveEdit}
              disabled={saving}
              style={{
                ...SANS, fontSize: 13, padding: '8px 16px',
                background: 'var(--accent-soft)',
                color: 'var(--accent-text)', border: '1px solid var(--blue-border)', borderRadius: 8,
                cursor: saving ? 'wait' : 'pointer', fontWeight: 600,
                opacity: saving ? 0.7 : 1,
              }}
            >{saving ? 'Saving…' : 'Save'}</button>
            <button
              onClick={() => setShowEdit(false)}
              style={{
                ...SANS, fontSize: 13, padding: '8px 14px',
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--text-tertiary)', borderRadius: 8, cursor: 'pointer',
              }}
            >Cancel</button>
          </div>
        </div>
      )}

      {/* Setup steps */}
      {showSetup && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '14px 20px',
          background: 'var(--bg-surface)',
        }}>
          <div style={{ ...SANS, fontSize: 12, fontWeight: 600, color: meta.color, marginBottom: 10 }}>
            {meta.label} setup guide
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {steps.map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                  ...SANS, fontSize: 11, fontWeight: 700, flexShrink: 0,
                  width: 20, height: 20, borderRadius: '50%',
                  background: `${meta.color}20`, color: meta.color,
                  border: `1px solid ${meta.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{s.step}</span>
                <span style={{ ...SANS, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.action}</span>
              </div>
            ))}
          </div>

          {config.channel_type === 'telegram' && (
            <div style={{ marginTop: 14 }}>
              <button
                onClick={connectTelegram}
                disabled={connecting}
                style={{
                  ...SANS, fontSize: 13, fontWeight: 600,
                  padding: '8px 16px', borderRadius: 8,
                  background: 'var(--accent-soft)',
                  color: 'var(--accent-text)', cursor: connecting ? 'wait' : 'pointer',
                  border: '1px solid var(--blue-border)',
                }}
              >{connecting ? 'Connecting…' : '🔗 Connect to Telegram'}</button>
              {connectResult && (
                <div style={{
                  ...SANS, fontSize: 11, marginTop: 8,
                  padding: '6px 10px', borderRadius: 6,
                  color: connectResult.ok ? '#059669' : '#DC2626',
                  background: connectResult.ok ? '#D1FAE5' : '#FEE2E2',
                  border: `1px solid ${connectResult.ok ? '#6EE7B7' : '#FCA5A5'}`,
                }}>{connectResult.message}</div>
              )}
            </div>
          )}

          {config.channel_type === 'whatsapp' && (
            <div style={{ marginTop: 14 }}>
              <button
                onClick={connectWhatsapp}
                disabled={connecting}
                style={{
                  ...SANS, fontSize: 13, fontWeight: 600,
                  padding: '7px 16px', borderRadius: 6,
                  background: 'var(--accent-soft)',
                  color: 'var(--accent-text)', cursor: connecting ? 'wait' : 'pointer',
                  border: '1px solid var(--blue-border)',
                }}
              >{connecting ? 'Connecting…' : '🔗 Connect to WhatsApp'}</button>
              {connectResult && (
                <div style={{
                  ...SANS, fontSize: 11, marginTop: 8,
                  padding: '6px 10px', borderRadius: 6,
                  color: connectResult.ok ? '#059669' : '#DC2626',
                  background: connectResult.ok ? '#D1FAE5' : '#FEE2E2',
                  border: `1px solid ${connectResult.ok ? '#6EE7B7' : '#FCA5A5'}`,
                }}>{connectResult.message}</div>
              )}
            </div>
          )}

          {config.channel_type === 'discord' && (
            <div style={{ marginTop: 14 }}>
              <button
                onClick={connectDiscord}
                disabled={connecting}
                style={{
                  ...SANS, fontSize: 13, fontWeight: 600,
                  padding: '7px 16px', borderRadius: 6,
                  background: 'var(--accent-soft)',
                  color: 'var(--accent-text)', cursor: connecting ? 'wait' : 'pointer',
                  border: '1px solid var(--blue-border)',
                }}
              >{connecting ? 'Registering…' : '🔗 Register /chat Command'}</button>
              {connectResult && (
                <div style={{
                  ...SANS, fontSize: 11, marginTop: 8,
                  padding: '6px 10px', borderRadius: 6,
                  color: connectResult.ok ? '#059669' : '#DC2626',
                  background: connectResult.ok ? '#D1FAE5' : '#FEE2E2',
                  border: `1px solid ${connectResult.ok ? '#6EE7B7' : '#FCA5A5'}`,
                }}>{connectResult.message}</div>
              )}
            </div>
          )}
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
            background: 'var(--accent-soft)',
            color: 'var(--accent-text)', border: '1px solid var(--blue-border)', borderRadius: 999,
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

// ── Setup Guide ──────────────────────────────────────────────────────────────

type GuideStep = { title: string; body: React.ReactNode }

const GUIDES: Record<ChannelType, GuideStep[]> = {
  slack: [
    {
      title: 'Create a new Slack app',
      body: <>Open the <a href="https://api.slack.com/apps" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>Slack App Portal</a> and click <strong>Create New App</strong>. Choose <strong>From scratch</strong>, give it a name like <code>FlowStudio Bot</code>, and pick your workspace.</>,
    },
    {
      title: 'Add Bot Token Scopes',
      body: <>In the left menu go to <strong>OAuth and Permissions</strong>. Under <strong>Bot Token Scopes</strong> add these eight: <code>chat:write</code>, <code>channels:history</code>, <code>channels:read</code>, <code>app_mentions:read</code>, <code>im:history</code>, <code>im:read</code>, <code>im:write</code>, and <code>reactions:write</code>. The <code>reactions:write</code> scope is what allows the bot to show a 🤔 indicator on your message while it is thinking.</>,
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
      body: <>Open Telegram and message <a href="https://t.me/BotFather" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>@BotFather</a>. Send <code>/newbot</code> and follow the prompts. The username must end in <code>bot</code>, for example <code>myflow_bot</code>.</>,
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
      title: 'Connect to Telegram',
      body: <>Open the channel's <strong>Setup Guide</strong> and click <strong>Connect to Telegram</strong>. FlowStudio will register the webhook with Telegram automatically — no terminal needed.</>,
    },
    {
      title: 'Send your bot a message',
      body: <>Search for your bot in Telegram by its username and start a chat. Try: <em>"list my workflows"</em>, <em>"run lead scorer"</em>, or <em>"schedule report every day at 8am"</em>.</>,
    },
  ],
  discord: [
    {
      title: 'Create a new application',
      body: <>Go to the <a href="https://discord.com/developers/applications" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>Discord Developer Portal</a> and click <strong>New Application</strong>. Give it a name and accept the terms.</>,
    },
    {
      title: 'Copy the Public Key and bot token',
      body: <>On the <strong>General Information</strong> page copy the <strong>Public Key</strong> — you will need it in the next step. Then go to <strong>Bot</strong> in the left menu, click <strong>Reset Token</strong> and copy the token. Scroll down to <strong>Privileged Gateway Intents</strong>, enable <strong>Message Content Intent</strong>, and click <strong>Save Changes</strong>. The token is shown only once, so save it now.</>,
    },
    {
      title: 'Add the channel in FlowStudio',
      body: <>Click <strong>Add Channel</strong> above, select <strong>Discord</strong>, paste the <strong>bot token</strong> and the <strong>Public Key</strong>, then save. Copy the <strong>Webhook URL</strong> that appears.</>,
    },
    {
      title: 'Set the Interactions Endpoint URL',
      body: <>Back in the Discord portal go to <strong>General Information</strong>. Paste your Webhook URL into <strong>Interactions Endpoint URL</strong> and click <strong>Save Changes</strong>. Discord will call your endpoint to verify it — FlowStudio confirms the signature automatically.</>,
    },
    {
      title: 'Invite the bot to your server',
      body: <>Go to <strong>OAuth2 &gt; URL Generator</strong>. Check the <code>bot</code> scope, then under Bot Permissions check <code>View Channels</code>, <code>Read Message History</code>, and <code>Send Messages</code>. Copy the generated URL and open it in your browser to add the bot to your server.</>,
    },
    {
      title: 'Register the /chat slash command',
      body: <>Open the channel row above, click <strong>Setup</strong>, and press <strong>Register /chat Command</strong>. This registers the global <code>/chat</code> slash command with Discord. It may take a few minutes to appear in all servers.</>,
    },
    {
      title: 'Chat with the bot',
      body: <>In any server channel the bot has access to, <strong>@mention</strong> it: <em>"@Flowstudio list my workflows"</em>, <em>"@Flowstudio run sales report"</em>. You can also <strong>DM the bot directly</strong> and type without a mention — it responds to all direct messages.</>,
    },
  ],
  whatsapp: [
    {
      title: 'Create a Meta developer app',
      body: <>Go to <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>developers.facebook.com/apps</a> and click <strong>Create App</strong>. Choose <strong>Business</strong> as the type. If you do not have a verified Meta Business account set one up first at <a href="https://business.facebook.com" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>business.facebook.com</a>.</>,
    },
    {
      title: 'Add WhatsApp to your app',
      body: <>In the app dashboard find <strong>Add Products to Your App</strong> and click <strong>Set Up</strong> under <strong>WhatsApp</strong>. Link a WhatsApp Business Account. Meta provides a free test number to get started.</>,
    },
    {
      title: 'Get your access token and WABA ID',
      body: <>Go to <strong>WhatsApp &gt; API Setup</strong>. Copy the <strong>Temporary access token</strong> and the <strong>WhatsApp Business Account ID</strong> (labeled "WhatsApp Business Account ID" just below the phone number). For production, generate a permanent system user token at <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>Business Settings &gt; System Users</a> with <code>whatsapp_business_messaging</code> permission.</>,
    },
    {
      title: 'Add the channel in FlowStudio',
      body: <>Click <strong>Add Channel</strong> above, select <strong>WhatsApp</strong>, paste the access token and the WhatsApp Business Account ID, then save. Copy the <strong>Webhook URL</strong> that appears.</>,
    },
    {
      title: 'Configure the webhook',
      body: <>Go to <strong>Step 2. Production setup &gt; Configure Webhooks</strong>. Paste your FlowStudio Webhook URL into <strong>Callback URL</strong>. For <strong>Verify Token</strong> enter <code>flowstudio</code>. Click <strong>Verify and save</strong>.</>,
    },
    {
      title: 'Connect to WhatsApp',
      body: <>Open the channel row above, click <strong>Setup</strong>, and press <strong>Connect to WhatsApp</strong>. This subscribes your app to the WhatsApp Business Account so incoming messages are forwarded to your bot. Do this every time you add a new WhatsApp channel or rotate the token.</>,
    },
    {
      title: 'Send a test message',
      body: <>In <strong>Step 1. Try it out</strong>, add your phone number as a recipient and click <strong>Send message</strong>. Once you receive it, reply — your bot will respond. Try: <em>"list my workflows"</em> or <em>"run lead scorer"</em>.</>,
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
    <div
      className="ch-guides"
      style={{
      marginTop: 40,
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      background: 'var(--bg-surface)',
    }}>
      {/* Section header */}
      <div
        className="ch-guides-header"
        style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)', gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ ...MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: 3 }}>
            SETUP GUIDES
          </div>
          <div style={{ ...SANS, fontSize: 14, fontWeight: 700, color: 'var(--text-heading)' }}>
            Step-by-step integration docs
          </div>
        </div>
        <a
          className="ch-guides-portal"
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
      <div className="ch-guides-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', overflowX: 'auto' }}>
        {CHANNEL_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            style={{
              ...MONO, fontSize: 11, fontWeight: 600,
              padding: '10px 18px', background: 'none', border: 'none',
              borderBottom: activeTab === type ? `2px solid ${CHANNEL_META[type].color}` : '2px solid transparent',
              color: activeTab === type ? CHANNEL_META[type].color : 'var(--text-tertiary)',
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
              display: 'flex', gap: 0, borderBottom: i < steps.length - 1 ? '1px solid var(--border)' : 'none',
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
                  width: 1, background: 'var(--border)',
                  transform: 'translateX(-50%)',
                }} />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '18px 20px 20px 0' }}>
              <div style={{ ...MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase' }}>
                Step {i + 1}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 7, ...SANS }}>
                {s.title}
              </div>
              <div style={{ ...SANS, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {s.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Success footer */}
      <div style={{
        ...SANS, fontSize: 12, color: 'var(--verified)',
        padding: '12px 20px',
        background: 'var(--verified-dim)',
        borderTop: '1px solid rgba(34,197,94,0.22)',
        fontWeight: 500,
      }}>
        Once connected, users can trigger and monitor workflows by sending natural language messages to the bot.
      </div>
    </div>
  )
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function Bone({
  h, w, r = 6, delay = 0, style,
}: {
  h: number | string
  w: number | string
  r?: number
  delay?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      className="skeleton-bone"
      style={{
        height: h,
        width: w,
        borderRadius: r,
        ['--skel-delay' as string]: `${delay}s`,
        ...style,
      }}
    />
  )
}

function ChannelsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading channels">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--skeleton-card)',
            border: '1px solid var(--skeleton-border)',
            borderRadius: 10,
            marginBottom: 12,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 130px' }}>
            <Bone h={20} w={20} r={6} delay={i * 0.06} />
            <Bone h={13} w={64} delay={i * 0.06 + 0.04} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Bone h={9} w={72} delay={i * 0.06 + 0.06} style={{ marginBottom: 8 }} />
            <Bone h={28} w="100%" r={5} delay={i * 0.06 + 0.1} style={{ maxWidth: 420 }} />
            <Bone h={9} w={140} delay={i * 0.06 + 0.14} style={{ marginTop: 8 }} />
          </div>
          <Bone h={24} w={72} r={12} delay={i * 0.06 + 0.12} />
          <Bone h={24} w={64} r={5} delay={i * 0.06 + 0.14} />
          <Bone h={24} w={48} r={5} delay={i * 0.06 + 0.16} />
          <Bone h={24} w={56} r={5} delay={i * 0.06 + 0.18} />
        </div>
      ))}
    </div>
  )
}

export default function ChannelsPage() {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)

  const { data: channels = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.channels,
    queryFn: () => listChannels().catch(() => [] as ChannelConfig[]),
  })

  const existingTypes = new Set(channels.map(c => c.channel_type))

  return (
    <div
      className="ch-page"
      style={{
      padding: '28px 36px', width: '100%', boxSizing: 'border-box',
      background: 'var(--bg-surface)', minHeight: '100%', ...SANS,
    }}>

      {/* Header */}
      <div
        className="ch-header"
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}
      >
        <div className="ch-header-copy">
          <div style={{ ...SANS, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 6 }}>
            CHANNELS
          </div>
          <h2 style={{ ...SANS, fontSize: 16, fontWeight: 500, color: 'var(--text-heading)', margin: 0 }}>
            Bot Integrations
          </h2>
          <p style={{ ...SANS, fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, marginBottom: 0, maxWidth: 540 }}>
            Connect FlowStudio to messaging platforms. Users can trigger and monitor workflows by chatting with your bot.
          </p>
        </div>
        <button
          className="ch-add-btn"
          onClick={() => setShowAddForm(v => !v)}
          style={{
            ...SANS, fontSize: 13, padding: '8px 16px',
            background: 'var(--accent-soft)',
            color: 'var(--accent-text)',
            border: '1px solid var(--blue-border)',
            borderRadius: 999,
            cursor: 'pointer', fontWeight: 600, flexShrink: 0, marginTop: 2,
          }}
        >{showAddForm ? 'Cancel' : '+ Add Channel'}</button>
      </div>

      {showAddForm && (
        <AddChannelForm
          onCreated={c => {
            queryClient.setQueryData<ChannelConfig[]>(queryKeys.channels, (prev = []) => [...prev, c])
            setShowAddForm(false)
          }}
          onCancel={() => setShowAddForm(false)}
          existingTypes={existingTypes}
        />
      )}

      {/* Channel list */}
      {loading ? (
        <ChannelsListSkeleton />
      ) : channels.length === 0 && !showAddForm ? (
        <div style={{
          textAlign: 'center', padding: '60px 0',
          background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12,
        }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>💬</div>
          <div style={{ ...SANS, fontSize: 14, color: 'var(--text-heading)', fontWeight: 600, marginBottom: 6 }}>
            No channels connected
          </div>
          <div style={{ ...SANS, fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 340, margin: '0 auto 20px' }}>
            Add Slack, Telegram, Discord, or WhatsApp so users can chat directly with your workflows.
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              ...SANS, fontSize: 13, padding: '8px 16px',
              background: 'var(--accent-soft)', color: 'var(--accent-text)', border: '1px solid var(--blue-border)',
              borderRadius: 999, cursor: 'pointer', fontWeight: 600,
            }}
          >+ Add Your First Channel</button>
        </div>
      ) : (
        channels.map(c => (
          <ChannelRow
            key={c.config_id}
            config={c}
            onUpdated={updated => queryClient.setQueryData<ChannelConfig[]>(queryKeys.channels, (prev = []) =>
              prev.map(x => x.config_id === updated.config_id ? updated : x)
            )}
            onDeleted={() => queryClient.setQueryData<ChannelConfig[]>(queryKeys.channels, (prev = []) =>
              prev.filter(x => x.config_id !== c.config_id)
            )}
          />
        ))
      )}

      {/* Info box */}
      {!loading && channels.length > 0 && (
        <div
          className="ch-howto"
          style={{
          ...SANS, fontSize: 12, color: 'var(--text-tertiary)',
          padding: '12px 16px', background: 'var(--bg-surface)',
          border: '1px solid var(--border)', borderRadius: 8,
          lineHeight: 1.6, marginTop: 4,
        }}>
          <strong style={{ color: 'var(--text-secondary)' }}>How it works:</strong>{' '}
          Users message your bot. The bot routes their intent to the right workflow automatically using AI.
          Supported commands: <em>run [workflow]</em>, <em>status</em>, <em>schedule [workflow] daily at 9am</em>, <em>list schedules</em>, and natural language questions about your data.
        </div>
      )}

      <SetupGuideSection />
    </div>
  )
}
