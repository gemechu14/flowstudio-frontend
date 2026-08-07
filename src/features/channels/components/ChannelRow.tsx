import { useState } from 'react'
import ConfirmModal from '../../../shared/components/ui/ConfirmModal'
import { TIMEZONES } from '../../../shared/constants'
import {
  type ChannelConfig,
  updateChannel, deleteChannel, webhookUrl,
  registerTelegramWebhook, registerDiscordCommands, registerWhatsappWebhook,
} from '../api/channels.api'
import {
  MONO, SANS, ANTHROPIC_MODELS, OPENAI_MODELS, CHANNEL_META, SETUP_STEPS,
} from '../lib/channelsUi'

export function ChannelRow({ config, onUpdated, onDeleted }: {
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
                background: 'var(--accent)',
                color: 'var(--btn-upload-text)', border: '1px solid var(--accent)', borderRadius: 8,
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
                  background: 'var(--accent)',
                  color: 'var(--btn-upload-text)', cursor: connecting ? 'wait' : 'pointer',
                  border: '1px solid var(--accent)',
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
                  background: 'var(--accent)',
                  color: 'var(--btn-upload-text)', cursor: connecting ? 'wait' : 'pointer',
                  border: '1px solid var(--accent)',
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
                  background: 'var(--accent)',
                  color: 'var(--btn-upload-text)', cursor: connecting ? 'wait' : 'pointer',
                  border: '1px solid var(--accent)',
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
